-- ============================================================
-- Create the friendships table.
-- Referenced by friendService.ts but never created in schema.
-- ============================================================

create table if not exists public.friendships (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  friend_id  uuid        not null references public.users(id) on delete cascade,
  status     text        not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),

  -- Prevent duplicate or self-friend rows
  constraint friendships_no_self    check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create index if not exists idx_friendships_user_id   on public.friendships (user_id);
create index if not exists idx_friendships_friend_id on public.friendships (friend_id);
create index if not exists idx_friendships_status    on public.friendships (status);

alter table public.friendships enable row level security;

-- Either party can see the row
create policy "friendships: read own"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Sender inserts; status must start as 'pending'
create policy "friendships: send request"
  on public.friendships for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Only the recipient can accept (set status → accepted)
create policy "friendships: accept request"
  on public.friendships for update
  using  (auth.uid() = friend_id)
  with check (auth.uid() = friend_id);

-- Either party can remove the friendship / decline the request
create policy "friendships: delete own"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);
