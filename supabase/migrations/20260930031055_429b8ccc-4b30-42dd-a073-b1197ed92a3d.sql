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
        'xp_before', prof.xp, 'streak', newstreak, 'best_streak', greatest(prof.best_streak,newstreak));
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