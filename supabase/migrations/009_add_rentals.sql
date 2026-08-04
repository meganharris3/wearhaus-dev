-- ============================================================
-- Rentals table: tracks every borrow/lend exchange between users.
-- A single row represents both sides (borrower view + lender view).
-- ============================================================

create type rental_status as enum ('upcoming', 'active', 'completed', 'cancelled');

create table public.rentals (
  id             uuid primary key default uuid_generate_v4(),
  item_id        uuid not null references public.items(id)  on delete cascade,
  borrower_id    uuid not null references public.users(id)  on delete cascade,
  lender_id      uuid not null references public.users(id)  on delete cascade,
  status         rental_status not null default 'upcoming',
  price_per_day  integer not null check (price_per_day >= 0),
  start_date     date not null,
  end_date       date not null,
  thread_id      text,                         -- client-side message thread id
  rating         numeric(2,1) check (rating >= 0 and rating <= 5),
  rating_comment text,
  pickup_method  text,
  accepted_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date >= start_date),
  check (borrower_id <> lender_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index idx_rentals_borrower_id on public.rentals (borrower_id);
create index idx_rentals_lender_id   on public.rentals (lender_id);
create index idx_rentals_item_id     on public.rentals (item_id);
create index idx_rentals_status      on public.rentals (status);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.rentals enable row level security;

create policy "rentals: parties can read"
  on public.rentals for select
  using (auth.uid() = borrower_id or auth.uid() = lender_id);

create policy "rentals: borrower can insert"
  on public.rentals for insert
  with check (auth.uid() = borrower_id);

create policy "rentals: parties can update"
  on public.rentals for update
  using (auth.uid() = borrower_id or auth.uid() = lender_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

create trigger trg_rentals_updated_at
  before update on public.rentals
  for each row execute procedure public.set_updated_at();

-- Auto-mark item as 'lent' when a rental becomes active; revert when completed/cancelled
create or replace function public.sync_item_status_on_rental()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'active' then
    update public.items set status = 'lent', updated_at = now() where id = new.item_id;
  elsif new.status in ('completed', 'cancelled') then
    -- Only revert if no other active rentals exist for this item
    if not exists (
      select 1 from public.rentals
      where item_id = new.item_id and status = 'active' and id <> new.id
    ) then
      update public.items set status = 'available', updated_at = now() where id = new.item_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_rental_item_status
  after update on public.rentals
  for each row execute procedure public.sync_item_status_on_rental();
