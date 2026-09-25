-- Migration: Add real-time swap_messages table with RLS and Realtime publication
-- 20260924000000_swap_messages.sql

-- 1. Ensure helper function is_blocked_bidirectional exists
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

grant execute on function public.is_blocked_bidirectional(uuid, uuid) to authenticated;

-- 2. Create swap_messages table
create table if not exists public.swap_messages (
  id uuid default gen_random_uuid() primary key,
  swap_id uuid references public.swaps(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(trim(content)) >= 1 and char_length(content) <= 2000),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  read_at timestamptz
);

-- Fast lookup indexes
create index if not exists idx_swap_messages_swap_id_created_at 
  on public.swap_messages(swap_id, created_at asc);

create index if not exists idx_swap_messages_sender_id 
  on public.swap_messages(sender_id);

create index if not exists idx_swap_messages_unread
  on public.swap_messages(swap_id, read_at) 
  where read_at is null;

-- Enable Row Level Security
alter table public.swap_messages enable row level security;

-- Grant standard permissions to authenticated users
grant select, insert, update on public.swap_messages to authenticated;

-- 3. RLS Policies

-- SELECT: Only the swap's proposer or owner can read messages
drop policy if exists "Swap participants can read messages" on public.swap_messages;
create policy "Swap participants can read messages"
  on public.swap_messages for select
  using (
    exists (
      select 1 from public.swaps
      where swaps.id = swap_messages.swap_id
        and (swaps.proposer_id = auth.uid() or swaps.owner_id = auth.uid())
    )
  );

-- INSERT: Sender must be auth.uid(), must be a swap participant, and neither party has blocked the other
drop policy if exists "Swap participants can insert messages if not blocked" on public.swap_messages;
create policy "Swap participants can insert messages if not blocked"
  on public.swap_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.swaps
      where swaps.id = swap_messages.swap_id
        and (
          (swaps.proposer_id = auth.uid() and not public.is_blocked_bidirectional(swaps.proposer_id, swaps.owner_id))
          or
          (swaps.owner_id = auth.uid() and not public.is_blocked_bidirectional(swaps.owner_id, swaps.proposer_id))
        )
    )
  );

-- UPDATE: Only recipient can update read_at (marking messages as read)
drop policy if exists "Recipients can mark messages as read" on public.swap_messages;
create policy "Recipients can mark messages as read"
  on public.swap_messages for update
  using (
    auth.uid() != sender_id
    and exists (
      select 1 from public.swaps
      where swaps.id = swap_messages.swap_id
        and (swaps.proposer_id = auth.uid() or swaps.owner_id = auth.uid())
    )
  )
  with check (
    auth.uid() != sender_id
    and exists (
      select 1 from public.swaps
      where swaps.id = swap_messages.swap_id
        and (swaps.proposer_id = auth.uid() or swaps.owner_id = auth.uid())
    )
  );

-- Column-tampering prevention trigger: Ensures only read_at can be modified during update
create or replace function public.prevent_swap_message_tampering()
returns trigger as $$
begin
  if new.content != old.content or new.sender_id != old.sender_id or new.swap_id != old.swap_id or new.created_at != old.created_at then
    raise exception 'Only read_at can be updated on swap messages';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_swap_message_tampering on public.swap_messages;
create trigger trg_prevent_swap_message_tampering
  before update on public.swap_messages
  for each row execute function public.prevent_swap_message_tampering();

-- 4. Add to Supabase Realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'swap_messages'
  ) then
    alter publication supabase_realtime add table public.swap_messages;
  end if;
end $$;
