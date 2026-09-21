-- ============================================================
-- Monitoring Views for Wearhaus
-- These views provide health-check queries for the dashboard
-- ============================================================

-- ============================================================
-- View: v_item_stats
-- Shows aggregate statistics about items by status
-- ============================================================
create or replace view public.v_item_stats as
  select
    status,
    count(*) as item_count,
    count(distinct owner_id) as unique_owners,
    round(avg(price_per_day)::numeric, 2) as avg_daily_price,
    min(price_per_day) as min_daily_price,
    max(price_per_day) as max_daily_price
  from public.items
  group by status
  order by status;

comment on view public.v_item_stats is 'Item aggregates by status for health monitoring';

-- ============================================================
-- View: v_user_activity
-- Shows user engagement metrics: items listed and rentals
-- ============================================================
create or replace view public.v_user_activity as
  select
    u.id,
    u.display_name,
    u.email,
    u.university,
    u.items_listed,
    u.rentals_completed,
    u.rating,
    count(distinct i.id) as active_item_count,
    count(distinct hm.haus_id) as haus_memberships,
    u.created_at,
    u.updated_at
  from public.users u
  left join public.items i
    on u.id = i.owner_id and i.status in ('available', 'lent')
  left join public.haus_memberships hm
    on u.id = hm.user_id
  group by
    u.id, u.display_name, u.email, u.university,
    u.items_listed, u.rentals_completed, u.rating,
    u.created_at, u.updated_at
  order by u.items_listed desc, u.rentals_completed desc;

comment on view public.v_user_activity is 'User engagement metrics for activity monitoring';

-- ============================================================
-- View: v_haus_health
-- Shows haus collective health: member count, total items, avg rating
-- ============================================================
create or replace view public.v_haus_health as
  select
    h.id,
    h.name,
    h.member_count,
    h.piece_count,
    count(distinct hm.user_id) as verified_member_count,
    count(distinct i.id) as total_items_in_haus,
    count(distinct i.id) filter (where i.status = 'available') as available_items,
    round(avg(u.rating)::numeric, 2) as avg_member_rating,
    h.created_at,
    h.updated_at
  from public.hauses h
  left join public.haus_memberships hm on h.id = hm.haus_id
  left join public.users u on hm.user_id = u.id
  left join public.items i on hm.user_id = i.owner_id
  group by h.id, h.name, h.member_count, h.piece_count, h.created_at, h.updated_at
  order by h.member_count desc;

comment on view public.v_haus_health is 'Haus collective health metrics for platform monitoring';

-- ============================================================
-- Health check: RLS policy validation
-- Run periodically to confirm RLS is on for every public table.
--
-- Lists every table in the public schema (not a hardcoded subset), so new
-- tables show up automatically. rls_status reflects whether RLS is actually
-- enabled on the table; policy_count = 0 with RLS enabled means the table is
-- locked down for clients (only the service role can touch it).
-- Column names are unchanged from the original definition (tablename, ...).
-- ============================================================
create or replace view public.v_rls_policy_status as
  select
    t.tablename::text as tablename,
    (select count(*) from pg_policies p
      where p.schemaname = 'public' and p.tablename = t.tablename) as policy_count,
    case when t.rowsecurity then 'enabled' else 'disabled' end as rls_status
  from pg_tables t
  where t.schemaname = 'public'
  order by t.tablename;

comment on view public.v_rls_policy_status is 'RLS audit: every public table, whether RLS is enabled, and its policy count';

-- ============================================================
-- View: v_member_count_drift
-- hauses.member_count is maintained by trg_haus_member_count. Any row
-- returned here has drifted from the real membership count (see migration
-- 010). Expected: zero rows.
-- ============================================================
create or replace view public.v_member_count_drift as
  select
    h.id,
    h.name,
    h.member_count as stored_count,
    count(hm.id) as actual_count
  from public.hauses h
  left join public.haus_memberships hm on hm.haus_id = h.id
  group by h.id, h.name, h.member_count
  having h.member_count <> count(hm.id)
  order by h.name;

comment on view public.v_member_count_drift is 'Hauses whose member_count differs from actual memberships (expected: empty)';

-- ============================================================
-- View: v_haus_collections_health
-- Collections and curated items per haus (migration 011).
-- ============================================================
create or replace view public.v_haus_collections_health as
  select
    h.id,
    h.name,
    count(distinct c.id) as collection_count,
    count(ci.id) as collection_item_count,
    count(distinct c.id) filter (where ci.id is null) as empty_collections
  from public.hauses h
  left join public.haus_collections c on c.haus_id = h.id
  left join public.haus_collection_items ci on ci.collection_id = c.id
  group by h.id, h.name
  order by collection_count desc, h.name;

comment on view public.v_haus_collections_health is 'Collections and items per haus, incl. empty collections';

-- ============================================================
-- View: v_notification_volume
-- Notifications created per day and type over the last 30 days
-- (migration 014). A sudden spike for one type usually means a runaway
-- trigger.
-- ============================================================
create or replace view public.v_notification_volume as
  select
    created_at::date as day,
    type,
    count(*) as created,
    count(*) filter (where not read) as still_unread
  from public.notifications
  where created_at > now() - interval '30 days'
  group by created_at::date, type
  order by day desc, type;

comment on view public.v_notification_volume is 'Notifications per day/type, last 30 days, for spotting runaway triggers';

-- ============================================================
-- Access: views run with their owner's privileges and therefore bypass RLS.
-- Supabase grants new public objects to anon/authenticated by default, so
-- withhold these from client roles — read them from the SQL Editor or with
-- the service role only.
-- ============================================================
revoke all on public.v_rls_policy_status        from anon, authenticated;
revoke all on public.v_member_count_drift       from anon, authenticated;
revoke all on public.v_haus_collections_health  from anon, authenticated;
revoke all on public.v_notification_volume      from anon, authenticated;
