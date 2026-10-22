-- Leaderboard ordering, scalable venue counts, UK-time check-ins and in-app notifications.

-- ---------------------------------------------------------------- weekly leaderboard
-- Sort before limiting so the top of the week is never cut off once 100+ people play.
create or replace function public.weekly_leaderboard()
returns table(user_id uuid, username text, display_name text, avatar text, avatar_color text, rating int,
  rating_gain bigint, xp_gain bigint, matches bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, p.avatar_color, p.rating,
    sum(mp.rating_delta)::bigint, sum(mp.xp_gained)::bigint, count(*)
  from match_players mp join profiles p on p.id = mp.user_id
  where mp.created_at > now() - interval '7 days'
  group by p.id
  order by sum(mp.rating_delta) desc, sum(mp.xp_gained) desc
  limit 500;
$$;

-- ---------------------------------------------------------------- matches logged per club
create or replace function public.venue_match_counts()
returns table(venue text, matches bigint)
language sql stable set search_path = public as $$
  select lower(btrim(m.venue)), count(*) from matches m
  where m.venue is not null and btrim(m.venue) <> ''
  group by 1;
$$;
revoke execute on function public.venue_match_counts() from public;
grant execute on function public.venue_match_counts() to anon, authenticated;

-- ---------------------------------------------------------------- check-ins on UK time
-- "Today" for a check-in is the UK calendar day, not UTC (which is an hour behind in summer).
create or replace function public.uk_today()
returns date language sql stable as $$ select (now() at time zone 'Europe/London')::date $$;
grant execute on function public.uk_today() to anon, authenticated;

alter table public.venue_checkins alter column playing_at set default public.uk_today();
drop policy if exists "check in today" on public.venue_checkins;
drop policy if exists "undo today's check-in" on public.venue_checkins;
create policy "check in today" on public.venue_checkins for insert to authenticated
  with check (user_id = auth.uid() and playing_at = public.uk_today());
create policy "undo today's check-in" on public.venue_checkins for delete to authenticated
  using (user_id = auth.uid() and playing_at = public.uk_today());

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
    'checkins_today', (select count(*) from venue_checkins where playing_at = public.uk_today()),
    'venues', (select count(*) from venues),
    'pro', (select count(*) from pro_members where expires_at is null or expires_at > now()),
    'admins', (select count(*) from user_roles where role = 'admin'),
    'reactions', (select count(*) from match_reactions),
    'top_rating', (select max(rating) from profiles)
  );
end $$;

-- ---------------------------------------------------------------- notifications
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
create policy "read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "clear own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify(_user uuid, _kind text, _title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, link) values (_user, _kind, _title, _body, _link);
$$;
revoke all on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.beacon_when(_b public.beacons)
returns text language sql stable as $$
  select _b.venue || ', ' || to_char(_b.scheduled_at at time zone 'Europe/London', 'Dy DD Mon HH24:MI')
$$;

-- Someone claimed or gave up a spot: tell the host.
create or replace function public.on_beacon_player_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare b public.beacons; who text;
begin
  select * into b from beacons where id = coalesce(new.beacon_id, old.beacon_id);
  if not found or b.status = 'cancelled' then return null; end if;
  if tg_op = 'INSERT' and new.user_id <> b.created_by then
    select display_name into who from profiles where id = new.user_id;
    perform notify(b.created_by, 'beacon_join', coalesce(who, 'A player') || ' claimed a spot', 'Your open match at ' || beacon_when(b), '/beacons');
  elsif tg_op = 'DELETE' and old.user_id <> b.created_by then
    select display_name into who from profiles where id = old.user_id;
    perform notify(b.created_by, 'beacon_leave', coalesce(who, 'A player') || ' gave up their spot', 'Your open match at ' || beacon_when(b) || ' has a free spot again', '/beacons');
  end if;
  return null;
end $$;
create trigger beacon_player_notify after insert or delete on public.beacon_players
  for each row execute function public.on_beacon_player_change();

-- The match filled up or was cancelled: tell everyone in it.
create or replace function public.on_beacon_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.status = old.status then return null; end if;
  for p in select user_id from beacon_players where beacon_id = new.id loop
    if new.status = 'filled' then
      perform notify(p.user_id, 'beacon_full', 'Your match is full', 'All spots taken for ' || beacon_when(new) || '. See you on court!', '/beacons');
    elsif new.status = 'cancelled' and p.user_id <> new.created_by then
      perform notify(p.user_id, 'beacon_cancelled', 'Open match cancelled', 'The match at ' || beacon_when(new) || ' was cancelled', '/beacons');
    end if;
  end loop;
  return null;
end $$;
create trigger beacon_status_notify after update of status on public.beacons
  for each row execute function public.on_beacon_status_change();

-- Someone else logged a match you played in.
create or replace function public.on_match_player_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare m public.matches; who text;
begin
  if new.user_id is null then return null; end if;
  select * into m from matches where id = new.match_id;
  if not found or m.created_by = new.user_id then return null; end if;
  select display_name into who from profiles where id = m.created_by;
  perform notify(new.user_id, 'match_logged', coalesce(who, 'A player') || ' logged a match with you',
    case when new.rating_delta >= 0 then 'Rating +' else 'Rating ' end || new.rating_delta || coalesce(' at ' || nullif(m.venue, ''), ''),
    '/me');
  return null;
end $$;
create trigger match_player_notify after insert on public.match_players
  for each row execute function public.on_match_player_added();

-- Someone added you as a friend.
create or replace function public.on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  select display_name into who from profiles where id = new.follower_id;
  perform notify(new.followee_id, 'follow', coalesce(who, 'A player') || ' added you as a friend', 'Tap to see their player card', '/player/' || new.follower_id);
  return null;
end $$;
create trigger follow_notify after insert on public.follows
  for each row execute function public.on_follow();
