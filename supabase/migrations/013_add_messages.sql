-- ============================================================
-- Messages: direct-message threads between two users, optionally
-- attached to an item (borrow negotiation). Previously pure
-- client-side state (MessagesContext) — every conversation was
-- lost on refresh.
-- ============================================================

create type message_type   as enum ('text', 'system', 'borrow_request', 'counter_offer', 'confirmed', 'item_mention');
create type thread_status  as enum ('pending_request', 'counter_sent', 'active_rental', 'completed', 'direct');

create table public.threads (
  id               uuid primary key default uuid_generate_v4(),
  user_a           uuid not null references public.users(id) on delete cascade,
  user_b           uuid not null references public.users(id) on delete cascade,
  item_id          uuid references public.items(id) on delete set null,
  status           thread_status not null default 'direct',
  last_message     text,
  last_message_at  timestamptz not null default now(),
  user_a_read_at   timestamptz not null default now(),
  user_b_read_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint threads_distinct_users check (user_a <> user_b)
);

-- One thread per unordered user pair per item (or per pair when there is no
-- item). A plain unique (user_a, user_b, item_id) would allow duplicates,
-- because NULL item_ids are distinct and (A,B) / (B,A) are different tuples.
create unique index uq_threads_pair_item on public.threads (
  least(user_a, user_b),
  greatest(user_a, user_b),
  coalesce(item_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create table public.messages (
  id         uuid primary key default uuid_generate_v4(),
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender_id  uuid not null references public.users(id) on delete cascade,
  type       message_type not null default 'text',
  text       text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index idx_threads_user_a           on public.threads (user_a);
create index idx_threads_user_b           on public.threads (user_b);
create index idx_threads_last_message_at  on public.threads (last_message_at desc);
create index idx_messages_thread_created  on public.messages (thread_id, created_at desc);

alter table public.threads  enable row level security;
alter table public.messages enable row level security;

create policy "threads: participant read" on public.threads
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "threads: participant insert" on public.threads
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "threads: participant update" on public.threads
  for update using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "messages: participant read" on public.messages
  for select using (exists (
    select 1 from public.threads
    where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
  ));

create policy "messages: participant insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.threads
      where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

-- Accepting / declining a borrow request rewrites that message's payload
-- (status field), so participants need UPDATE — but only on `payload`, never
-- on text/sender/type. Column-level grant enforces that on top of RLS.
create policy "messages: participant update" on public.messages
  for update using (exists (
    select 1 from public.threads
    where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
  ))
  with check (exists (
    select 1 from public.threads
    where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
  ));

revoke update on public.messages from authenticated, anon;
grant  update (payload) on public.messages to authenticated;

-- Keep threads.last_message / last_message_at in sync so the inbox list query
-- never has to join+aggregate messages, and mark the thread as read for the
-- sender (so their own message never shows as unread to them).
create or replace function public.sync_thread_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.threads
     set last_message    = case new.type
                             when 'borrow_request' then 'Sent a borrow request'
                             when 'counter_offer'  then 'Sent an offer'
                             when 'item_mention'   then coalesce(new.text, 'Shared an item')
                             else coalesce(new.text, '[' || new.type || ']')
                           end,
         last_message_at = new.created_at,
         user_a_read_at  = case when user_a = new.sender_id then new.created_at else user_a_read_at end,
         user_b_read_at  = case when user_b = new.sender_id then new.created_at else user_b_read_at end
   where id = new.thread_id;
  return new;
end;
$$;

create trigger trg_sync_thread_last_message
  after insert on public.messages
  for each row execute procedure public.sync_thread_last_message();

-- Marks a thread read for the calling user. A function (not a client-side
-- update) so the client doesn't need to know whether it is user_a or user_b.
create or replace function public.mark_thread_read(p_thread_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.threads
     set user_a_read_at = case when user_a = auth.uid() then now() else user_a_read_at end,
         user_b_read_at = case when user_b = auth.uid() then now() else user_b_read_at end
   where id = p_thread_id
     and (user_a = auth.uid() or user_b = auth.uid());
$$;

revoke all on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated;
