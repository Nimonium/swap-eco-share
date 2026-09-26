-- Migration: Add x-webhook-secret authentication header to pg_net database triggers
-- 20260926000001_webhook_authentication.sql

-- 1. Helper function holding the shared webhook secret
-- Set INTERNAL_WEBHOOK_SECRET in Supabase Edge Function Secrets to match this value!
create or replace function public.get_internal_webhook_secret()
returns text
language sql
security definer
stable
as $$
  select 'ecoswap_wh_secret_2026'::text;
$$;

-- Grant execution to postgres & service role
grant execute on function public.get_internal_webhook_secret() to postgres, service_role;

-- 2. Update trigger functions to include x-webhook-secret header

-- A. New Swap Proposal Trigger
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
      'Content-Type', 'application/json',
      'x-webhook-secret', public.get_internal_webhook_secret()
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


-- B. Swap Status Change Trigger (Accepted / Declined)
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
        'Content-Type', 'application/json',
        'x-webhook-secret', public.get_internal_webhook_secret()
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


-- C. New Chat Message Trigger
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
      'Content-Type', 'application/json',
      'x-webhook-secret', public.get_internal_webhook_secret()
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


-- D. New Review Trigger
create or replace function public.notify_on_new_review()
returns trigger as $$
declare
  v_actor_name text;
begin
  select full_name into v_actor_name from public.profiles where id = new.reviewer_id;

  perform net.http_post(
    url := 'https://smlboienukczbvtihfxl.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', public.get_internal_webhook_secret()
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
