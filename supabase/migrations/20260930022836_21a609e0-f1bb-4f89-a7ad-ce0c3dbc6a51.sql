
-- Roles
create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Boss claim: only the hard-coded verified email can gain admin
create or replace function public.claim_boss()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  em text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if me is null then return false; end if;
  if em <> 'ogstreamz196@gmail.com' then return false; end if;
  insert into public.user_roles(user_id, role) values (me,'admin') on conflict do nothing;
  return true;
end $$;

revoke all on function public.claim_boss() from public, anon;
grant execute on function public.claim_boss() to authenticated;

-- Admin: platform stats
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'players', (select count(*) from profiles),
    'matches', (select count(*) from matches),
    'matches_week', (select count(*) from matches where created_at > now() - interval '7 days'),
    'matches_today', (select count(*) from matches where created_at > now() - interval '1 day'),
    'reactions', (select count(*) from match_reactions),
    'achievements', (select count(*) from achievements),
    'guest_slots', (select count(*) from match_players where user_id is null),
    'active_week', (select count(distinct user_id) from match_players where user_id is not null and created_at > now() - interval '7 days'),
    'top_rating', (select max(rating) from profiles)
  );
end $$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Admin: all players with auth details
create or replace function public.admin_players()
returns table(id uuid, username text, display_name text, avatar text, avatar_color text,
  email text, rating int, xp int, wins int, losses int, current_streak int, best_streak int,
  matches bigint, is_admin boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return query
  select p.id, p.username, p.display_name, p.avatar, p.avatar_color,
    u.email::text, p.rating, p.xp, p.wins, p.losses, p.current_streak, p.best_streak,
    (select count(*) from match_players mp where mp.user_id = p.id),
    public.has_role(p.id,'admin'), p.created_at, u.last_sign_in_at
  from profiles p left join auth.users u on u.id = p.id
  order by p.created_at desc;
end $$;

revoke all on function public.admin_players() from public, anon;
grant execute on function public.admin_players() to authenticated;

-- Admin: full match log
create or replace function public.admin_matches(_limit int default 50)
returns table(id uuid, created_at timestamptz, venue text, match_type text, sets jsonb,
  winner_team smallint, created_by uuid, creator text, players jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  return query
  select m.id, m.created_at, m.venue, m.match_type, m.sets, m.winner_team, m.created_by,
    c.display_name,
    (select jsonb_agg(jsonb_build_object('team', mp.team, 'name', coalesce(pp.display_name, mp.guest_name),
        'user_id', mp.user_id, 'delta', mp.rating_delta, 'xp', mp.xp_gained) order by mp.team)
     from match_players mp left join profiles pp on pp.id = mp.user_id where mp.match_id = m.id)
  from matches m left join profiles c on c.id = m.created_by
  order by m.created_at desc
  limit greatest(1, least(_limit, 200));
end $$;

revoke all on function public.admin_matches(int) from public, anon;
grant execute on function public.admin_matches(int) to authenticated;

-- Admin: delete any match at any time, rolling stats back
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
  return jsonb_build_object('voided', true);
end $$;

revoke all on function public.admin_void_match(uuid) from public, anon;
grant execute on function public.admin_void_match(uuid) to authenticated;

-- Admin: adjust a player's rating/xp for testing
create or replace function public.admin_set_rating(_user uuid, _rating int, _xp int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  if _rating < 0 or _rating > 5000 then raise exception 'Rating out of range'; end if;
  update profiles set rating = _rating, xp = coalesce(_xp, xp) where id = _user;
  if not found then raise exception 'Player not found'; end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.admin_set_rating(uuid,int,int) from public, anon;
grant execute on function public.admin_set_rating(uuid,int,int) to authenticated;
