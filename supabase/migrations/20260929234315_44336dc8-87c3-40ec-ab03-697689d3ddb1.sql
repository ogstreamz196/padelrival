create table public.profiles (
  id uuid primary key,
  username text not null unique,
  display_name text not null,
  avatar text not null default '🎾',
  avatar_color text not null default 'lime',
  court_side text not null default 'both' check (court_side in ('left','right','both')),
  rating int not null default 1000,
  xp int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid() and rating = 1000 and xp = 0 and wins = 0 and losses = 0 and current_streak = 0 and best_streak = 0);

-- only cosmetic columns updatable by users
revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar, avatar_color, court_side) on public.profiles to authenticated;
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  venue text,
  match_type text not null default 'friendly',
  sets jsonb not null,
  winner_team smallint not null,
  created_at timestamptz not null default now()
);
grant select on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches readable" on public.matches for select to authenticated using (true);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team smallint not null,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  rating_before int,
  rating_delta int not null default 0,
  xp_gained int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.match_players(user_id);
create index on public.match_players(match_id);
grant select on public.match_players to authenticated;
grant all on public.match_players to service_role;
alter table public.match_players enable row level security;
create policy "mp readable" on public.match_players for select to authenticated using (true);

create table public.achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);
grant select on public.achievements to authenticated;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "ach readable" on public.achievements for select to authenticated using (true);

-- players: [{team:1|2, user_id?:uuid, guest_name?:text}] x4 ; sets: [[a,b],...]
create or replace function public.record_match(_players jsonb, _sets jsonb, _venue text, _match_type text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p jsonb; s jsonb;
  t1 int := 0; t2 int := 0; winner smallint;
  avg1 numeric; avg2 numeric; exp1 numeric;
  k int := 32;
  mid uuid;
  uid uuid; tm smallint; won boolean; delta int; xpg int; newstreak int;
  prof public.profiles;
  result jsonb := '{}'::jsonb;
  my_unlocks text[] := '{}';
  opp uuid; cnt int;
  my_team smallint;
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

  insert into matches(created_by, venue, match_type, sets, winner_team) values (me, left(_venue,120), coalesce(left(_match_type,40),'friendly'), _sets, winner) returning id into mid;

  for p in select * from jsonb_array_elements(_players) loop
    tm := (p->>'team')::smallint;
    uid := (p->>'user_id')::uuid;
    if uid is null then
      insert into match_players(match_id, team, guest_name) values (mid, tm, left(coalesce(p->>'guest_name','Guest'),40));
      continue;
    end if;
    select * into prof from profiles where id = uid for update;
    if not found then raise exception 'Unknown player'; end if;
    won := tm = winner;
    delta := round(k * ((case when won then 1 else 0 end) - (case when tm=1 then exp1 else 1-exp1 end)));
    newstreak := case when won then greatest(prof.current_streak,0)+1 else 0 end;
    xpg := 50 + (case when won then 50 else 0 end) + (case when newstreak >= 3 then 10*least(newstreak,10) else 0 end);
    update profiles set rating = rating + delta, xp = xp + xpg,
      wins = wins + (case when won then 1 else 0 end), losses = losses + (case when won then 0 else 1 end),
      current_streak = newstreak, best_streak = greatest(best_streak, newstreak)
      where id = uid;
    insert into match_players(match_id, team, user_id, rating_before, rating_delta, xp_gained) values (mid, tm, uid, prof.rating, delta, xpg);

    -- achievements
    if won then
      insert into achievements(user_id, code) values (uid,'first_win') on conflict do nothing;
      if found and uid = me then my_unlocks := my_unlocks || 'first_win'; end if;
      if newstreak >= 3 then insert into achievements values (uid,'streak_3') on conflict do nothing;
        if found and uid = me then my_unlocks := my_unlocks || 'streak_3'; end if; end if;
      if newstreak >= 5 then insert into achievements values (uid,'streak_5') on conflict do nothing;
        if found and uid = me then my_unlocks := my_unlocks || 'streak_5'; end if; end if;
      if (case when tm=1 then avg2-avg1 else avg1-avg2 end) >= 100 then
        insert into achievements values (uid,'giant_killer') on conflict do nothing;
        if found and uid = me then my_unlocks := my_unlocks || 'giant_killer'; end if; end if;
    end if;
    if uid = me then
      result := jsonb_build_object('won', won, 'rating_before', prof.rating, 'rating_delta', delta, 'xp_gained', xpg,
        'xp_before', prof.xp, 'streak', newstreak, 'best_streak', greatest(prof.best_streak,newstreak));
    end if;
  end loop;

  -- rivalry victor: 3+ wins over the same opponent
  if my_team = winner then
    for opp in select (x->>'user_id')::uuid from jsonb_array_elements(_players) x where x->>'team' <> my_team::text and x->>'user_id' is not null loop
      select count(*) into cnt from match_players a join match_players b on a.match_id=b.match_id and a.team<>b.team
        join matches m on m.id=a.match_id where a.user_id=me and b.user_id=opp and m.winner_team=a.team;
      if cnt >= 3 then insert into achievements values (me,'rivalry_victor') on conflict do nothing;
        if found then my_unlocks := my_unlocks || 'rivalry_victor'; end if; end if;
    end loop;
  end if;

  return result || jsonb_build_object('match_id', mid, 'winner_team', winner, 'my_team', my_team, 'unlocked', to_jsonb(my_unlocks));
end $$;
revoke execute on function public.record_match(jsonb,jsonb,text,text) from public, anon;
grant execute on function public.record_match(jsonb,jsonb,text,text) to authenticated;

create or replace function public.get_rivalries(_user uuid)
returns table(opponent_id uuid, username text, display_name text, avatar text, avatar_color text, rating int,
  matches bigint, wins bigint, losses bigint, sets_won bigint, sets_lost bigint, last_winner uuid, last_played timestamptz)
language sql stable security definer set search_path = public as $$
  with games as (
    select b.user_id opp, m.id, m.created_at, (m.winner_team = a.team) won, a.team my_team, m.sets
    from match_players a join match_players b on a.match_id=b.match_id and a.team<>b.team and b.user_id is not null
    join matches m on m.id=a.match_id where a.user_id=_user
  ), setc as (
    select g.id, g.opp,
      sum(case when (g.my_team=1 and (s->>0)::int>(s->>1)::int) or (g.my_team=2 and (s->>1)::int>(s->>0)::int) then 1 else 0 end) sw,
      sum(case when (g.my_team=1 and (s->>0)::int<(s->>1)::int) or (g.my_team=2 and (s->>1)::int<(s->>0)::int) then 1 else 0 end) sl
    from games g, jsonb_array_elements(g.sets) s group by g.id, g.opp
  )
  select g.opp, p.username, p.display_name, p.avatar, p.avatar_color, p.rating,
    count(*), count(*) filter (where g.won), count(*) filter (where not g.won),
    coalesce(sum(sc.sw),0)::bigint, coalesce(sum(sc.sl),0)::bigint,
    (array_agg(case when g.won then _user else g.opp end order by g.created_at desc))[1],
    max(g.created_at)
  from games g join profiles p on p.id=g.opp left join setc sc on sc.id=g.id and sc.opp=g.opp
  group by g.opp, p.username, p.display_name, p.avatar, p.avatar_color, p.rating
  having count(*) >= 2
  order by count(*) desc, max(g.created_at) desc;
$$;
revoke execute on function public.get_rivalries(uuid) from public, anon;
grant execute on function public.get_rivalries(uuid) to authenticated;

create or replace function public.weekly_leaderboard()
returns table(user_id uuid, username text, display_name text, avatar text, avatar_color text, rating int,
  rating_gain bigint, xp_gain bigint, matches bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar, p.avatar_color, p.rating,
    sum(mp.rating_delta)::bigint, sum(mp.xp_gained)::bigint, count(*)
  from match_players mp join profiles p on p.id=mp.user_id
  where mp.created_at > now() - interval '7 days'
  group by p.id limit 100;
$$;
revoke execute on function public.weekly_leaderboard() from public, anon;
grant execute on function public.weekly_leaderboard() to authenticated;