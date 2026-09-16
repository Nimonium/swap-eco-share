-- Migration: Add ratings & reviews system
-- 20260918000000_reviews_table.sql

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  swap_id uuid references public.swaps(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint reviews_swap_reviewer_unique unique (swap_id, reviewer_id),
  constraint reviews_no_self_review check (reviewer_id != reviewee_id)
);

-- Helpful indexes for profile and swap lookups
create index if not exists idx_reviews_reviewee_id on public.reviews(reviewee_id);
create index if not exists idx_reviews_swap_id on public.reviews(swap_id);
create index if not exists idx_reviews_reviewer_id on public.reviews(reviewer_id);

-- Enable RLS
alter table public.reviews enable row level security;

-- Policy 1: Anyone can read reviews (public feedback on user profiles)
create policy "Anyone can read reviews"
  on public.reviews for select
  using (true);

-- Policy 2: Participant can insert a review only for the other party on a completed swap
create policy "Participants can review completed swaps"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id != reviewee_id
    and exists (
      select 1 from public.swaps
      where swaps.id = reviews.swap_id
        and swaps.status = 'completed'
        and (
          (swaps.proposer_id = auth.uid() and swaps.owner_id = reviews.reviewee_id)
          or
          (swaps.owner_id = auth.uid() and swaps.proposer_id = reviews.reviewee_id)
        )
    )
  );

-- Trigger function to recalculate profile rating_avg on review insert
create or replace function public.update_profile_rating_avg()
returns trigger as $$
begin
  update public.profiles
  set rating_avg = round(
    coalesce(
      (select avg(rating)::numeric from public.reviews where reviewee_id = new.reviewee_id),
      0
    ),
    2
  )
  where id = new.reviewee_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger firing AFTER INSERT on reviews
drop trigger if exists on_review_inserted on public.reviews;
create trigger on_review_inserted
  after insert on public.reviews
  for each row execute procedure public.update_profile_rating_avg();
