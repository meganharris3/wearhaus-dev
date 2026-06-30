# Wearhaus Infrastructure Architecture

## Overview

Wearhaus is a React Native (Expo) mobile app with a PostgreSQL backend on Supabase. The infrastructure is designed for zero-downtime deployments, security, and developer experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Store / Play Store                    │
│                    (Native binaries, signed)                      │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                    EAS Submit (distribution)
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                     EAS Build Service                            │
│              (Expo Application Services)                         │
│  Builds: Android AAB, iOS Archive (signed)                       │
│  Triggers: GitHub Actions on push to main                        │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                    GitHub Actions CI Pipeline
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Repository                              │
│                                                                   │
│  main branch:  type-check → test → eas build → (deploy) ready   │
│  PR branches:  type-check → test (no build)                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                    Developer commits & PR reviews
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                      App Code                                    │
│                                                                   │
│  React Native + Expo SDK 51                                      │
│  Navigation: React Navigation v6                                 │
│  State: React Context / AsyncStorage                             │
│  Testing: Jest + React Native Testing Library                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                    ↓              ↓              ↓
        ┌───────────────────────────────────────────────┐
        │                                               │
    ↓ ↓ ↓                                           ↓ ↓ ↓
│ Supabase Cloud │                          │ Device Storage │
│                 │                          │                 │
│ - Auth          │  ← API calls             │ - AsyncStorage  │
│ - PostgreSQL    │     (realtime socket)    │ - Secure Store  │
│ - RLS Policies  │                          │                 │
│ - Backups       │                          │                 │
└─────────────────┘                          └─────────────────┘
```

## Technology Stack

### Frontend
- **Runtime**: React Native 0.74, Expo SDK 51
- **Language**: TypeScript 5.3
- **Navigation**: React Navigation v6 (bottom tabs, native stack)
- **State Management**: React Context API + AsyncStorage
- **UI Components**: Expo Vector Icons, React Native built-ins
- **Testing**: Jest 29, React Native Testing Library
- **Build System**: Expo / EAS Build

### Backend
- **Database**: PostgreSQL (Supabase managed)
- **Auth**: Supabase Auth (email/password, social OAuth ready)
- **Security**: Row-Level Security (RLS) policies on all tables
- **API**: Supabase REST API + JS client (@supabase/supabase-js v2)
- **Monitoring**: Supabase dashboard logs, custom health check views

### CI/CD
- **Version Control**: GitHub
- **Build Orchestration**: EAS (Expo Application Services)
- **CI Pipeline**: GitHub Actions
- **Distribution**: 
  - Internal: EAS internal distribution
  - Production: App Store + Google Play Store

### Infrastructure
- **Cloud**: Supabase (managed PostgreSQL, Auth, realtime)
- **CDN**: Supabase Realtime via WebSocket
- **Backups**: Supabase automated daily + point-in-time recovery
- **Monitoring**: Supabase dashboard + custom SQL views

## Deployment Pipeline

### Stage 1: Development
- Developer checks out feature branch
- `npm install` installs dependencies
- `expo start` runs dev server with live reload
- Tests run locally: `npm test`
- Type check: `npx tsc --noEmit`

### Stage 2: Code Review
- Push branch to GitHub
- Create Pull Request
- GitHub Actions runs:
  - Type check
  - Jest tests
  - ESLint (warnings only)
- Code review by team
- Merge to main when approved

### Stage 3: Build & QA
- Push to main triggers GitHub Actions
- All CI jobs run (lint, test)
- EAS Build starts:
  - Android: Builds APK + AAB
  - iOS: Builds archive for TestFlight
- QA team downloads preview builds from EAS dashboard
- Tests on real devices (sign-up, items, hauses, etc.)
- Smoke tests in preview environment

### Stage 4: Release
- Tag release: `git tag v1.0.0`
- Create production build: `eas build --profile production --non-interactive`
- Review build artifacts in EAS dashboard
- Submit to App Store: `eas submit --platform ios`
- Submit to Play Store: `eas submit --platform android`
- Monitor crash rates and auth success rates

### Stage 5: Maintenance
- Monitor via Supabase dashboard
- Run health check queries weekly
- Apply emergency OTA updates if needed: `eas update --branch production`
- Collect crash reports from Supabase logs

## Database Schema Architecture

### Entities & Relationships

```
auth.users (Supabase Auth)
    ↓ creates
public.users (our user profile table)
    ├→ owns → public.items (rentals)
    └→ member of → public.haus_memberships
                       ↓ joins
                    public.hauses
```

### Key Design Decisions

1. **Denormalized User Stats**: `users.items_listed`, `users.rentals_completed`
   - Updated manually via app (could be triggers in future)
   - Enables fast user profile reads without joins

2. **Haus Membership Sync Trigger**: `sync_haus_member_count()`
   - Keeps `hauses.member_count` in sync with membership inserts/deletes
   - Denormalized for fast haus list sorting

3. **RLS Policies**:
   - Users: Authenticated read, owner-only update/insert
   - Items: Authenticated read, owner-only write
   - Hauses: Authenticated read, member-only update
   - Haus memberships: Self-insert (user_id = auth.uid()), self-delete

4. **Indexes for Common Queries**:
   ```
   idx_items_status_created       → Browse available items by created_at
   idx_items_owner_id             → User's items list
   idx_items_name_search          → Full-text search (GIN index)
   idx_items_category             → Filter by category (dress, shoes, etc.)
   idx_items_price_status         → Range + filter queries
   idx_memberships_haus_id        → List members of a haus
   idx_memberships_user_id        → User's haus memberships
   ```

### Trigger Architecture

1. **on_auth_user_created**: When user signs up via Supabase Auth, auto-create public.users row
2. **trg_haus_member_count**: When membership added/deleted, sync parent haus.member_count
3. **trg_*_updated_at**: When any row updated, refresh updated_at timestamp

## Security Architecture

### Authentication
- **Method**: Supabase Auth (JWT tokens)
- **Session**: Stored in AsyncStorage (app restarts need re-auth after 7 days)
- **Token Refresh**: Automatic via @supabase/supabase-js
- **Future**: Add expo-secure-store for encrypted credential storage

### Authorization (Row-Level Security)
- **All tables RLS enabled**: Users can only access their own data
- **Authenticated role**: Only logged-in users can query
- **Service role bypass**: For admin operations (backups, migrations)
- **Column-level**: `user_profiles` view exposes safe columns (hides email)

### Data Protection
- **Passwords**: Supabase Auth handles hashing (bcrypt)
- **Sensitive fields**: `users.email`, `users.rating` protected by trigger (can't self-mutate)
- **API Keys**: Anon key in app (RLS enforced), service key only in backend
- **Backups**: Daily automated, 30-day retention, encrypted at rest

### Network Security
- **HTTPS only**: All Supabase API calls use TLS
- **CORS**: Configured for Expo app domain
- **Rate limiting**: Supabase Auth has built-in auth endpoint limits
- **DDoS**: Cloudflare protection (Supabase uses it)

## Scaling Considerations

### Current Limits
- Supabase free tier: 500 MB database, no scaling limits on API
- iOS/Android: Test on real devices (emulator/simulator not required)
- App size: Expo managed, ~50 MB download

### Scaling Path

#### Phase 1: 100-1,000 Users
- Current single Supabase instance sufficient
- Monitor connection pool (default 10)
- Enable query caching at app level (AsyncStorage)
- No changes needed

#### Phase 2: 1,000-10,000 Users
- Upgrade Supabase to paid plan
- Monitor query latency (p95 < 200ms)
- Consider read-only replica for analytics queries
- Implement pagination (currently assumes items list < 1,000)

#### Phase 3: 10,000+ Users
- Add Supabase read replicas for geo-distribution
- Implement Redis cache layer (simple caching at app level is manual)
- Shard haus database (each haus is independent, can be separate databases)
- Consider GraphQL layer for complex queries (use Hasura on Supabase)

### Performance Optimization

1. **Query Performance**
   - Use indexes (already defined in migrations)
   - Paginate large result sets
   - Use `select count(*)` sparingly (expensive on large tables)

2. **Connection Pool**
   - Default: 10 connections
   - Monitor in Supabase dashboard → Database → Pooling
   - If needed, upgrade plan or use connection pooling service

3. **Network Performance**
   - App caches items in AsyncStorage (refreshed on pull-to-refresh)
   - Reduce payload: select specific columns, not `select *`
   - Use compression (Supabase gzip by default)

## Disaster Recovery

### Backup Strategy
- **Frequency**: Supabase daily automated backups
- **Retention**: 30 days point-in-time recovery
- **Recovery time**: < 1 hour (one-click restore in Supabase UI)
- **Testing**: Monthly restore test to separate database

### Disaster Scenarios

#### Scenario 1: App data corruption
1. Identify affected tables
2. Restore from backup (point-in-time)
3. Update app code if needed (rollback OTA)
4. Verify data integrity before releasing to users

#### Scenario 2: Critical bug in production
1. Option A: OTA update (JS/TS code changes)
   - `eas update --branch production` with fix
   - Users see it within 15 seconds
2. Option B: Rollback EAS build (native changes)
   - Halt bad release in app store
   - Resubmit previous good version

#### Scenario 3: Auth provider issue
1. Supabase Auth failover: Automatic, no action needed
2. If Supabase down: App can't authenticate new users, but existing tokens work
3. Mitigation: Cache user data locally, show "offline mode" message

#### Scenario 4: Database access control issue
1. Audit RLS policies: `select * from pg_policies;`
2. Re-apply migration with corrected policies
3. Test in preview environment first
4. Apply to production during low-traffic window

## Cost Model

### Monthly Costs (Estimated for 1,000 Users)

| Component | Cost | Notes |
|-----------|------|-------|
| Supabase (Pro) | $25 | Database, Auth, realtime |
| Storage (1 GB) | $0 | Included in Pro |
| Edge Functions | $0 | Not used yet |
| **Total** | **$25** | |

### Cost Optimization

1. **Database**: Compression enabled, no expensive queries
2. **Auth**: Supabase Auth cheaper than third-party providers
3. **Storage**: No object storage yet (use app bundle for images)
4. **API**: REST API usage free (included in plan)

### Growth Projections

- **10,000 users**: $50/month (upgrade to $100 plan for higher limits)
- **100,000 users**: $200-500/month (enterprise plan)
- **1M+ users**: Custom pricing (enterprise Supabase + CDN)

## Observability & Monitoring

### Monitoring Dashboards

1. **Supabase Dashboard**
   - Database health: CPU, memory, connections
   - Auth metrics: Sign-ups, active sessions, errors
   - API metrics: Response times, error rates
   - Logs: SQL queries, auth events, realtime connections

2. **Custom Health Checks** (SQL views in monitoring.sql)
   ```sql
   select * from public.v_item_stats;        -- Item availability
   select * from public.v_user_activity;     -- User engagement
   select * from public.v_haus_health;       -- Collective health
   select * from public.v_rls_policy_status; -- Security audit
   ```

3. **GitHub Actions**
   - Build status: Pass/fail per commit
   - Test coverage trends
   - EAS build logs in Expo dashboard

### Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API response time (p95) | < 200ms | > 500ms |
| Auth success rate | > 99% | < 95% |
| Database connections | < 8/10 | > 9/10 |
| Crash rate | < 0.1% | > 1% |
| RLS policy violations | 0% | > 1% |

### Alerting (Recommended Setup)

1. **Supabase Alerts** (built-in)
   - Database CPU > 80%
   - Connection pool > 90%
   - Auth errors spike

2. **GitHub Alerts**
   - Build failure on main
   - Test coverage drop

3. **Third-party** (optional)
   - Sentry for app crash reporting
   - DataDog for unified metrics
   - PagerDuty for on-call alerting

## Team Responsibilities

### Developers
- Write tests, follow TypeScript conventions
- Run `npm test` before committing
- Review pull requests for security/performance
- Deploy OTA updates for critical fixes

### QA
- Test preview builds on real devices
- Verify all user flows before release
- Monitor app store reviews for crashes
- Report bugs with reproduction steps

### DevOps/Infrastructure
- Monitor Supabase health dashboard
- Apply database migrations to production
- Manage GitHub Secrets (API keys, tokens)
- Plan scaling and disaster recovery

### Product
- Decide feature flags and rollout strategy
- Monitor analytics (app usage, retention)
- Plan release schedule (weekly, bi-weekly)

## Compliance & Privacy

### Data Storage
- PostgreSQL on Supabase (EU or US region configurable)
- GDPR: Supabase compliant, right-to-deletion via RLS
- CCPA: User data export via SQL query

### Authentication
- Email/password: Users control credentials
- Social OAuth: Supported but not implemented yet
- Session tokens: JWT with 7-day expiry

### Logging
- Supabase logs auth events (configurable retention)
- App crash logs: None collected (add Sentry if needed)
- Database query logs: Available for audit

## References

- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **React Native Testing**: https://testing-library.com/docs/react-native-testing-library/intro
