-- Enable extensions
create extension if not exists "uuid-ossp";

-- ENUMs
create type item_status as enum ('available', 'lent', 'wash');
create type membership_role as enum ('member', 'admin');

-- users table
create table public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  display_name      text not null,
  avatar_url        text,
  university        text,
  bio               text,
  items_listed      integer not null default 0,
  rentals_completed integer not null default 0,
  rating            numeric(2,1) check (rating >= 0 and rating <= 5),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- items table
create table public.items (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references public.users(id) on delete cascade,
  name           text not null,
  description    text,
  photo_url      text,
  category       text,
  size_label     text not null,
  price_per_day  integer not null check (price_per_day >= 0),
  price_per_week integer check (price_per_week >= 0),
  status         item_status not null default 'available',
  location_label text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- hauses table
create table public.hauses (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  cover_url    text,
  member_count integer not null default 0,
  piece_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- haus_memberships table
create table public.haus_memberships (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.users(id)  on delete cascade,
  haus_id   uuid not null references public.hauses(id) on delete cascade,
  role      membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (user_id, haus_id)
);

-- Indexes
create index idx_items_status_created  on public.items (status, created_at desc);
create index idx_items_owner_id        on public.items (owner_id);
create index idx_items_name_search     on public.items using gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));
create index idx_memberships_haus_id   on public.haus_memberships (haus_id);
create index idx_memberships_user_id   on public.haus_memberships (user_id);
create index idx_hauses_member_count   on public.hauses (member_count desc);

-- RLS
alter table public.users           enable row level security;
alter table public.items           enable row level security;
alter table public.hauses          enable row level security;
alter table public.haus_memberships enable row level security;

-- users policies
create policy "users: public read"  on public.users for select using (true);
create policy "users: owner insert" on public.users for insert with check (auth.uid() = id);
create policy "users: owner update" on public.users for update using (auth.uid() = id);

-- items policies
create policy "items: authenticated read"  on public.items for select using (auth.role() = 'authenticated');
create policy "items: owner insert"        on public.items for insert with check (auth.uid() = owner_id);
create policy "items: owner update"        on public.items for update using (auth.uid() = owner_id);
create policy "items: owner delete"        on public.items for delete using (auth.uid() = owner_id);

-- hauses policies
create policy "hauses: authenticated read"   on public.hauses for select using (auth.role() = 'authenticated');
create policy "hauses: authenticated insert" on public.hauses for insert with check (auth.role() = 'authenticated');
create policy "hauses: admin update"         on public.hauses for update
  using (exists (select 1 from public.haus_memberships where haus_id = hauses.id and user_id = auth.uid() and role = 'admin'));

-- haus_memberships policies
create policy "haus_memberships: authenticated read" on public.haus_memberships for select using (auth.role() = 'authenticated');
create policy "haus_memberships: self insert"        on public.haus_memberships for insert with check (auth.uid() = user_id);
create policy "haus_memberships: self delete"        on public.haus_memberships for delete using (auth.uid() = user_id);

-- Trigger: auto-create public.users on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: sync haus member_count
create or replace function public.sync_haus_member_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.hauses set member_count = member_count + 1, updated_at = now() where id = new.haus_id;
  elsif (tg_op = 'DELETE') then
    update public.hauses set member_count = greatest(member_count - 1, 0), updated_at = now() where id = old.haus_id;
  end if;
  return null;
end;
$$;

create trigger trg_haus_member_count
  after insert or delete on public.haus_memberships
  for each row execute procedure public.sync_haus_member_count();

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_users_updated_at  before update on public.users  for each row execute procedure public.set_updated_at();
create trigger trg_items_updated_at  before update on public.items  for each row execute procedure public.set_updated_at();
create trigger trg_hauses_updated_at before update on public.hauses for each row execute procedure public.set_updated_at();
