-- ============================================================
-- One-off cleanup: delete the hauses left with no members by the createHaus
-- bug that 020_create_haus_rpc.sql fixes. They can't be repaired — nothing
-- recorded who created them — and nobody can open them.
--
-- Only user-made hauses (never the campus closets) with no memberships at
-- all, created before this cleanup. Their invite links, invitations and
-- collections go with them (on delete cascade).
-- ============================================================

delete from public.hauses h
 where h.haus_type is distinct from 'campus'
   and h.created_at < '2026-11-06'
   and not exists (select 1 from public.haus_memberships m where m.haus_id = h.id);
