drop policy if exists "pro readable" on public.pro_members;
revoke select on public.pro_members from anon;
create policy "read own pro membership" on public.pro_members for select to authenticated using (user_id = auth.uid());