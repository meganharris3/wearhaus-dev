-- ============================================================
-- FIX: member_count was double-counted.
--
-- Root cause: trg_haus_member_count (001) already increments/
-- decrements hauses.member_count on every haus_memberships
-- insert/delete. The client (hausService.ts) was *also*
-- setting member_count: 1 explicitly on haus creation and
-- *also* calling decrement_haus_member_count() on leave,
-- double-applying both directions.
--
-- Fix is client-side (hausService.ts createHaus/leaveHaus no
-- longer duplicate what the trigger does) — this migration
-- only repairs existing rows whose count has drifted from the
-- ground truth (actual membership rows).
-- ============================================================

update public.hauses h
set member_count = (
  select count(*) from public.haus_memberships m where m.haus_id = h.id
),
updated_at = now()
where member_count <> (
  select count(*) from public.haus_memberships m where m.haus_id = h.id
);

-- decrement_haus_member_count (007) is no longer called by the
-- client. Left in place (unused) rather than dropped — cheap to
-- keep, no downside, avoids a migration that could fail if
-- something else references it.
