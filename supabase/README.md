# Wearhaus Supabase Configuration

This directory contains Supabase database schema, migrations, and monitoring configuration.

## Directory Structure

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql      # Initial schema: tables, indexes, RLS, triggers
│   └── 002_security_fixes.sql      # Security hardening: policies, protections
├── seed.sql                         # Test data (dev/preview only)
├── monitoring.sql                   # Health check views
└── README.md                        # This file
```

## Quick Start

### 1. Create New Supabase Project
- Go to https://supabase.com
- Create a new project
- Choose a region (pick closest to your users for latency)
- Note the Project URL and Anon Key

### 2. Apply Migrations
In the Supabase SQL Editor (dashboard):

```bash
# Step 1: Run migration 001 (copy entire file)
cat supabase/migrations/001_initial_schema.sql | pbcopy
# Paste in SQL Editor, run

# Step 2: Run migration 002
cat supabase/migrations/002_security_fixes.sql | pbcopy
# Paste in SQL Editor, run

# Step 3: Run seed (optional, dev only)
cat supabase/seed.sql | pbcopy
# Paste in SQL Editor, run
```

### 3. Run Monitoring Setup
```bash
# Import the monitoring views
cat supabase/monitoring.sql | pbcopy
# Paste in SQL Editor, run
```

### 4. Verify Setup
```bash
# In SQL Editor, run:
select * from public.v_rls_policy_status;
```

All 4 rows should show `rls_status = 'enabled'`.

## Migration Philosophy

### Migrations Must Be:
1. **Idempotent**: Running twice should be safe (`create if not exists`)
2. **Ordered**: Always apply in sequence (001 → 002 → ...)
3. **Documented**: Comment explains what changed and why
4. **Tested**: Test locally in dev environment first

### Running Migrations

#### Development/Preview Environment
1. SQL Editor in Supabase dashboard
2. Copy migration file contents
3. Paste and run in SQL Editor
4. Verify no errors

#### Production Environment
1. Create a backup: Supabase dashboard → Database → Backups
2. Test migration in preview environment first
3. Apply during low-traffic window (if possible)
4. Monitor database performance after migration
5. Keep rollback SQL script nearby

### Rollback Strategy

If a migration breaks the schema:

1. Create a rollback migration (e.g., `003_rollback.sql`)
2. Test it in dev environment
3. Apply to preview, verify all still works
4. Apply to production after backup

Example rollback (if 002 added a column):
```sql
-- In 003_rollback.sql
alter table public.items drop column if exists new_column;
```

## Schema Overview

### Tables
- **users**: User profiles linked to Supabase Auth
- **items**: Rental items (clothing, accessories, etc.)
- **hauses**: Collective groups of users sharing closets
- **haus_memberships**: Membership in hauses with roles

### Key Features
- UUID primary keys (globally unique, collision-free)
- Row-level security on all tables (RLS enabled)
- Automatic timestamps (created_at, updated_at)
- Referential integrity (ON DELETE CASCADE)
- Optimized indexes for common queries

### Security
- RLS policies enforce per-row access control
- Users can only read/update their own data
- Admins can manage haus settings
- Public read-only views expose safe data

See `/Users/meg/wearhaus/DEPLOYMENT.md` for full details.

## Monitoring

### Health Check Views
```sql
-- Item stats by status
select * from public.v_item_stats;

-- User activity and engagement
select * from public.v_user_activity order by items_listed desc;

-- Haus collective health
select * from public.v_haus_health;

-- RLS policy verification
select * from public.v_rls_policy_status;
```

Run these weekly to track platform health.

## Common Tasks

### Add a New Table
1. Create migration file: `supabase/migrations/003_add_feature.sql`
2. Define table with UUID primary key, timestamps, indexes
3. Enable RLS: `alter table public.new_table enable row level security`
4. Create policies for read/insert/update/delete
5. Test in dev environment
6. Apply to preview, then production

### Add a Column
```sql
alter table public.items add column new_field text;
alter table public.items alter column new_field set default 'some default';
```

### Create an Index
```sql
create index idx_items_new_field on public.items(new_field);
```

Use single-column indexes for equality filters, composite indexes for range + filter.

### Enable Row-Level Security
```sql
alter table public.new_table enable row level security;

-- Add policies
create policy "authenticated read" on public.new_table
  for select
  using (auth.role() = 'authenticated');

create policy "owner insert" on public.new_table
  for insert
  with check (auth.uid() = user_id);
```

## Performance Optimization

### Query Performance
- Use Supabase dashboard → Logs → Database logs to find slow queries
- Add indexes on columns used in WHERE clauses
- Monitor connection count (Settings → Database)
- Use views (like `v_item_stats`) for pre-aggregated data

### Connection Pool
- Supabase includes connection pooling (default 10 connections)
- Monitor in dashboard → Database → Pooling
- If hitting limits, scale the instance

## Backup & Recovery

### Automatic Backups
- Supabase backs up daily (keep 30 days)
- Access: Dashboard → Database → Backups
- One-click restore to any point in time

### Manual Backup
```sql
-- Export schema and data
pg_dump -h <host> -U postgres -d postgres > backup.sql

-- Or use Supabase UI: Database → Backups → Download
```

### Restore from Backup
- Dashboard → Database → Backups → Select backup → Restore
- Restores to a new database instance
- You'll need to update connection strings after restore

## Useful Supabase Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Auth Documentation](https://supabase.com/docs/guides/auth)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor](https://supabase.com/dashboard/project/_/sql)
- [Logs Viewer](https://supabase.com/dashboard/project/_/logs)

## Troubleshooting

### RLS policies blocking reads
- Confirm user is authenticated (not anon)
- Check policy uses correct auth.role() or auth.uid()
- Test with service_role key to bypass RLS temporarily

### Trigger not firing
- Confirm trigger is created (check in Functions)
- Verify table has RLS enabled
- Test trigger manually: `select * from pg_triggers where tgname = 'trigger_name'`

### Migration failed to apply
- Check SQL syntax in editor
- Verify migration runs in correct order
- Look for constraint violations (unique, foreign keys)
- Check function permissions (security definer vs definer)

### Connection issues
- Verify Supabase URL and Anon Key are correct
- Check CORS settings if using from browser
- Ensure auth token is not expired
- Monitor connection pool usage
