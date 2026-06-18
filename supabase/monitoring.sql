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
-- Run periodically to confirm all policies are active
-- ============================================================
create or replace view public.v_rls_policy_status as
  select
    t.tablename,
    (select count(*) from pg_policies where tablename = t.tablename) as policy_count,
    case
      when (select count(*) from pg_policies where tablename = t.tablename) > 0 then 'enabled'
      else 'disabled'
    end as rls_status
  from (values ('users'), ('items'), ('hauses'), ('haus_memberships')) as t(tablename)
  order by t.tablename;

comment on view public.v_rls_policy_status is 'RLS policy audit for security monitoring';
