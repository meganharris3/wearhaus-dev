-- ============================================================
-- Storage RLS policies for the item-photos bucket
-- Covers both item photo uploads ({userId}/{timestamp}.ext)
-- and avatar uploads ({userId}/avatar.ext)
-- ============================================================

create policy "users: upload own files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users: update own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'item-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read so image URLs resolve in the app
create policy "public: read item photos"
on storage.objects for select
using (bucket_id = 'item-photos');
