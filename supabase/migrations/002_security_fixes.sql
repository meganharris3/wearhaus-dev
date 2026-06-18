-- ============================================================
-- SECURITY FIX: C-1 / H-1 — add WITH CHECK to update policies
-- ============================================================

-- Drop and recreate items update policy with WITH CHECK
drop policy if exists "items: owner update" on public.items;
create policy "items: owner update" on public.items
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Drop and recreate users update policy with WITH CHECK
drop policy if exists "users: owner update" on public.users;
create policy "users: owner update" on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- SECURITY FIX: C-1 — protect privileged columns on users
-- Prevents self-mutation of rating, stats, email, id
-- ============================================================
create or replace function public.protect_user_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() <> 'service_role' then
    new.email             := old.email;
    new.rating            := old.rating;
    new.items_listed      := old.items_listed;
    new.rentals_completed := old.rentals_completed;
    new.id                := old.id;
    new.created_at        := old.created_at;
  end if;
  return new;
end;
$$;

create trigger trg_protect_user_columns
  before update on public.users
  for each row execute procedure public.protect_user_columns();

-- ============================================================
-- SECURITY FIX: H-2 — restrict users read to authenticated only
-- and expose a column-limited view for public profiles
-- ============================================================

-- Tighten the broad public read policy
drop policy if exists "users: public read" on public.users;
create policy "users: authenticated read" on public.users
  for select
  using (auth.role() = 'authenticated');

-- Column-limited view (no email exposed)
create or replace view public.user_profiles as
  select
    id,
    display_name,
    avatar_url,
    university,
    bio,
    items_listed,
    rentals_completed,
    rating,
    created_at
  from public.users;

-- ============================================================
-- SECURITY FIX: L-5 — haus_memberships self-insert must lock role to 'member'
-- ============================================================
drop policy if exists "haus_memberships: self insert" on public.haus_memberships;
create policy "haus_memberships: self insert" on public.haus_memberships
  for insert
  with check (auth.uid() = user_id and role = 'member');

-- ============================================================
-- PERF FIX: PH-4 — add index on items.category for eq() filter
-- ============================================================
create index if not exists idx_items_category on public.items (category);

-- ============================================================
-- PERF FIX: PH-6 (Low) — add index on items.price_per_day for range queries
-- ============================================================
create index if not exists idx_items_price_status
  on public.items (price_per_day, status)
  where status = 'available';
