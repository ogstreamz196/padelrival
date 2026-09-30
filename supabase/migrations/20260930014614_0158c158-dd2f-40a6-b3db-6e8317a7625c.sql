ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS streak_before integer,
  ADD COLUMN IF NOT EXISTS xp_before integer;

CREATE TABLE IF NOT EXISTS public.match_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🤜',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.match_reactions TO authenticated;
GRANT ALL ON public.match_reactions TO service_role;

ALTER TABLE public.match_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions readable" ON public.match_reactions;
CREATE POLICY "reactions readable" ON public.match_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "add own reaction" ON public.match_reactions;
CREATE POLICY "add own reaction" ON public.match_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "remove own reaction" ON public.match_reactions;
CREATE POLICY "remove own reaction" ON public.match_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS match_reactions_match_idx ON public.match_reactions(match_id);
CREATE INDEX IF NOT EXISTS matches_created_at_idx ON public.matches(created_at DESC);

CREATE OR REPLACE FUNCTION public.record_match(_players jsonb, _sets jsonb, _venue text, _match_type text)
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
    insert into match_players(match_id, team, user_id, rating_before, rating_delta, xp_gained, streak_before, xp_before)
      values (mid, tm, uid, prof.rating, delta, xpg, prof.current_streak, prof.xp);

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

  if my_team = winner then
    for opp in select (x->>'user_id')::uuid from jsonb_array_elements(_players) x where x->>'team' <> my_team::text and x->>'user_id' is not null loop
      select count(*) into cnt from match_players a join match_players b on a.match_id=b.match_id and a.team<>b.team
        join matches m on m.id=a.match_id where a.user_id=me and b.user_id=opp and m.winner_team=a.team;
      if cnt >= 3 then insert into achievements values (me,'rivalry_victor') on conflict do nothing;
        if found then my_unlocks := my_unlocks || 'rivalry_victor'; end if; end if;
    end loop;
  end if;

  return result || jsonb_build_object('match_id', mid, 'winner_team', winner, 'my_team', my_team, 'unlocked', to_jsonb(my_unlocks));
end $function$;

CREATE OR REPLACE FUNCTION public.void_match(_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := auth.uid();
  m public.matches;
  mp record;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  select * into m from matches where id = _match_id;
  if not found then raise exception 'Match not found'; end if;
  if m.created_by <> me then raise exception 'Only the player who logged this match can undo it'; end if;
  if now() - m.created_at > interval '15 minutes' then raise exception 'The 15 minute undo window has passed'; end if;

  for mp in select * from match_players where match_id = _match_id and user_id is not null loop
    if exists (
      select 1 from match_players x join matches mm on mm.id = x.match_id
      where x.user_id = mp.user_id and mm.created_at > m.created_at
    ) then
      raise exception 'A newer match was already logged for one of these players';
    end if;
    update profiles set
      rating = rating - mp.rating_delta,
      xp = greatest(0, xp - mp.xp_gained),
      wins = greatest(0, wins - (case when mp.team = m.winner_team then 1 else 0 end)),
      losses = greatest(0, losses - (case when mp.team = m.winner_team then 0 else 1 end)),
      current_streak = coalesce(mp.streak_before, 0)
    where id = mp.user_id;
  end loop;

  delete from match_reactions where match_id = _match_id;
  delete from match_players where match_id = _match_id;
  delete from matches where id = _match_id;
  return jsonb_build_object('voided', true);
end $function$;

CREATE OR REPLACE FUNCTION public.get_partners(_user uuid)
 RETURNS TABLE(partner_id uuid, username text, display_name text, avatar text, avatar_color text, rating integer, matches bigint, wins bigint, losses bigint, last_played timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with games as (
    select b.user_id as partner, (m.winner_team = a.team) as won, m.created_at
    from match_players a
    join match_players b on b.match_id = a.match_id and b.team = a.team and b.user_id is not null and b.user_id <> a.user_id
    join matches m on m.id = a.match_id
    where a.user_id = _user
  )
  select g.partner, p.username, p.display_name, p.avatar, p.avatar_color, p.rating,
    count(*), count(*) filter (where g.won), count(*) filter (where not g.won), max(g.created_at)
  from games g join profiles p on p.id = g.partner
  group by g.partner, p.username, p.display_name, p.avatar, p.avatar_color, p.rating
  order by count(*) desc, max(g.created_at) desc;
$function$;

REVOKE ALL ON FUNCTION public.void_match(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.void_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partners(uuid) TO authenticated;