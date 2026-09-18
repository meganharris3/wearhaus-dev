-- ============================================================
-- Haus Collections: curated sub-groupings of items within a
-- Haus. Previously pure client-side state (HausCollectionsContext)
-- with fake MOCK_HAUS_ITEMS mixed in — this makes it real.
-- ============================================================

create table public.haus_collections (
  id         uuid primary key default uuid_generate_v4(),
  haus_id    uuid not null references public.hauses(id) on delete cascade,
  name       text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.haus_collection_items (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.haus_collections(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  added_by      uuid not null references public.users(id) on delete cascade,
  added_at      timestamptz not null default now(),
  unique (collection_id, item_id)
);

-- Indexes
create index idx_haus_collections_haus_id       on public.haus_collections (haus_id);
create index idx_collection_items_collection_id on public.haus_collection_items (collection_id);
create index idx_collection_items_item_id       on public.haus_collection_items (item_id);

-- RLS
alter table public.haus_collections      enable row level security;
alter table public.haus_collection_items enable row level security;

-- haus_collections: any haus member can read/create; only the
-- creator can rename/delete (mirrors "creator as admin" pattern
-- used for hauses themselves).
create policy "haus_collections: member read" on public.haus_collections
  for select
  using (exists (
    select 1 from public.haus_memberships
    where haus_id = haus_collections.haus_id and user_id = auth.uid()
  ));

create policy "haus_collections: member insert" on public.haus_collections
  for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.haus_memberships
      where haus_id = haus_collections.haus_id and user_id = auth.uid()
    )
  );

create policy "haus_collections: creator update" on public.haus_collections
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "haus_collections: creator delete" on public.haus_collections
  for delete
  using (auth.uid() = created_by);

-- haus_collection_items: any haus member can read/add; only the
-- person who added an item can remove it (so you can't yank
-- someone else's contribution).
create policy "haus_collection_items: member read" on public.haus_collection_items
  for select
  using (exists (
    select 1 from public.haus_collections c
    join public.haus_memberships m on m.haus_id = c.haus_id
    where c.id = haus_collection_items.collection_id and m.user_id = auth.uid()
  ));

create policy "haus_collection_items: member insert" on public.haus_collection_items
  for insert
  with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.haus_collections c
      join public.haus_memberships m on m.haus_id = c.haus_id
      where c.id = haus_collection_items.collection_id and m.user_id = auth.uid()
    )
  );

create policy "haus_collection_items: adder delete" on public.haus_collection_items
  for delete
  using (auth.uid() = added_by);

create trigger trg_haus_collections_updated_at
  before update on public.haus_collections
  for each row execute procedure public.set_updated_at();
