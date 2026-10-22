-- Report and block (Google Play user-generated content policy).

-- Blocks: one row per blocker/blocked pair, visible only to the blocker.
create table if not exists public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked);
alter table public.blocks enable row level security;
grant select, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
drop policy if exists "read own blocks" on public.blocks;
create policy "read own blocks" on public.blocks for select to authenticated using (blocker = auth.uid());
drop policy if exists "remove own blocks" on public.blocks;
create policy "remove own blocks" on public.blocks for delete to authenticated using (blocker = auth.uid());

-- Reports: written only through report_content, read by the reporter and admins.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('player', 'match', 'open_match')),
  target_id text,
  reason text not null check (reason in ('abuse', 'fake_result', 'cheating', 'spam', 'inappropriate', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
grant select on public.reports to authenticated;
grant all on public.reports to service_role;
drop policy if exists "read own reports" on public.reports;
create policy "read own reports" on public.reports for select to authenticated
  using (reporter = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.block_player(_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _user is null or _user = me then raise exception 'You can''t block yourself'; end if;
  if not exists (select 1 from profiles where id = _user) then raise exception 'Player not found'; end if;
  insert into blocks (blocker, blocked) values (me, _user) on conflict do nothing;
  -- Blocking also ends any follow in either direction.
  delete from follows where (follower_id = me and followee_id = _user) or (follower_id = _user and followee_id = me);
  -- And takes them out of any open game you're hosting.
  delete from beacon_players bp using beacons b
    where bp.beacon_id = b.id and b.created_by = me and bp.user_id = _user and b.scheduled_at > now();
  update beacons b set status = 'open'
    where b.created_by = me and b.status = 'filled' and b.scheduled_at > now()
      and (select count(*) from beacon_players bp where bp.beacon_id = b.id and bp.user_id <> b.created_by) < b.players_needed;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.unblock_player(_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from blocks where blocker = auth.uid() and blocked = _user;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.report_content(_kind text, _target_user uuid, _target_id text, _reason text, _details text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _target_user = me then raise exception 'You can''t report yourself'; end if;
  if (select count(*) from reports where reporter = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of reports today. Try again tomorrow.';
  end if;
  if exists (select 1 from reports where reporter = me and status = 'open' and kind = _kind
             and coalesce(target_id, '') = coalesce(_target_id, '') and target_user is not distinct from _target_user) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  insert into reports (reporter, target_user, kind, target_id, reason, details)
    values (me, _target_user, _kind, left(_target_id, 80), _reason, nullif(btrim(left(coalesce(_details, ''), 500)), ''));
  return jsonb_build_object('ok', true);
end $$;

-- Nobody can join an open game across a block, in either direction.
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
  if exists (select 1 from blocks where (blocker = b.created_by and blocked = me) or (blocker = me and blocked = b.created_by)) then
    raise exception 'You can''t join this game';
  end if;
  insert into beacon_players (beacon_id, user_id) values (b.id, me);
  select count(*) into joined from beacon_players where beacon_id = b.id and user_id <> b.created_by;
  if joined >= b.players_needed then
    update beacons set status = 'filled' where id = b.id;
    return 'filled';
  end if;
  return 'open';
end $$;

create or replace function public.admin_reports(_status text default 'open')
returns table(id bigint, kind text, target_id text, reason text, details text, status text, created_at timestamptz,
  reporter uuid, reporter_name text, target_user uuid, target_name text, target_username text, target_reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return query
  select r.id, r.kind, r.target_id, r.reason, r.details, r.status, r.created_at,
    r.reporter, rp.display_name, r.target_user, tp.display_name, tp.username,
    (select count(*) from reports x where x.target_user = r.target_user)
  from reports r
  left join profiles rp on rp.id = r.reporter
  left join profiles tp on tp.id = r.target_user
  where _status = 'all' or r.status = _status
  order by r.created_at desc
  limit 200;
end $$;

create or replace function public.admin_resolve_report(_id bigint, _status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  if _status not in ('open', 'actioned', 'dismissed') then raise exception 'Unknown status'; end if;
  update reports set status = _status,
    resolved_at = case when _status = 'open' then null else now() end,
    resolved_by = case when _status = 'open' then null else auth.uid() end
  where id = _id;
  if not found then raise exception 'Report not found'; end if;
  perform admin_note('resolve_report', _id::text, jsonb_build_object('status', _status));
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.block_player(uuid) from public, anon;
revoke execute on function public.unblock_player(uuid) from public, anon;
revoke execute on function public.report_content(text, uuid, text, text, text) from public, anon;
revoke execute on function public.admin_reports(text) from public, anon;
revoke execute on function public.admin_resolve_report(bigint, text) from public, anon;
grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
grant execute on function public.report_content(text, uuid, text, text, text) to authenticated;
grant execute on function public.admin_reports(text) to authenticated;
grant execute on function public.admin_resolve_report(bigint, text) to authenticated;
