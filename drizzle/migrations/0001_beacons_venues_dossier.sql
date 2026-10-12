create table public.beacons (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  venue text not null check (char_length(btrim(venue)) between 1 and 120),
  scheduled_at timestamptz not null,
  players_needed int not null check (players_needed between 1 and 3),
  target_tier text not null default 'open' check (target_tier in ('open','bronze','silver','gold','platinum','diamond')),
  court_side text not null default 'any' check (court_side in ('left','right','any')),
  match_type text not null default 'competitive' check (match_type in ('competitive','friendly')),
  notes text check (char_length(notes) <= 140),
  status text not null default 'open' check (status in ('open','filled','cancelled')),
  created_at timestamptz not null default now()
);
create index beacons_upcoming_idx on public.beacons (scheduled_at) where status <> 'cancelled';
create index beacons_created_by_idx on public.beacons (created_by);

create table public.beacon_players (
  id uuid primary key default gen_random_uuid(),
  beacon_id uuid not null references public.beacons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (beacon_id, user_id)
);
create index beacon_players_user_idx on public.beacon_players (user_id);

grant select on public.beacons to authenticated;
grant all on public.beacons to service_role;
grant select on public.beacon_players to authenticated;
grant all on public.beacon_players to service_role;

alter table public.beacons enable row level security;
alter table public.beacon_players enable row level security;

create policy "beacons readable" on public.beacons for select to authenticated using (true);
create policy "beacon players readable" on public.beacon_players for select to authenticated using (true);

create or replace function public.create_beacon(
  _venue text, _scheduled_at timestamptz, _players_needed int,
  _target_tier text default 'open', _court_side text default 'any',
  _match_type text default 'competitive', _notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v text := btrim(coalesce(_venue, ''));
  bid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from profiles where id = me) then raise exception 'Create your profile first'; end if;
  if v = '' then raise exception 'Pick a venue'; end if;
  if _players_needed is null or _players_needed not between 1 and 3 then raise exception 'You can ask for 1 to 3 players'; end if;
  if _scheduled_at is null or _scheduled_at < now() - interval '15 minutes' then raise exception 'That time has already passed'; end if;
  if _scheduled_at > now() + interval '30 days' then raise exception 'Beacons can be up to 30 days ahead'; end if;
  if (select count(*) from beacons where created_by = me and status <> 'cancelled' and scheduled_at > now()) >= 5 then
    raise exception 'You already have 5 upcoming beacons';
  end if;
  insert into beacons (created_by, venue, scheduled_at, players_needed, target_tier, court_side, match_type, notes)
  values (
    me, left(v, 120), _scheduled_at, _players_needed,
    case when _target_tier in ('open','bronze','silver','gold','platinum','diamond') then _target_tier else 'open' end,
    case when _court_side in ('left','right','any') then _court_side else 'any' end,
    case when _match_type in ('competitive','friendly') then _match_type else 'competitive' end,
    nullif(btrim(left(coalesce(_notes, ''), 140)), '')
  ) returning id into bid;
  insert into beacon_players (beacon_id, user_id) values (bid, me);
  return bid;
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
  insert into beacon_players (beacon_id, user_id) values (b.id, me);
  select count(*) into joined from beacon_players where beacon_id = b.id and user_id <> b.created_by;
  if joined >= b.players_needed then
    update beacons set status = 'filled' where id = b.id;
    return 'filled';
  end if;
  return 'open';
end $$;

create or replace function public.leave_beacon(_beacon_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b public.beacons;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  select * into b from beacons where id = _beacon_id for update;
  if not found then raise exception 'Beacon not found'; end if;
  if b.created_by = me then raise exception 'You are hosting — cancel the game instead'; end if;
  delete from beacon_players where beacon_id = b.id and user_id = me;
  if found and b.status = 'filled' then
    update beacons set status = 'open' where id = b.id;
    return 'open';
  end if;
  return b.status;
end $$;

create or replace function public.cancel_beacon(_beacon_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  update beacons set status = 'cancelled' where id = _beacon_id and created_by = me;
  if not found then raise exception 'Only the host can cancel this game'; end if;
  return 'cancelled';
end $$;

revoke execute on function public.create_beacon(text, timestamptz, int, text, text, text, text) from public, anon;
revoke execute on function public.join_beacon(uuid) from public, anon;
revoke execute on function public.leave_beacon(uuid) from public, anon;
revoke execute on function public.cancel_beacon(uuid) from public, anon;
grant execute on function public.create_beacon(text, timestamptz, int, text, text, text, text) to authenticated;
grant execute on function public.join_beacon(uuid) to authenticated;
grant execute on function public.leave_beacon(uuid) to authenticated;
grant execute on function public.cancel_beacon(uuid) to authenticated;

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null,
  postcode text,
  courts_count int not null default 4 check (courts_count between 1 and 60),
  court_type text not null default 'indoor' check (court_type in ('indoor','outdoor','covered')),
  booking_url text,
  created_at timestamptz not null default now()
);

create table public.venue_checkins (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  playing_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (venue_id, user_id, playing_at)
);
create index venue_checkins_day_idx on public.venue_checkins (playing_at, venue_id);

grant select on public.venues to anon, authenticated;
grant all on public.venues to service_role;
grant select, insert, delete on public.venue_checkins to authenticated;
grant all on public.venue_checkins to service_role;

alter table public.venues enable row level security;
alter table public.venue_checkins enable row level security;

create policy "venues readable" on public.venues for select to anon, authenticated using (true);
create policy "checkins readable" on public.venue_checkins for select to authenticated using (true);
create policy "check in today" on public.venue_checkins for insert to authenticated
  with check (user_id = auth.uid() and playing_at = current_date);
create policy "undo today's check-in" on public.venue_checkins for delete to authenticated
  using (user_id = auth.uid() and playing_at = current_date);

insert into public.venues (name, city, postcode, courts_count, court_type) values
  ('Stratford Padel Club', 'London', null, 4, 'covered'),
  ('Rocks Lane Chiswick', 'London', null, 4, 'outdoor'),
  ('National Tennis Centre', 'London', 'SW15 5JQ', 4, 'covered'),
  ('Park Padel', 'London', null, 4, 'outdoor'),
  ('Surge Padel', 'London', null, 4, 'indoor'),
  ('The Padel Club Wilmslow', 'Wilmslow', null, 4, 'indoor'),
  ('Padel Social Club', 'London', null, 4, 'indoor'),
  ('David Lloyd Raynes Park', 'London', null, 4, 'covered'),
  ('Rocket Padel Manchester', 'Manchester', null, 6, 'indoor'),
  ('Rocket Padel Birmingham', 'Birmingham', null, 6, 'indoor'),
  ('Rocket Padel Leeds', 'Leeds', null, 6, 'indoor'),
  ('Rocket Padel Liverpool', 'Liverpool', null, 6, 'indoor'),
  ('Rocket Padel Newcastle', 'Newcastle', null, 6, 'indoor'),
  ('Rocket Padel Bristol', 'Bristol', null, 6, 'indoor'),
  ('Rocket Padel Glasgow', 'Glasgow', null, 6, 'indoor'),
  ('Game4Padel Edinburgh', 'Edinburgh', null, 4, 'indoor'),
  ('Game4Padel Bristol', 'Bristol', null, 4, 'outdoor'),
  ('Game4Padel Cardiff', 'Cardiff', null, 4, 'indoor'),
  ('Padel Hub Nottingham', 'Nottingham', null, 4, 'indoor'),
  ('Padel Hub Sheffield', 'Sheffield', null, 4, 'indoor')
on conflict (name) do nothing;

create or replace function public.get_head_to_head(_a uuid, _b uuid)
returns table(
  matches_against bigint, a_wins bigint, b_wins bigint, a_sets bigint, b_sets bigint,
  matches_together bigint, together_wins bigint, together_sets_won bigint, together_sets_lost bigint
)
language sql stable security definer set search_path = public as $$
  with pairs as (
    select m.id, m.sets, a.team a_team, (a.team = b.team) same, (m.winner_team = a.team) a_won
    from match_players a
    join match_players b on b.match_id = a.match_id and b.user_id = _b
    join matches m on m.id = a.match_id
    where a.user_id = _a and _a <> _b
  ), sc as (
    select p.id,
      sum(case when (p.a_team=1 and (s->>0)::int>(s->>1)::int) or (p.a_team=2 and (s->>1)::int>(s->>0)::int) then 1 else 0 end) sw,
      sum(case when (p.a_team=1 and (s->>0)::int<(s->>1)::int) or (p.a_team=2 and (s->>1)::int<(s->>0)::int) then 1 else 0 end) sl
    from pairs p, jsonb_array_elements(p.sets) s group by p.id
  )
  select
    count(*) filter (where not p.same),
    count(*) filter (where not p.same and p.a_won),
    count(*) filter (where not p.same and not p.a_won),
    coalesce(sum(sc.sw) filter (where not p.same), 0)::bigint,
    coalesce(sum(sc.sl) filter (where not p.same), 0)::bigint,
    count(*) filter (where p.same),
    count(*) filter (where p.same and p.a_won),
    coalesce(sum(sc.sw) filter (where p.same), 0)::bigint,
    coalesce(sum(sc.sl) filter (where p.same), 0)::bigint
  from pairs p left join sc on sc.id = p.id;
$$;
revoke execute on function public.get_head_to_head(uuid, uuid) from public, anon;
grant execute on function public.get_head_to_head(uuid, uuid) to authenticated;