-- Migration: Web Push Subscriptions and Trigger Notification Integration
-- 20260927000000_push_subscriptions.sql

-- 1. Add push_notifications_enabled preference to profiles
alter table public.profiles 
  add column if not exists push_notifications_enabled boolean not null default true;

-- 2. Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

-- Index for fast recipient lookups
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

-- Enable Row Level Security
alter table public.push_subscriptions enable row level security;

-- RLS Policies: users can only manage their own subscriptions
create policy "Users can view own push subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own push subscriptions"
  on public.push_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grant permissions to authenticated and service_role
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to postgres, service_role;


-- 3. Update Existing Database Trigger Functions to ALSO dispatch Web Push Notifications

-- A. New Swap Proposal
create or replace function public.notify_on_new_swap_proposal()
returns trigger as $$
declare
  v_item_title text;
  v_actor_name text;
  v_secret text;
begin
  v_secret := public.get_internal_webhook_secret();
  select title into v_item_title from public.items where id = new.item_id;
  select full_name into v_actor_name from public.profiles where id = new.proposer_id;

  -- 1. Dispatch Email Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_swap_proposal (email) error: %', sqlerrm;
  end;

  -- 2. Dispatch Web Push Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_swap_proposal (push) error: %', sqlerrm;
  end;

  return new;
exception when others then
  raise warning 'notify_on_new_swap_proposal general error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;


-- B. Swap Status Change (Accepted / Declined)
create or replace function public.notify_on_swap_status_change()
returns trigger as $$
declare
  v_item_title text;
  v_actor_name text;
  v_type text;
  v_secret text;
begin
  if old.status = new.status or new.status not in ('accepted', 'declined') then
    return new;
  end if;

  v_secret := public.get_internal_webhook_secret();
  select title into v_item_title from public.items where id = new.item_id;
  select full_name into v_actor_name from public.profiles where id = new.owner_id;

  v_type := case 
    when new.status = 'accepted' then 'swap_accepted'
    when new.status = 'declined' then 'swap_declined'
    else null
  end;

  if v_type is not null then
    -- 1. Dispatch Email Notification
    begin
      perform net.http_post(
        url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', coalesce(v_secret, '')
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
    exception when others then
      raise warning 'notify_on_swap_status_change (email) error: %', sqlerrm;
    end;

    -- 2. Dispatch Web Push Notification
    begin
      perform net.http_post(
        url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', coalesce(v_secret, '')
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
    exception when others then
      raise warning 'notify_on_swap_status_change (push) error: %', sqlerrm;
    end;
  end if;

  return new;
exception when others then
  raise warning 'notify_on_swap_status_change general error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;


-- C. New Chat Message
create or replace function public.notify_on_new_swap_message()
returns trigger as $$
declare
  v_swap record;
  v_recipient_id uuid;
  v_actor_name text;
  v_item_title text;
  v_secret text;
begin
  select * into v_swap from public.swaps where id = new.swap_id;
  if not found then
    return new;
  end if;

  if new.sender_id = v_swap.proposer_id then
    v_recipient_id := v_swap.owner_id;
  else
    v_recipient_id := v_swap.proposer_id;
  end if;

  v_secret := public.get_internal_webhook_secret();
  select full_name into v_actor_name from public.profiles where id = new.sender_id;
  select title into v_item_title from public.items where id = v_swap.item_id;

  -- 1. Dispatch Email Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_swap_message (email) error: %', sqlerrm;
  end;

  -- 2. Dispatch Web Push Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_swap_message (push) error: %', sqlerrm;
  end;

  return new;
exception when others then
  raise warning 'notify_on_new_swap_message general error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;


-- D. New Review
create or replace function public.notify_on_new_review()
returns trigger as $$
declare
  v_actor_name text;
  v_secret text;
begin
  v_secret := public.get_internal_webhook_secret();
  select full_name into v_actor_name from public.profiles where id = new.reviewer_id;

  -- 1. Dispatch Email Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_review (email) error: %', sqlerrm;
  end;

  -- 2. Dispatch Web Push Notification
  begin
    perform net.http_post(
      url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
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
  exception when others then
    raise warning 'notify_on_new_review (push) error: %', sqlerrm;
  end;

  return new;
exception when others then
  raise warning 'notify_on_new_review general error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;
