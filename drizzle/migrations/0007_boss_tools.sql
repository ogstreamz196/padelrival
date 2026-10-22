-- Boss tools: XP events, in-app messages to players, launch status.

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

  -- Boss-run XP events (e.g. Double XP launch week) multiply XP only, never rating.
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

-- In-app message to every player (or only active / inactive ones). Returns how many were sent.
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

-- Everything the launch checklist needs in one call.
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
