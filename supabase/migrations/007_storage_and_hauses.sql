-- ============================================================
-- 1. Add RLS policies for the 'avatars' storage bucket.
--    004_storage_policies.sql only covered 'item-photos',
--    so avatar uploads were failing silently.
-- 2. Add the decrement_haus_member_count RPC that hausService
--    calls when a user leaves a haus (the function never existed).
-- ============================================================

-- ── Avatars bucket ────────────────────────────────────────────

create policy "users: upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users: update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users: delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "public: read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ── Haus member count RPC ────────────────────────────────────

-- Called by hausService.ts leaveHaus() to safely decrement
-- member_count without a race condition.
-- security definer runs as the function owner (bypasses RLS on
-- the hauses table for this targeted counter update only).
create or replace function public.decrement_haus_member_count(haus_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hauses
     set member_count = greatest(member_count - 1, 0),
         updated_at   = now()
   where id = haus_id;
end;
$$;

-- Only authenticated users may call it
revoke all on function public.decrement_haus_member_count(uuid) from public;
grant execute on function public.decrement_haus_member_count(uuid) to authenticated;
