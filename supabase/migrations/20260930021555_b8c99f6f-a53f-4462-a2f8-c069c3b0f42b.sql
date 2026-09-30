create or replace function public.count_guest_matches(_alias text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from match_players mp
  where mp.user_id is null
    and auth.uid() is not null
    and lower(btrim(mp.guest_name)) = lower(btrim(_alias))
    and not exists (
      select 1 from match_players x
      where x.match_id = mp.match_id and x.user_id = auth.uid()
    );
$$;

revoke all on function public.count_guest_matches(text) from public, anon;
grant execute on function public.count_guest_matches(text) to authenticated;

create or replace function public.claim_guest_matches(_alias text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  claimed int := 0;
  w int := 0;
  l int := 0;
  my_rating int;
  r record;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if btrim(coalesce(_alias,'')) = '' then raise exception 'Enter the name you were logged as'; end if;

  select rating into my_rating from profiles where id = me;
  if my_rating is null then raise exception 'Create your profile first'; end if;

  for r in
    select mp.id, mp.team, m.winner_team
    from match_players mp
    join matches m on m.id = mp.match_id
    where mp.user_id is null
      and lower(btrim(mp.guest_name)) = lower(btrim(_alias))
      and not exists (
        select 1 from match_players x
        where x.match_id = mp.match_id and x.user_id = me
      )
  loop
    update match_players
      set user_id = me, guest_name = null, rating_before = my_rating, rating_delta = 0, xp_gained = 0
      where id = r.id;
    claimed := claimed + 1;
    if r.team = r.winner_team then w := w + 1; else l := l + 1; end if;
  end loop;

  if claimed > 0 then
    update profiles set wins = wins + w, losses = losses + l where id = me;
  end if;

  return jsonb_build_object('claimed', claimed, 'wins', w, 'losses', l);
end $$;

revoke all on function public.claim_guest_matches(text) from public, anon;
grant execute on function public.claim_guest_matches(text) to authenticated;