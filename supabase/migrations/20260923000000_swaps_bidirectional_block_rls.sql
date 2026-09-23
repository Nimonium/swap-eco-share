-- Migration: Update swaps table INSERT RLS policy with bidirectional block enforcement
-- 20260923000000_swaps_bidirectional_block_rls.sql

-- 1. Helper function with SECURITY DEFINER to check bidirectional block status
-- Reason: In PostgreSQL, if public.blocks has Row Level Security enabled (e.g., restricted to auth.uid() = blocker_id),
-- an inline subquery executed by proposer_id cannot view rows where owner_id is the blocker.
-- Defining a SECURITY DEFINER function allows the system to check if a block exists in EITHER direction
-- between proposer_id and owner_id without exposing the blocks table to direct SELECT queries.
create or replace function public.is_blocked_bidirectional(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

-- Grant execution permission to authenticated users
grant execute on function public.is_blocked_bidirectional(uuid, uuid) to authenticated;

-- 2. Drop the existing swaps INSERT policy
drop policy if exists "Users can create swap proposals" on public.swaps;

-- 3. Recreate the policy with bidirectional block prevention:
-- Verifies that:
--   a) The proposer is the authenticated user
--   b) The item exists and belongs to owner_id
--   c) No block exists in either direction (both via raw subquery and SECURITY DEFINER function)
create policy "Users can create swap proposals"
  on public.swaps for insert
  with check (
    auth.uid() = proposer_id
    and exists (
      select 1 from public.items
      where items.id = swaps.item_id
        and items.owner_id = swaps.owner_id
    )
    and not exists (
      select 1 from public.blocks
      where (blocker_id = proposer_id and blocked_id = owner_id)
         or (blocker_id = owner_id and blocked_id = proposer_id)
    )
    and not public.is_blocked_bidirectional(swaps.proposer_id, swaps.owner_id)
  );
