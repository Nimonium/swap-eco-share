-- Migration: Secure Dispute Evidence Storage Policy
-- 20260928000001_disputes_storage_security.sql

-- 1. Drop previous loose policy
drop policy if exists "Users can upload dispute evidence to item-media" on storage.objects;

-- 2. Create strictly scoped policy:
-- Verifies:
-- - Target bucket is 'item-media'
-- - Path pattern is disputes/{dispute_id}/{filename}
-- - The authenticated uploader is an actual participant (filed_by or against_user_id) on that specific dispute
create policy "Dispute participants can upload evidence to item-media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'item-media'
    and (storage.foldername(name))[1] = 'disputes'
    and exists (
      select 1 from public.disputes d
      where d.id::text = (storage.foldername(name))[2]
        and (d.filed_by = auth.uid() or d.against_user_id = auth.uid())
    )
  );
