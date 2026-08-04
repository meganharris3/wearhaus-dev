-- Add onboarding/campus fields to users
alter table public.users
  add column if not exists campus_verified     boolean   default false,
  add column if not exists campus_id           text,
  add column if not exists campus_name         text,
  add column if not exists school_email        text,
  add column if not exists interests           text[]    default '{}',
  add column if not exists onboarding_complete boolean   default false;

-- Add campus haus type columns to hauses
alter table public.hauses
  add column if not exists haus_type         text    default 'user',
  add column if not exists campus_id         text,
  add column if not exists is_system_owned   boolean default false;

create index if not exists idx_hauses_campus_id
  on public.hauses (campus_id)
  where haus_type = 'campus';
