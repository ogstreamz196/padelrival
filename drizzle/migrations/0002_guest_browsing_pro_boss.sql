grant select on public.profiles, public.matches, public.match_players, public.achievements,
  public.match_reactions, public.beacons, public.beacon_players to anon;

create policy "guests read profiles" on public.profiles for select to anon using (true);
create policy "guests read matches" on public.matches for select to anon using (true);
create policy "guests read match players" on public.match_players for select to anon using (true);
create policy "guests read achievements" on public.achievements for select to anon using (true);
create policy "guests read reactions" on public.match_reactions for select to anon using (true);
create policy "guests read beacons" on public.beacons for select to anon using (true);
create policy "guests read beacon players" on public.beacon_players for select to anon using (true);

grant execute on function public.get_rivalries(uuid) to anon;
grant execute on function public.get_partners(uuid) to anon;
grant execute on function public.get_court_sides(uuid) to anon;
grant execute on function public.weekly_leaderboard() to anon;
grant execute on function public.get_head_to_head(uuid, uuid) to anon;

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to anon, authenticated using (true);

insert into public.app_settings (key, value) values
  ('pricing', jsonb_build_object(
    'currency', 'GBP',
    'monthly', 4.99, 'yearly', 39.99,
    'promo_enabled', true, 'promo_monthly', 2.99, 'promo_yearly', 24.99, 'promo_days', 15,
    'checkout_enabled', false)),
  ('features', jsonb_build_object('beacons', true, 'venues', true, 'dossier', true, 'ai_coach', true)),
  ('announcement', jsonb_build_object('enabled', false, 'text', '', 'tone', 'info'))
on conflict (key) do nothing;

create table public.pro_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  source text not null default 'gift' check (source in ('gift','promo','standard')),
  started_at timestamptz not null default now(),
  expires_at timestamptz
);
grant select on public.pro_members to anon, authenticated;
grant all on public.pro_members to service_role;
alter table public.pro_members enable row level security;
create policy "pro readable" on public.pro_members for select to anon, authenticated using (true);

create table public.admin_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index admin_log_created_idx on public.admin_log (created_at desc);
grant select on public.admin_log to authenticated;
grant all on public.admin_log to service_role;
alter table public.admin_log enable row level security;
create policy "admins read log" on public.admin_log for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.admin_note(_action text, _target text, _detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into admin_log (actor, action, target, detail) values (auth.uid(), _action, _target, _detail);
$$;
revoke all on function public.admin_note(text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'players', (select count(*) from profiles),
    'signups_today', (select count(*) from profiles where created_at > now() - interval '1 day'),
    'signups_week', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_week', (select count(distinct user_id) from match_players where user_id is not null and created_at > now() - interval '7 days'),
    'matches', (select count(*) from matches),
    'matches_today', (select count(*) from matches where created_at > now() - interval '1 day'),
    'matches_week', (select count(*) from matches where created_at > now() - interval '7 days'),
    'open_beacons', (select count(*) from beacons where status = 'open' and scheduled_at > now()),
    'beacons_week', (select count(*) from beacons where created_at > now() - interval '7 days'),
    'checkins_today', (select count(*) from venue_checkins where playing_at = current_date),
    'venues', (select count(*) from venues),
    'pro', (select count(*) from pro_members where expires_at is null or expires_at > now()),
    'admins', (select count(*) from user_roles where role = 'admin'),
    'reactions', (select count(*) from match_reactions),
    'top_rating', (select max(rating) from profiles)
  );
end $$;

create or replace function public.admin_activity(_days int default 14)
returns table(day date, signups bigint, matches bigint, beacons bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return query
  select d::date,
    (select count(*) from profiles p where p.created_at::date = d::date),
    (select count(*) from matches m where m.created_at::date = d::date),
    (select count(*) from beacons b where b.created_at::date = d::date)
  from generate_series(current_date - (greatest(1, least(_days, 90)) - 1), current_date, interval '1 day') d
  order by 1;
end $$;

create or replace function public.admin_roster()
returns table(id uuid, username text, display_name text, avatar text, avatar_color text, email text,
  rating int, xp int, wins int, losses int, matches bigint, is_admin boolean, is_pro boolean,
  pro_expires_at timestamptz, banned_until timestamptz, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return query
  select p.id, p.username, p.display_name, p.avatar, p.avatar_color, u.email::text,
    p.rating, p.xp, p.wins, p.losses,
    (select count(*) from match_players mp where mp.user_id = p.id),
    public.has_role(p.id, 'admin'),
    exists (select 1 from pro_members pm where pm.user_id = p.id and (pm.expires_at is null or pm.expires_at > now())),
    (select pm.expires_at from pro_members pm where pm.user_id = p.id),
    u.banned_until, p.created_at, u.last_sign_in_at
  from profiles p left join auth.users u on u.id = p.id
  order by p.created_at desc;
end $$;

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
  update app_settings set value = _value, updated_at = now(), updated_by = auth.uid() where key = _key;
  if not found then raise exception 'Unknown setting %', _key; end if;
  perform admin_note('update_setting', _key, _value);
  return _value;
end $$;

create or replace function public.admin_set_pro(_user uuid, _on boolean, _days int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _on then
    insert into pro_members (user_id, source, started_at, expires_at)
    values (_user, 'gift', now(), case when _days is null then null else now() + make_interval(days => _days) end)
    on conflict (user_id) do update set source = 'gift', started_at = now(), expires_at = excluded.expires_at;
  else
    delete from pro_members where user_id = _user;
  end if;
  perform admin_note(case when _on then 'gift_pro' else 'remove_pro' end, _user::text, jsonb_build_object('days', _days));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_set_admin(_user uuid, _on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _user = auth.uid() and not _on then raise exception 'You cannot remove your own boss access'; end if;
  if _on then insert into user_roles (user_id, role) values (_user, 'admin') on conflict do nothing;
  else delete from user_roles where user_id = _user and role = 'admin';
  end if;
  perform admin_note(case when _on then 'grant_admin' else 'revoke_admin' end, _user::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_upsert_venue(_id uuid, _name text, _city text, _postcode text,
  _courts int, _court_type text, _booking_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare vid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if btrim(coalesce(_name,'')) = '' or btrim(coalesce(_city,'')) = '' then raise exception 'Name and city are required'; end if;
  if _booking_url is not null and btrim(_booking_url) <> '' and _booking_url !~* '^https?://' then
    raise exception 'Booking link must start with http:// or https://';
  end if;
  if _id is null then
    insert into venues (name, city, postcode, courts_count, court_type, booking_url)
    values (btrim(_name), btrim(_city), nullif(btrim(coalesce(_postcode,'')),''), coalesce(_courts,4),
      coalesce(_court_type,'indoor'), nullif(btrim(coalesce(_booking_url,'')),''))
    returning id into vid;
  else
    update venues set name = btrim(_name), city = btrim(_city), postcode = nullif(btrim(coalesce(_postcode,'')),''),
      courts_count = coalesce(_courts, courts_count), court_type = coalesce(_court_type, court_type),
      booking_url = nullif(btrim(coalesce(_booking_url,'')),'')
    where id = _id returning id into vid;
    if vid is null then raise exception 'Club not found'; end if;
  end if;
  perform admin_note('save_venue', vid::text, jsonb_build_object('name', _name));
  return vid;
end $$;

create or replace function public.admin_delete_venue(_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  delete from venues where id = _id returning name into n;
  if n is null then raise exception 'Club not found'; end if;
  perform admin_note('delete_venue', _id::text, jsonb_build_object('name', n));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_cancel_beacon(_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  update beacons set status = 'cancelled' where id = _id;
  if not found then raise exception 'Game not found'; end if;
  perform admin_note('cancel_beacon', _id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_void_match(_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m public.matches; mp record;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  select * into m from matches where id = _match_id;
  if not found then raise exception 'Match not found'; end if;
  for mp in select * from match_players where match_id = _match_id and user_id is not null loop
    update profiles set
      rating = rating - mp.rating_delta,
      xp = greatest(0, xp - mp.xp_gained),
      wins = greatest(0, wins - (case when mp.team = m.winner_team then 1 else 0 end)),
      losses = greatest(0, losses - (case when mp.team = m.winner_team then 0 else 1 end))
    where id = mp.user_id;
  end loop;
  delete from match_reactions where match_id = _match_id;
  delete from match_players where match_id = _match_id;
  delete from matches where id = _match_id;
  perform admin_note('void_match', _match_id::text, jsonb_build_object('venue', m.venue, 'sets', m.sets));
  return jsonb_build_object('voided', true);
end $$;

create or replace function public.admin_set_rating(_user uuid, _rating int, _xp int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _rating < 0 or _rating > 5000 then raise exception 'Rating out of range'; end if;
  update profiles set rating = _rating, xp = coalesce(_xp, xp) where id = _user;
  if not found then raise exception 'Player not found'; end if;
  perform admin_note('set_rating', _user::text, jsonb_build_object('rating', _rating, 'xp', _xp));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_log_external(_actor uuid, _action text, _target text, _detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into admin_log (actor, action, target, detail) values (_actor, _action, _target, _detail);
$$;
revoke all on function public.admin_log_external(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_log_external(uuid, text, text, jsonb) to service_role;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_activity(int) from public, anon;
revoke all on function public.admin_roster() from public, anon;
revoke all on function public.admin_update_setting(text, jsonb) from public, anon;
revoke all on function public.admin_set_pro(uuid, boolean, int) from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
revoke all on function public.admin_upsert_venue(uuid, text, text, text, int, text, text) from public, anon;
revoke all on function public.admin_delete_venue(uuid) from public, anon;
revoke all on function public.admin_cancel_beacon(uuid) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_activity(int) to authenticated;
grant execute on function public.admin_roster() to authenticated;
grant execute on function public.admin_update_setting(text, jsonb) to authenticated;
grant execute on function public.admin_set_pro(uuid, boolean, int) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_upsert_venue(uuid, text, text, text, int, text, text) to authenticated;
grant execute on function public.admin_delete_venue(uuid) to authenticated;
grant execute on function public.admin_cancel_beacon(uuid) to authenticated;