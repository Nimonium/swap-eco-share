-- Migration: Email notification preferences, notification_logs table, and webhook triggers
-- 20260926000000_email_notifications.sql

-- 1. Add email_notifications_enabled preference column to profiles
alter table public.profiles
  add column if not exists email_notifications_enabled boolean default true not null;

-- 2. Create notification_logs table for audit trail and 15-minute message rate limiting
create table if not exists public.notification_logs (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  swap_id uuid references public.swaps(id) on delete cascade,
  notification_type text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_notification_logs_rate_limit 
  on public.notification_logs(recipient_id, swap_id, notification_type, created_at desc);

create index if not exists idx_notification_logs_recipient 
  on public.notification_logs(recipient_id);

alter table public.notification_logs enable row level security;

-- Authenticated users can view only their own notification log entries
drop policy if exists "Users can view their own notification logs" on public.notification_logs;
create policy "Users can view their own notification logs"
  on public.notification_logs for select
  using (auth.uid() = recipient_id);

grant select on public.notification_logs to authenticated;

-- 3. Enable pg_net extension for asynchronous database webhooks
create extension if not exists pg_net with schema extensions;

-- 4. Trigger Function: New Swap Proposal
create or replace function public.notify_on_new_swap_proposal()
returns trigger as $$
declare
  v_item_title text;
  v_actor_name text;
begin
  select title into v_item_title from public.items where id = new.item_id;
  select full_name into v_actor_name from public.profiles where id = new.proposer_id;

  perform net.http_post(
    url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'new_swap_proposal',
      'recipient_user_id', new.owner_id,
      'actor_id', new.proposer_id,
      'data', jsonb_build_object(
        'swap_id', new.id,
        'item_title', coalesce(v_item_title, 'an item'),
        'actor_name', coalesce(v_actor_name, 'A community member'),
        'message_preview', new.message
      )
    )
  );
  return new;
exception when others then
  raise warning 'notify_on_new_swap_proposal error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_swap_proposal on public.swaps;
create trigger trg_notify_new_swap_proposal
  after insert on public.swaps
  for each row execute function public.notify_on_new_swap_proposal();


-- 5. Trigger Function: Swap Status Update (Accepted or Declined)
create or replace function public.notify_on_swap_status_change()
returns trigger as $$
declare
  v_item_title text;
  v_actor_name text;
  v_type text;
begin
  if old.status = new.status or new.status not in ('accepted', 'declined') then
    return new;
  end if;

  select title into v_item_title from public.items where id = new.item_id;
  select full_name into v_actor_name from public.profiles where id = new.owner_id;

  v_type := case 
    when new.status = 'accepted' then 'swap_accepted'
    when new.status = 'declined' then 'swap_declined'
    else null
  end;

  if v_type is not null then
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', v_type,
        'recipient_user_id', new.proposer_id,
        'actor_id', new.owner_id,
        'data', jsonb_build_object(
          'swap_id', new.id,
          'item_title', coalesce(v_item_title, 'an item'),
          'actor_name', coalesce(v_actor_name, 'The owner')
        )
      )
    );
  end if;

  return new;
exception when others then
  raise warning 'notify_on_swap_status_change error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_swap_status_change on public.swaps;
create trigger trg_notify_swap_status_change
  after update on public.swaps
  for each row execute function public.notify_on_swap_status_change();


-- 6. Trigger Function: New Chat Message
create or replace function public.notify_on_new_swap_message()
returns trigger as $$
declare
  v_swap record;
  v_recipient_id uuid;
  v_actor_name text;
  v_item_title text;
begin
  select * into v_swap from public.swaps where id = new.swap_id;
  if not found then
    return new;
  end if;

  -- Recipient is the other participant in the swap
  if new.sender_id = v_swap.proposer_id then
    v_recipient_id := v_swap.owner_id;
  else
    v_recipient_id := v_swap.proposer_id;
  end if;

  select full_name into v_actor_name from public.profiles where id = new.sender_id;
  select title into v_item_title from public.items where id = v_swap.item_id;

  perform net.http_post(
    url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'new_message',
      'recipient_user_id', v_recipient_id,
      'actor_id', new.sender_id,
      'data', jsonb_build_object(
        'swap_id', new.swap_id,
        'item_title', coalesce(v_item_title, 'Swap items'),
        'actor_name', coalesce(v_actor_name, 'A member'),
        'message_preview', new.content
      )
    )
  );

  return new;
exception when others then
  raise warning 'notify_on_new_swap_message error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_swap_message on public.swap_messages;
create trigger trg_notify_new_swap_message
  after insert on public.swap_messages
  for each row execute function public.notify_on_new_swap_message();


-- 7. Trigger Function: New Review
create or replace function public.notify_on_new_review()
returns trigger as $$
declare
  v_actor_name text;
begin
  select full_name into v_actor_name from public.profiles where id = new.reviewer_id;

  perform net.http_post(
    url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'new_review',
      'recipient_user_id', new.reviewee_id,
      'actor_id', new.reviewer_id,
      'data', jsonb_build_object(
        'swap_id', new.swap_id,
        'rating', new.rating,
        'comment', new.comment,
        'actor_name', coalesce(v_actor_name, 'A trading partner')
      )
    )
  );

  return new;
exception when others then
  raise warning 'notify_on_new_review error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review
  after insert on public.reviews
  for each row execute function public.notify_on_new_review();
