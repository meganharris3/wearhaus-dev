-- ============================================================
-- Favorites + comments on items, and a user notification feed.
-- All three were pure client-side state before this
-- (InteractionsContext, RequestsContext) with client-generated
-- IDs and hardcoded seed data.
-- ============================================================

create table public.item_favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.item_comments (
  id         uuid primary key default uuid_generate_v4(),
  item_id    uuid not null references public.items(id) on delete cascade,
  author_id  uuid not null references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create type notification_type as enum (
  'borrow_request', 'borrow_accepted',
  'friend_request', 'friend_accepted',
  'haus_invite', 'message', 'system'
);

-- `read`     = the user has seen it (drives the unread dot).
-- `resolved` = an actionable request (friend/borrow) has been answered, from
--              anywhere (notifications screen OR the chat thread). Set by the
--              triggers below, never by the client, so it can't drift.
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  payload    jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_item_favorites_item_id     on public.item_favorites (item_id);
create index idx_item_comments_item_created on public.item_comments (item_id, created_at desc);
create index idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index idx_notifications_user_unread  on public.notifications (user_id) where read = false;
create index idx_notifications_friendship   on public.notifications ((payload->>'friendship_id')) where type = 'friend_request';
create index idx_notifications_message      on public.notifications ((payload->>'message_id'))    where type = 'borrow_request';

alter table public.item_favorites enable row level security;
alter table public.item_comments  enable row level security;
alter table public.notifications  enable row level security;

create policy "item_favorites: authenticated read" on public.item_favorites
  for select using (auth.role() = 'authenticated');
create policy "item_favorites: self insert" on public.item_favorites
  for insert with check (auth.uid() = user_id);
create policy "item_favorites: self delete" on public.item_favorites
  for delete using (auth.uid() = user_id);

create policy "item_comments: authenticated read" on public.item_comments
  for select using (auth.role() = 'authenticated');
create policy "item_comments: author insert" on public.item_comments
  for insert with check (auth.uid() = author_id);
create policy "item_comments: author delete" on public.item_comments
  for delete using (auth.uid() = author_id);

-- Notifications are never written by the client directly — only by triggers
-- (security definer), so there is no client insert policy. Users may only read
-- their own and mark them read; the column grant keeps every other column
-- (type, payload, resolved) untouchable from the client.
create policy "notifications: self read" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications: self update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke update on public.notifications from authenticated, anon;
grant  update (read) on public.notifications to authenticated;

-- ------------------------------------------------------------
-- Trigger pattern: source event -> notification row. Add more by
-- copying this shape (haus invites, new messages) once those flows exist.
-- ------------------------------------------------------------

-- Friend request sent -> notify the recipient.
create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, payload)
    values (
      new.friend_id, 'friend_request',
      jsonb_build_object(
        'friendship_id', new.id,
        'from_user_id',  new.user_id,
        'from_name',     (select display_name from public.users where id = new.user_id)
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_friend_request
  after insert on public.friendships
  for each row execute procedure public.notify_friend_request();

-- Friend request accepted or declined -> resolve the recipient's notification;
-- on accept, also tell the requester.
create or replace function public.resolve_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update public.notifications
       set resolved = true
     where type = 'friend_request' and payload->>'friendship_id' = old.id::text;
    return old;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    update public.notifications
       set resolved = true
     where type = 'friend_request' and payload->>'friendship_id' = new.id::text;

    insert into public.notifications (user_id, type, payload)
    values (
      new.user_id, 'friend_accepted',
      jsonb_build_object(
        'friendship_id', new.id,
        'from_user_id',  new.friend_id,
        'from_name',     (select display_name from public.users where id = new.friend_id)
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_resolve_friend_request
  after update of status or delete on public.friendships
  for each row execute procedure public.resolve_friend_request();

-- Borrow request message sent -> notify the other participant of the thread.
-- (Values are copied with `->`, not cast, so a malformed client payload can
-- never make the message insert itself fail.)
create or replace function public.notify_borrow_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  start_d   text := new.payload->>'startDate';
  end_d     text := new.payload->>'endDate';
begin
  if new.type <> 'borrow_request' then
    return new;
  end if;

  select case when user_a = new.sender_id then user_b else user_a end
    into recipient
    from public.threads where id = new.thread_id;

  if recipient is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    recipient, 'borrow_request',
    jsonb_build_object(
      'thread_id',     new.thread_id,
      'message_id',    new.id,
      'from_user_id',  new.sender_id,
      'borrower_name', new.payload->>'borrowerFirstName',
      'item_name',     new.payload->'item'->>'name',
      'days',          new.payload->'days',
      'date_range',    case when start_d is null then null
                            when start_d = end_d then start_d
                            else start_d || ' – ' || end_d end
    )
  );
  return new;
end;
$$;

create trigger trg_notify_borrow_request
  after insert on public.messages
  for each row execute procedure public.notify_borrow_request();

-- Borrow request answered (payload.status flips to accepted/declined) ->
-- resolve the lender's notification; on accept, notify the borrower.
create or replace function public.resolve_borrow_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type <> 'borrow_request'
     or new.payload->>'status' is not distinct from old.payload->>'status'
     or new.payload->>'status' not in ('accepted', 'declined') then
    return new;
  end if;

  update public.notifications
     set resolved = true
   where type = 'borrow_request' and payload->>'message_id' = new.id::text;

  if new.payload->>'status' = 'accepted' then
    insert into public.notifications (user_id, type, payload)
    values (
      new.sender_id, 'borrow_accepted',
      jsonb_build_object(
        'thread_id',     new.thread_id,
        'message_id',    new.id,
        'from_name',     new.payload->>'lenderFirstName',
        'item_name',     new.payload->'item'->>'name',
        'due_back',      new.payload->>'endDate'
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_resolve_borrow_request
  after update of payload on public.messages
  for each row execute procedure public.resolve_borrow_request();
