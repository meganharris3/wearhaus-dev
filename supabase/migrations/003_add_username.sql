-- ============================================================
-- Add missing username column to public.users
-- (ProfileScreen already writes/reads this field, but the
-- column was never created — every save was failing.)
-- ============================================================
alter table public.users
  add column if not exists username text unique;

-- Recreate view: CREATE OR REPLACE can't insert a column mid-list, must drop first
drop view if exists public.user_profiles;
create view public.user_profiles as
  select
    id,
    display_name,
    username,
    avatar_url,
    university,
    bio,
    items_listed,
    rentals_completed,
    rating,
    created_at
  from public.users;
