-- ============================================================
-- Multi-select category and size on items — occasion_tags (005_add_item_columns.sql)
-- already proved this pattern end-to-end; this brings category and size_label in line
-- with it instead of being the two remaining scalar text columns.
-- ============================================================

-- category: nullable text -> nullable text[]. Existing single values become one-element
-- arrays; NULL stays NULL (an item with no category chosen yet).
alter table public.items
  alter column category type text[]
  using (case when category is null then null else array[category] end);

-- size_label: NOT NULL text -> NOT NULL text[], default '{}' for consistency with
-- occasion_tags. ALTER COLUMN TYPE preserves the NOT NULL constraint automatically.
alter table public.items
  alter column size_label type text[]
  using array[size_label],
  alter column size_label set default '{}';

-- idx_items_category (002_security_fixes.sql) was a btree on the old scalar text column.
-- A btree on an array doesn't accelerate the `@>` containment lookups category filtering now
-- uses (itemService.ts's .contains()) — swap it for a GIN index, which does.
drop index if exists idx_items_category;
create index if not exists idx_items_category on public.items using gin (category);

