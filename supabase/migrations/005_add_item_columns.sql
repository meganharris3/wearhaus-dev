-- ============================================================
-- Add missing item columns that the app reads/writes but that
-- are absent from the initial schema.
-- All columns are optional (nullable or have defaults) so
-- existing rows are unaffected.
-- ============================================================

alter table public.items
  add column if not exists photo_urls       text[]  default '{}',
  add column if not exists list_for_rental  boolean default false,
  add column if not exists max_duration     text,
  add column if not exists pickup_method    text,
  add column if not exists condition        text,
  add column if not exists occasion_tags    text[]  default '{}',
  add column if not exists visibility       text    default 'public',
  add column if not exists haus_visibility  jsonb   default '{}';

-- Index for common public-feed filter
create index if not exists idx_items_visibility
  on public.items (visibility)
  where status = 'available';
