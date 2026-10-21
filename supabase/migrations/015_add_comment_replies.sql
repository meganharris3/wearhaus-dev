-- ============================================================
-- Comment replies: a reply is just another row in item_comments,
-- pointing at the comment it replies to. No new table, no RLS
-- changes — the existing author-scoped insert/delete policies and
-- the authenticated-read policy already cover it unmodified.
--
-- The client only ever lets a reply point at a top-level comment
-- (never at another reply), so threads stay one level deep. The
-- column itself does not enforce that — it is a UI convention,
-- documented in src/utils/commentThreads.ts, which also collapses
-- any deeper chain it finds (e.g. from a future client) onto its
-- outermost ancestor rather than dropping it.
-- ============================================================

alter table public.item_comments
  add column parent_comment_id uuid references public.item_comments(id) on delete cascade;

create index idx_item_comments_parent on public.item_comments (parent_comment_id);
