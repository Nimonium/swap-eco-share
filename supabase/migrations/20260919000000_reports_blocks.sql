-- Migration: Add reports and blocks tables with RLS
-- 20260919000000_reports_blocks.sql

-- 1. REPORTS TABLE
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reported_item_id uuid references public.items(id) on delete set null,
  reason text not null check (reason in ('fake_listing', 'prohibited_item', 'harassment', 'fraud', 'other')),
  details text,
  status text default 'pending' not null check (status in ('pending', 'reviewed', 'dismissed', 'action_taken')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint reports_target_check check (reported_user_id is not null or reported_item_id is not null),
  constraint reports_no_self_report check (reported_user_id is null or reported_user_id != reporter_id)
);

-- Indexes for reports lookups
create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_reported_user_id on public.reports(reported_user_id);
create index if not exists idx_reports_reported_item_id on public.reports(reported_item_id);
create index if not exists idx_reports_status on public.reports(status);

-- Enable RLS on reports
alter table public.reports enable row level security;

-- Reports RLS Policies:
-- Users can only view their own submitted reports (confidential/non-public)
create policy "Users can view their own submitted reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- Authenticated users can insert reports where reporter_id = auth.uid() and not reporting themselves
create policy "Authenticated users can submit reports"
  on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and (reported_user_id is null or reported_user_id != auth.uid())
  );


-- 2. BLOCKS TABLE
create table if not exists public.blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint blocks_unique_pair unique (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id != blocked_id)
);

-- Indexes for blocks lookups
create index if not exists idx_blocks_blocker_id on public.blocks(blocker_id);
create index if not exists idx_blocks_blocked_id on public.blocks(blocked_id);

-- Enable RLS on blocks
alter table public.blocks enable row level security;

-- Blocks RLS Policies:
-- Users can view only their own blocked users list
create policy "Users can view their own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_id);

-- Users can insert a block where blocker_id = auth.uid() and not self-blocking
create policy "Users can block other users"
  on public.blocks for insert
  with check (
    auth.uid() = blocker_id
    and blocker_id != blocked_id
  );

-- Users can delete (unblock) only their own blocks
create policy "Users can delete their own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_id);
