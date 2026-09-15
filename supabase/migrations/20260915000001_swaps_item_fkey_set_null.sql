-- ==============================================================================
-- Migration: Update swaps.item_id Foreign Key to ON DELETE SET NULL
--
-- Why:
-- Previously, swaps.item_id had ON DELETE CASCADE. Hard-deleting an item
-- would permanently wipe out associated swap records and completed trade history.
-- Changing it to ON DELETE SET NULL (matching offered_item_id) ensures
-- historical swap rows are preserved even if an item is removed.
-- ==============================================================================

-- 1. Drop the NOT NULL constraint on swaps.item_id so it can become NULL
alter table public.swaps alter column item_id drop not null;

-- 2. Drop the existing CASCADE foreign key constraint
alter table public.swaps drop constraint if exists swaps_item_id_fkey;

-- 3. Re-add the foreign key constraint with ON DELETE SET NULL
alter table public.swaps
  add constraint swaps_item_id_fkey
  foreign key (item_id)
  references public.items(id)
  on delete set null;
