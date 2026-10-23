create table if not exists public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked);
grant select, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.blocks enable row level security;
drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks for select to authenticated using (blocker = auth.uid());
drop policy if exists "remove own blocks" on public.blocks;
create policy "remove own blocks" on public.blocks for delete to authenticated using (blocker = auth.uid());

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('player', 'match', 'open_match')),
  target_id text,
  reason text not null check (reason in ('abuse', 'fake_result', 'cheating', 'spam', 'inappropriate', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
grant select on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports for select to authenticated
  using (reporter = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.block_player(_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _user is null or _user = me then raise exception 'You can''t block yourself'; end if;
  if not exists (select 1 from profiles where id = _user) then raise exception 'Player not found'; end if;
  insert into blocks (blocker, blocked) values (me, _user) on conflict do nothing;
  delete from follows where (follower_id = me and followee_id = _user) or (follower_id = _user and followee_id = me);
  delete from beacon_players bp using beacons b
    where bp.beacon_id = b.id and b.created_by = me and bp.user_id = _user and b.scheduled_at > now();
  update beacons b set status = 'open'
    where b.created_by = me and b.status = 'filled' and b.scheduled_at > now()
      and (select count(*) from beacon_players bp where bp.beacon_id = b.id and bp.user_id <> b.created_by) < b.players_needed;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.unblock_player(_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from blocks where blocker = auth.uid() and blocked = _user;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.report_content(_kind text, _target_user uuid, _target_id text, _reason text, _details text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _target_user = me then raise exception 'You can''t report yourself'; end if;
  if (select count(*) from reports where reporter = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of reports today. Try again tomorrow.';
  end if;
  if exists (select 1 from reports where reporter = me and status = 'open' and kind = _kind
             and coalesce(target_id, '') = coalesce(_target_id, '') and target_user is not distinct from _target_user) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  insert into reports (reporter, target_user, kind, target_id, reason, details)
    values (me, _target_user, _kind, left(_target_id, 80), _reason, nullif(btrim(left(coalesce(_details, ''), 500)), ''));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.join_beacon(_beacon_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b public.beacons;
  joined int;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'Create your profile first'; end if;
  select * into b from beacons where id = _beacon_id for update;
  if not found then raise exception 'Beacon not found'; end if;
  if b.status = 'cancelled' then raise exception 'This game was cancelled'; end if;
  if b.scheduled_at < now() - interval '30 minutes' then raise exception 'This game has already started'; end if;
  if exists (select 1 from beacon_players where beacon_id = b.id and user_id = me) then return b.status; end if;
  if b.status = 'filled' then raise exception 'This game is already full'; end if;
  if exists (select 1 from blocks where (blocker = b.created_by and blocked = me) or (blocker = me and blocked = b.created_by)) then
    raise exception 'You can''t join this game';
  end if;
  insert into beacon_players (beacon_id, user_id) values (b.id, me);
  select count(*) into joined from beacon_players where beacon_id = b.id and user_id <> b.created_by;
  if joined >= b.players_needed then
    update beacons set status = 'filled' where id = b.id;
    return 'filled';
  end if;
  return 'open';
end $$;

create or replace function public.admin_reports(_status text default 'open')
returns table(id bigint, kind text, target_id text, reason text, details text, status text, created_at timestamptz,
  reporter uuid, reporter_name text, target_user uuid, target_name text, target_username text, target_reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return query
  select r.id, r.kind, r.target_id, r.reason, r.details, r.status, r.created_at,
    r.reporter, rp.display_name, r.target_user, tp.display_name, tp.username,
    (select count(*) from reports x where x.target_user = r.target_user)
  from reports r
  left join profiles rp on rp.id = r.reporter
  left join profiles tp on tp.id = r.target_user
  where _status = 'all' or r.status = _status
  order by r.created_at desc
  limit 200;
end $$;

create or replace function public.admin_resolve_report(_id bigint, _status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if _status not in ('open', 'actioned', 'dismissed') then raise exception 'Unknown status'; end if;
  update reports set status = _status,
    resolved_at = case when _status = 'open' then null else now() end,
    resolved_by = case when _status = 'open' then null else auth.uid() end
  where id = _id;
  if not found then raise exception 'Report not found'; end if;
  perform admin_note('resolve_report', _id::text, jsonb_build_object('status', _status));
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.block_player(uuid) from public, anon;
revoke execute on function public.unblock_player(uuid) from public, anon;
revoke execute on function public.report_content(text, uuid, text, text, text) from public, anon;
revoke execute on function public.admin_reports(text) from public, anon;
revoke execute on function public.admin_resolve_report(bigint, text) from public, anon;
grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
grant execute on function public.report_content(text, uuid, text, text, text) to authenticated;
grant execute on function public.admin_reports(text) to authenticated;
grant execute on function public.admin_resolve_report(bigint, text) to authenticated;

insert into public.app_settings (key, value) values
  ('xp_event', jsonb_build_object('enabled', false, 'multiplier', 2, 'ends_at', null, 'label', 'Double XP'))
on conflict (key) do nothing;

create or replace function public.admin_update_setting(_key text, _value jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if jsonb_typeof(_value) <> 'object' then raise exception 'Settings must be an object'; end if;
  if _key = 'pricing' then
    if coalesce((_value->>'monthly')::numeric, -1) < 0 or coalesce((_value->>'yearly')::numeric, -1) < 0
      or coalesce((_value->>'promo_monthly')::numeric, -1) < 0 or coalesce((_value->>'promo_yearly')::numeric, -1) < 0 then
      raise exception 'Prices must be zero or more';
    end if;
    if coalesce((_value->>'promo_days')::int, -1) not between 1 and 365 then raise exception 'Offer window must be 1 to 365 days'; end if;
  end if;
  if _key = 'xp_event' and coalesce((_value->>'multiplier')::numeric, 0) not between 1 and 3 then
    raise exception 'XP multiplier must be between 1 and 3';
  end if;
  update app_settings set value = _value, updated_at = now(), updated_by = auth.uid() where key = _key;
  if not found then raise exception 'Unknown setting %', _key; end if;
  perform admin_note('update_setting', _key, _value);
  return _value;
end $$;

CREATE OR REPLACE FUNCTION public.record_match(_players jsonb, _sets jsonb, _venue text, _match_type text, _notes text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  p jsonb; s jsonb;
  t1 int := 0; t2 int := 0; winner smallint;
  avg1 numeric; avg2 numeric; exp1 numeric;
  k int := 32;
  mid uuid;
  uid uuid; tm smallint; won boolean; delta int; xpg int; newstreak int;
  csd text;
  prof public.profiles;
  result jsonb := '{}'::jsonb;
  my_unlocks text[] := '{}';
  opp uuid; cnt int;
  my_team smallint;
  xp_mult numeric := 1;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if jsonb_array_length(_players) <> 4 then raise exception 'Need 4 players'; end if;
  if jsonb_array_length(_sets) < 1 or jsonb_array_length(_sets) > 5 then raise exception 'Invalid sets'; end if;
  select (x->>'team')::smallint into my_team from jsonb_array_elements(_players) x where (x->>'user_id')::uuid = me;
  if my_team is null then raise exception 'You must be in the match'; end if;
  if (select count(*) from jsonb_array_elements(_players) x where x->>'team'='1') <> 2 then raise exception 'Teams must be 2v2'; end if;
  if (select count(distinct x->>'user_id') from jsonb_array_elements(_players) x where x->>'user_id' is not null)
     <> (select count(*) from jsonb_array_elements(_players) x where x->>'user_id' is not null) then raise exception 'Duplicate player'; end if;

  for s in select * from jsonb_array_elements(_sets) loop
    if (s->>0)::int > (s->>1)::int then t1 := t1+1; elsif (s->>1)::int > (s->>0)::int then t2 := t2+1; end if;
  end loop;
  if t1 = t2 then raise exception 'Match must have a winner'; end if;
  winner := case when t1 > t2 then 1 else 2 end;

  select avg(coalesce(pr.rating,1000)) into avg1 from jsonb_array_elements(_players) x left join profiles pr on pr.id = (x->>'user_id')::uuid where x->>'team'='1';
  select avg(coalesce(pr.rating,1000)) into avg2 from jsonb_array_elements(_players) x left join profiles pr on pr.id = (x->>'user_id')::uuid where x->>'team'='2';
  exp1 := 1 / (1 + power(10, (avg2 - avg1)/400));

  select least(greatest(coalesce((value->>'multiplier')::numeric, 1), 1), 3) into xp_mult
    from app_settings
    where key = 'xp_event' and coalesce((value->>'enabled')::boolean, false)
      and (value->>'ends_at' is null or value->>'ends_at' = '' or (value->>'ends_at')::timestamptz > now());
  xp_mult := coalesce(xp_mult, 1);

  insert into matches(created_by, venue, match_type, sets, winner_team, notes)
    values (me, left(_venue,120), coalesce(left(_match_type,40),'friendly'), _sets, winner, nullif(btrim(left(coalesce(_notes,''),140)),''))
    returning id into mid;

  for p in select * from jsonb_array_elements(_players) loop
    tm := (p->>'team')::smallint;
    uid := (p->>'user_id')::uuid;
    csd := case when p->>'court_side' in ('left','right') then p->>'court_side' else null end;
    if uid is null then
      insert into match_players(match_id, team, guest_name, court_side) values (mid, tm, left(coalesce(p->>'guest_name','Guest'),40), csd);
      continue;
    end if;
    select * into prof from profiles where id = uid for update;
    if not found then raise exception 'Unknown player'; end if;
    won := tm = winner;
    delta := round(k * ((case when won then 1 else 0 end) - (case when tm=1 then exp1 else 1-exp1 end)));
    newstreak := case when won then greatest(prof.current_streak,0)+1 else 0 end;
    xpg := round((50 + (case when won then 50 else 0 end) + (case when newstreak >= 3 then 10*least(newstreak,10) else 0 end)) * xp_mult);
    update profiles set rating = rating + delta, xp = xp + xpg,
      wins = wins + (case when won then 1 else 0 end), losses = losses + (case when won then 0 else 1 end),
      current_streak = newstreak, best_streak = greatest(best_streak, newstreak)
      where id = uid;
    insert into match_players(match_id, team, user_id, rating_before, rating_delta, xp_gained, streak_before, xp_before, court_side)
      values (mid, tm, uid, prof.rating, delta, xpg, prof.current_streak, prof.xp, csd);

    if won then
      insert into achievements(user_id, code) values (uid,'first_win') on conflict do nothing;
      if found and uid = me then my_unlocks := array_append(my_unlocks, 'first_win'); end if;
      if newstreak >= 3 then
        insert into achievements(user_id, code) values (uid,'streak_3') on conflict do nothing;
        if found and uid = me then my_unlocks := array_append(my_unlocks, 'streak_3'); end if;
      end if;
      if newstreak >= 5 then
        insert into achievements(user_id, code) values (uid,'streak_5') on conflict do nothing;
        if found and uid = me then my_unlocks := array_append(my_unlocks, 'streak_5'); end if;
      end if;
      if (case when tm=1 then avg2-avg1 else avg1-avg2 end) >= 100 then
        insert into achievements(user_id, code) values (uid,'giant_killer') on conflict do nothing;
        if found and uid = me then my_unlocks := array_append(my_unlocks, 'giant_killer'); end if;
      end if;
    end if;
    if uid = me then
      result := jsonb_build_object('won', won, 'rating_before', prof.rating, 'rating_delta', delta, 'xp_gained', xpg,
        'xp_before', prof.xp, 'streak', newstreak, 'best_streak', greatest(prof.best_streak,newstreak), 'xp_multiplier', xp_mult);
    end if;
  end loop;

  if my_team = winner then
    for opp in select (x->>'user_id')::uuid from jsonb_array_elements(_players) x where x->>'team' <> my_team::text and x->>'user_id' is not null loop
      select count(*) into cnt from match_players a join match_players b on a.match_id=b.match_id and a.team<>b.team
        join matches m on m.id=a.match_id where a.user_id=me and b.user_id=opp and m.winner_team=a.team;
      if cnt >= 3 then
        insert into achievements(user_id, code) values (me,'rivalry_victor') on conflict do nothing;
        if found then my_unlocks := array_append(my_unlocks, 'rivalry_victor'); end if;
      end if;
    end loop;
  end if;

  return result || jsonb_build_object('match_id', mid, 'winner_team', winner, 'my_team', my_team, 'unlocked', to_jsonb(my_unlocks));
end $function$;

create or replace function public.admin_broadcast(_title text, _body text default null, _link text default null, _audience text default 'all')
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if char_length(btrim(coalesce(_title, ''))) = 0 then raise exception 'Add a title'; end if;
  if _audience not in ('all', 'active', 'inactive') then raise exception 'Unknown audience'; end if;
  if _link is not null and _link <> '' and left(_link, 1) <> '/' then raise exception 'Links must be an app path like /record'; end if;
  insert into notifications (user_id, kind, title, body, link)
  select p.id, 'broadcast', left(btrim(_title), 80), nullif(left(btrim(coalesce(_body, '')), 240), ''), nullif(_link, '')
  from profiles p
  where _audience = 'all'
     or (_audience = 'active' and exists (select 1 from match_players mp where mp.user_id = p.id and mp.created_at > now() - interval '14 days'))
     or (_audience = 'inactive' and not exists (select 1 from match_players mp where mp.user_id = p.id and mp.created_at > now() - interval '14 days'));
  get diagnostics n = row_count;
  perform admin_note('broadcast', _audience, jsonb_build_object('title', _title, 'sent', n));
  return n;
end $$;

create or replace function public.admin_message(_user uuid, _title text, _body text default null, _link text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if char_length(btrim(coalesce(_title, ''))) = 0 then raise exception 'Add a title'; end if;
  if _link is not null and _link <> '' and left(_link, 1) <> '/' then raise exception 'Links must be an app path like /record'; end if;
  if not exists (select 1 from profiles where id = _user) then raise exception 'Player not found'; end if;
  insert into notifications (user_id, kind, title, body, link)
    values (_user, 'boss', left(btrim(_title), 80), nullif(left(btrim(coalesce(_body, '')), 240), ''), nullif(_link, ''));
  perform admin_note('message', _user::text, jsonb_build_object('title', _title));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_launch_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'players', (select count(*) from profiles),
    'players_with_match', (select count(distinct user_id) from match_players where user_id is not null),
    'matches', (select count(*) from matches),
    'venues', (select count(*) from venues),
    'venues_with_booking', (select count(*) from venues where coalesce(booking_url, '') <> ''),
    'open_reports', (select count(*) from reports where status = 'open'),
    'oldest_open_report', (select min(created_at) from reports where status = 'open'),
    'reviewer_account', exists (select 1 from profiles where lower(username) = 'playreview'),
    'admins', (select count(*) from user_roles where role = 'admin'),
    'broadcasts', (select count(*) from admin_log where action = 'broadcast')
  );
end $$;

revoke execute on function public.admin_broadcast(text, text, text, text) from public, anon;
revoke execute on function public.admin_message(uuid, text, text, text) from public, anon;
revoke execute on function public.admin_launch_status() from public, anon;
grant execute on function public.admin_broadcast(text, text, text, text) to authenticated;
grant execute on function public.admin_message(uuid, text, text, text) to authenticated;
grant execute on function public.admin_launch_status() to authenticated;
REVOKE EXECUTE ON FUNCTION public.record_match(jsonb,jsonb,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_match(jsonb,jsonb,text,text,text) TO authenticated;