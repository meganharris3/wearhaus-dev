-- ============================================================
-- Boards: a closet owner's personal curated groupings of their
-- own items. Previously pure client-side state (BoardsContext),
-- lost on every refresh.
-- ============================================================

create type board_visibility  as enum ('public', 'friends', 'hauses', 'private');
create type board_cover_style as enum ('mosaic', 'single', 'stack');

create table public.boards (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.users(id) on delete cascade,
  name         text not null,
  visibility   board_visibility  not null default 'private',
  cover_style  board_cover_style not null default 'mosaic',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.board_items (
  id         uuid primary key default uuid_generate_v4(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  item_id    uuid not null references public.items(id)  on delete cascade,
  position   integer not null default 0,
  added_at   timestamptz not null default now(),
  unique (board_id, item_id)
);

create index idx_boards_owner_id       on public.boards (owner_id);
create index idx_board_items_board_id  on public.board_items (board_id);
create index idx_board_items_item_id   on public.board_items (item_id);

alter table public.boards      enable row level security;
alter table public.board_items enable row level security;

-- Boards are owner-only for every operation except reading a
-- non-private board, which follows the same visibility model as
-- items (public/friends/hauses/private). Keeping the read policy
-- simple for now: owner can always read; everyone authenticated
-- can read non-private boards. Friends/hauses-scoped visibility
-- enforcement (matching item visibility) is a follow-up — this
-- matches what the client currently does (no cross-user board
-- viewing exists yet in the UI).
create policy "boards: owner read" on public.boards
  for select using (auth.uid() = owner_id);

create policy "boards: public read" on public.boards
  for select using (visibility != 'private' and auth.role() = 'authenticated');

create policy "boards: owner insert" on public.boards
  for insert with check (auth.uid() = owner_id);

create policy "boards: owner update" on public.boards
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "boards: owner delete" on public.boards
  for delete using (auth.uid() = owner_id);

create policy "board_items: owner read" on public.board_items
  for select using (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create policy "board_items: owner insert" on public.board_items
  for insert with check (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create policy "board_items: owner delete" on public.board_items
  for delete using (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create trigger trg_boards_updated_at
  before update on public.boards
  for each row execute procedure public.set_updated_at();
