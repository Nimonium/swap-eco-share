-- Migration: Add Wishlist (saved items) table and RLS policies
-- 20260929000000_wishlist.sql

create table if not exists public.wishlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id uuid references public.items(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint wishlist_items_user_item_unique unique (user_id, item_id)
);

-- Index on (user_id, created_at desc) for fast query of user's saved items ordered by most recently saved
create index if not exists idx_wishlist_items_user_created on public.wishlist_items(user_id, created_at desc);

-- Enable Row Level Security
alter table public.wishlist_items enable row level security;

-- Policy 1: SELECT only where user_id = auth.uid() (wishlists are strictly private)
create policy "Users can view their own saved wishlist items"
  on public.wishlist_items
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy 2: DELETE only where user_id = auth.uid()
create policy "Users can remove items from their own wishlist"
  on public.wishlist_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Policy 3: INSERT only where user_id = auth.uid() AND item is currently published AND item owner is not auth.uid()
create policy "Users can save published items of other owners"
  on public.wishlist_items
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.items i
      where i.id = item_id
        and i.status = 'published'
        and i.owner_id != auth.uid()
    )
  );

-- Note: No UPDATE policy is provided as wishlist items are immutable (only inserted or deleted).
