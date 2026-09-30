create or replace function public.claim_boss()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  em text := lower(coalesce(auth.jwt()->>'email',''));
  boss_avatar text := '/__l5e/assets-v1/9f1c91dc-7954-43e3-ada4-0f6598be77e1/og-bot.jpg';
begin
  if me is null then return false; end if;
  if em <> 'ogstreamz196@gmail.com' then return false; end if;
  insert into public.user_roles(user_id, role) values (me,'admin') on conflict do nothing;
  update public.profiles
    set avatar = boss_avatar
  where id = me and (avatar is null or avatar not like '/__l5e/%');
  return true;
end $$;

revoke all on function public.claim_boss() from public, anon;
grant execute on function public.claim_boss() to authenticated;