-- Migration: Swap Dispute Centre
-- 20260928000000_disputes.sql

-- 1. Create disputes table
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  swap_id uuid not null references public.swaps(id) on delete cascade,
  filed_by uuid not null references public.profiles(id),
  against_user_id uuid not null references public.profiles(id),
  category text not null check (category in ('item_not_as_described', 'item_damaged', 'no_show', 'non_delivery', 'other')),
  description text not null check (length(trim(description)) >= 20 and length(trim(description)) <= 1000),
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved_favor_filer', 'resolved_favor_other', 'resolved_mutual', 'closed_no_action')),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint disputes_filed_by_not_against check (filed_by != against_user_id),
  constraint disputes_swap_filed_by_unique unique (swap_id, filed_by)
);

-- Indexes for performance
create index if not exists idx_disputes_swap_id on public.disputes(swap_id);
create index if not exists idx_disputes_status on public.disputes(status);
create index if not exists idx_disputes_filed_by on public.disputes(filed_by);
create index if not exists idx_disputes_against_user_id on public.disputes(against_user_id);

-- Enable RLS on disputes
alter table public.disputes enable row level security;

-- RLS: Only participants (filed_by or against_user_id) can view disputes
create policy "Participants can view their disputes"
  on public.disputes
  for select
  to authenticated
  using (auth.uid() = filed_by or auth.uid() = against_user_id);

-- RLS: Filing is allowed only by a participant of an accepted or completed swap against the other participant
create policy "Participants can file dispute on accepted or completed swap"
  on public.disputes
  for insert
  to authenticated
  with check (
    auth.uid() = filed_by
    and exists (
      select 1 from public.swaps s
      where s.id = swap_id
        and s.status in ('accepted', 'completed')
        and (
          (s.proposer_id = auth.uid() and s.owner_id = against_user_id)
          or
          (s.owner_id = auth.uid() and s.proposer_id = against_user_id)
        )
    )
  );

-- No update/delete policy for regular users: dispute resolution & status changes are admin-only via Supabase Dashboard / service_role

-- Grants
grant select, insert on public.disputes to authenticated;
grant all on public.disputes to postgres, service_role;


-- 2. Create dispute_evidence table
create table if not exists public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'document')),
  created_at timestamptz not null default now()
);

-- Index on dispute_id
create index if not exists idx_dispute_evidence_dispute_id on public.dispute_evidence(dispute_id);

-- Enable RLS on dispute_evidence
alter table public.dispute_evidence enable row level security;

-- RLS: Evidence can be viewed only by participants of the dispute
create policy "Participants can view dispute evidence"
  on public.dispute_evidence
  for select
  to authenticated
  using (
    exists (
      select 1 from public.disputes d
      where d.id = dispute_evidence.dispute_id
        and (d.filed_by = auth.uid() or d.against_user_id = auth.uid())
    )
  );

-- RLS: Evidence can be uploaded by either participant of the dispute
create policy "Participants can upload dispute evidence"
  on public.dispute_evidence
  for insert
  to authenticated
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.disputes d
      where d.id = dispute_evidence.dispute_id
        and (d.filed_by = auth.uid() or d.against_user_id = auth.uid())
    )
  );

-- Grants
grant select, insert on public.dispute_evidence to authenticated;
grant all on public.dispute_evidence to postgres, service_role;


-- 3. Storage policy helper for dispute evidence in item-media bucket
create policy "Users can upload dispute evidence to item-media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'item-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = 'disputes'
    )
  );
