-- ==============================================================================
-- Supabase Schema Migration: Swap Eco Share
-- Tables: profiles, items, item_media, swaps, consent_records
-- Storage: item-media bucket and RLS policies
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  city text,
  bio text,
  rating_avg numeric default 0,
  swap_count integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Profiles RLS: anyone can select; users can insert and update their own row
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile trigger on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to allow safe re-running
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ITEMS TABLE
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  condition text not null check (condition in ('Like New', 'Very Good', 'Good', 'Fair', 'For Parts')),
  price_value numeric,
  exchange_preference text check (exchange_preference in ('swap', 'rent', 'purchase')),
  wanted_items text[],
  city text,
  status text default 'draft' check (status in ('draft', 'published', 'swapped', 'removed')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.items enable row level security;

-- Items RLS:
-- Anyone can select published items; owner can select all their items
create policy "Anyone can view published items"
  on public.items for select
  using (status = 'published' or (auth.uid() is not null and auth.uid() = owner_id));

-- Authenticated users can insert items where owner_id = auth.uid()
create policy "Users can create their own items"
  on public.items for insert
  with check (auth.uid() is not null and auth.uid() = owner_id);

-- Owners can update their items
create policy "Users can update their own items"
  on public.items for update
  using (auth.uid() is not null and auth.uid() = owner_id);

-- Owners can delete their items
create policy "Users can delete their own items"
  on public.items for delete
  using (auth.uid() is not null and auth.uid() = owner_id);


-- 3. ITEM_MEDIA TABLE
create table if not exists public.item_media (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  storage_path text not null,
  media_type text check (media_type in ('image', 'video')),
  angle_index integer,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.item_media enable row level security;

-- item_media RLS:
-- Readable by anyone if parent item is published, or by item owner
create policy "Item media viewable by public if published or by owner"
  on public.item_media for select
  using (
    exists (
      select 1 from public.items
      where items.id = item_media.item_id
        and (items.status = 'published' or items.owner_id = auth.uid())
    )
  );

-- Only parent item owner can insert media
create policy "Owners can insert item media"
  on public.item_media for insert
  with check (
    exists (
      select 1 from public.items
      where items.id = item_media.item_id
        and items.owner_id = auth.uid()
    )
  );

-- Only parent item owner can update/delete media
create policy "Owners can update item media"
  on public.item_media for update
  using (
    exists (
      select 1 from public.items
      where items.id = item_media.item_id
        and items.owner_id = auth.uid()
    )
  );

create policy "Owners can delete item media"
  on public.item_media for delete
  using (
    exists (
      select 1 from public.items
      where items.id = item_media.item_id
        and items.owner_id = auth.uid()
    )
  );


-- 4. SWAPS TABLE
create table if not exists public.swaps (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  proposer_id uuid references public.profiles(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  offered_item_id uuid references public.items(id) on delete set null,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.swaps enable row level security;

-- swaps RLS:
-- Only proposer_id or owner_id can view/update
create policy "Participants can view their swaps"
  on public.swaps for select
  using (auth.uid() = proposer_id or auth.uid() = owner_id);

-- Authenticated user can propose a swap (as proposer_id),
-- verifying that owner_id matches the real owner of item_id
create policy "Users can create swap proposals"
  on public.swaps for insert
  with check (
    auth.uid() = proposer_id
    and exists (
      select 1 from public.items
      where items.id = swaps.item_id
        and items.owner_id = swaps.owner_id
    )
  );

-- Role-based status transition update policy:
-- Only item owner (auth.uid() = owner_id) can accept or decline;
-- Either participant (proposer_id or owner_id) can mark as completed
create policy "Participants can update swaps with role-based status transitions"
  on public.swaps for update
  using (auth.uid() = proposer_id or auth.uid() = owner_id)
  with check (
    (
      auth.uid() = owner_id
      and status in ('accepted', 'declined')
    )
    or
    (
      (auth.uid() = proposer_id or auth.uid() = owner_id)
      and status = 'completed'
    )
  );

-- Optional helper RPC function to handle status transitions
create or replace function public.update_swap_status(
  p_swap_id uuid,
  p_new_status text
)
returns public.swaps as $$
declare
  v_swap public.swaps;
begin
  select * into v_swap from public.swaps where id = p_swap_id;
  
  if not found then
    raise exception 'Swap not found';
  end if;

  if p_new_status in ('accepted', 'declined') then
    if auth.uid() != v_swap.owner_id then
      raise exception 'Only the item owner can accept or decline a swap';
    end if;
  elsif p_new_status = 'completed' then
    if auth.uid() != v_swap.owner_id and auth.uid() != v_swap.proposer_id then
      raise exception 'Only swap participants can mark a swap as completed';
    end if;
  else
    raise exception 'Invalid status transition';
  end if;

  update public.swaps
  set status = p_new_status,
      updated_at = timezone('utc'::text, now())
  where id = p_swap_id
  returning * into v_swap;

  return v_swap;
end;
$$ language plpgsql security definer;


-- 5. CONSENT_RECORDS TABLE
create table if not exists public.consent_records (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  signature_text text not null,
  terms_version text not null,
  user_agent text,
  ip_address text,
  signed_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.consent_records enable row level security;

-- consent_records RLS:
-- Readable and insertable only by the signing user
create policy "Users can view their own consent records"
  on public.consent_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own consent records"
  on public.consent_records for insert
  with check (auth.uid() = user_id);


-- 6. STORAGE BUCKET & POLICIES FOR item-media
-- Create item-media bucket if not exists
insert into storage.buckets (id, name, public)
values ('item-media', 'item-media', true)
on conflict (id) do update set public = true;

-- Storage RLS policies for item-media
create policy "item-media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'item-media');

create policy "Authenticated users can upload to item-media"
  on storage.objects for insert
  with check (
    bucket_id = 'item-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own item-media"
  on storage.objects for update
  using (
    bucket_id = 'item-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own item-media"
  on storage.objects for delete
  using (
    bucket_id = 'item-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
