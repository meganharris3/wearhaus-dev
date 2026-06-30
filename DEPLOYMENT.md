# Wearhaus Deployment & Infrastructure Guide

## Table of Contents
1. [EAS Build Configuration](#eas-build-configuration)
2. [Supabase Migration Runbook](#supabase-migration-runbook)
3. [Development to Production Workflow](#development-to-production-workflow)
4. [Rollback Procedures](#rollback-procedures)
5. [Health Checks & Monitoring](#health-checks--monitoring)
6. [Feature Flags Pattern](#feature-flags-pattern)

---

## EAS Build Configuration

### Overview
Wearhaus uses EAS (Expo Application Services) for native builds across iOS and Android. Three build profiles are configured:

- **development**: Internal build for Expo Go testing
- **preview**: QA/testing builds distributed internally
- **production**: App Store and Play Store releases

### Configuration File
See `/Users/meg/wearhaus/eas.json` for the complete EAS configuration.

### Build Profiles

#### Development Profile
```
developmentClient: true
distribution: internal
```
Used for local testing in Expo Go before creating native modules. Deploy with:
```bash
eas build --platform all --profile development
```

#### Preview Profile
```
developmentClient: false
distribution: internal
```
Full native builds for internal QA. APK for Android (installable), simulator build for iOS.
```bash
eas build --platform all --profile preview
```

#### Production Profile
```
developmentClient: false
distribution: store
```
AAB for Google Play, archive for App Store. Submit to stores with:
```bash
eas submit --platform all --profile production
```

### Credentials Management
- iOS: Requires Apple ID and Team ID (configure in `eas.json` or set `credentialsSource: local`)
- Android: Requires Google Play service account JSON
- Store both securely in GitHub Secrets, not in version control

---

## Supabase Migration Runbook

### Prerequisites
- Supabase account with a new project created
- Database access to the project
- Project URL and anon key (from project settings)

### Step 1: Create a New Supabase Project
1. Log in to [Supabase](https://supabase.com)
2. Click "New project"
3. Enter project name (e.g., "wearhaus-prod")
4. Choose region (for latency optimization, select closest to your users)
5. Set a strong database password (save securely)
6. Click "Create new project" and wait for provisioning (2-3 minutes)

### Step 2: Apply Schema Migrations (Order Matters)
Migrations must be applied in exact order. Use the SQL Editor in Supabase dashboard:

#### Migration 001: Initial Schema
```sql
-- Copy the entire contents of /Users/meg/wearhaus/supabase/migrations/001_initial_schema.sql
```
Run this first. It creates:
- UUID extension
- ENUMs (item_status, membership_role)
- Tables (users, items, hauses, haus_memberships)
- Indexes for query performance
- RLS policies (initial)
- Triggers (auto user creation on signup, haus member count sync, updated_at)

**Verify**: Check the SQL Editor returns success. Confirm no errors.

#### Migration 002: Security Fixes
```sql
-- Copy the entire contents of /Users/meg/wearhaus/supabase/migrations/002_security_fixes.sql
```
Run after 001. This adds:
- Tightened RLS policies (WITH CHECK clauses)
- User column protection (prevent email/rating tampering)
- Public user profiles view (expose safe data)
- Membership role enforcement
- Performance indexes

**Verify**: Check that policies are updated in the RLS editor.

### Step 3: Run Seed Data (Optional for Dev/Preview)
```sql
-- Copy the entire contents of /Users/meg/wearhaus/supabase/seed.sql
```
Populates the database with 3 seed users, 2 hauses, 3 memberships, and 8 items for testing.

**Important**: Seed data uses hardcoded UUIDs that do NOT match real auth.users. These are test-only records. In production, omit the seed script.

### Step 4: Configure Auth Signup Trigger
The trigger `on_auth_user_created` automatically creates a public.users row when a user signs up via Supabase Auth. Verify:

1. Go to Supabase dashboard → Authentication → Triggers
2. Confirm trigger "on_auth_user_created" is active
3. If missing, it will be created by migration 001; no action needed

### Step 5: Verify RLS Policies are Active
In Supabase dashboard SQL Editor, run:
```sql
select * from public.v_rls_policy_status;
```

Expected output: All 4 tables have policy_count > 0 and rls_status = 'enabled'.

If any row shows policy_count = 0:
```sql
select * from pg_policies where tablename = 'table_name';
```
If empty, re-run the relevant migration step.

### Step 6: Set Environment Variables
Create or update `.env.local` (local dev) with:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Get these from Supabase dashboard:
- Settings → API → Project URL
- Settings → API → Anon public key

### Verification Checklist
- [ ] All 3 migrations applied in order without errors
- [ ] Seed data loaded (if dev/preview environment)
- [ ] `v_rls_policy_status` query returns all 4 tables enabled
- [ ] Auth signup trigger is active
- [ ] Environment variables set in .env.local
- [ ] Test signup: use Supabase Auth UI or Expo app to create a test user
- [ ] Confirm users table has a new row with the signed-up email

---

## Development to Production Workflow

### Phase 1: Local Development
1. **Start dev server**
   ```bash
   npm install
   expo start
   ```
2. **Open in Expo Go** (iOS/Android simulator or physical device)
   - Scan QR code with Expo Go app
   - Live reload enabled for instant feedback
3. **Test auth & database**: Sign up, create items, join hauses
4. **Run tests**
   ```bash
   npm test -- --coverage
   ```
5. **Type check**
   ```bash
   npx tsc --noEmit
   ```

### Phase 2: Expo Go Managed Testing
- Use for internal QA on real devices without rebuilding
- Supports all Expo SDK packages (no custom native modules)
- Push updates via EAS Update: `eas update --branch preview`
- Share link with team for device testing

### Phase 3: EAS Preview Build
Triggered automatically on push to `main` branch (see `.github/workflows/ci.yml`):
1. **GitHub Actions runs CI checks**
   - Type check
   - Jest tests
   - EAS build
2. **Build output**
   - Android: `.apk` file (install directly on devices)
   - iOS: Archive ready for TestFlight
3. **Install & test on devices**
   - Android: Download APK from EAS dashboard, install via ADB or USB
   - iOS: Use TestFlight link
4. **Verify**
   - Sign-up flow
   - Supabase auth integration
   - Item browsing, creation, filtering
   - Haus collective features

### Phase 4: Production Release
When ready to ship:
1. **Create release branch**
   ```bash
   git checkout -b release/v1.0.0
   ```
2. **Update version in app.json**
   ```json
   "version": "1.0.0"
   ```
3. **Create production build**
   ```bash
   eas build --platform all --profile production
   ```
4. **Review & sign**
   - iOS: Signing certificate & provisioning profile
   - Android: Play Store signing key
5. **Submit to stores**
   ```bash
   eas submit --platform all --profile production
   ```
   - iOS: TestFlight review → App Store review (1-2 days)
   - Android: Automated review (1-4 hours)
6. **Monitor**
   - Check crash rates in Expo dashboard
   - Monitor Supabase auth and database metrics
   - Alert on increase in error rates

### Continuous Deployment with EAS Update (OTA)
For non-native code changes (JS/TS, styling, component updates):
1. **Make code change** (no native module changes)
2. **Test locally** with Expo Go
3. **Commit to main**
4. **Create OTA update**
   ```bash
   eas update --branch production
   ```
5. **Rollout to all users** (instant, no app store review needed)

---

## Rollback Procedures

### OTA Update Rollback (EAS Update)
If a bad JS/TS/styling change ships:
```bash
# List recent updates
eas update:list --branch production

# Get the previous working update ID
# Then revert to it
eas update:republish --branch production --group <previous_update_id>
```
Users see rollback within 15 seconds of app restart.

### Native Build Rollback (App Store / Play Store)
If a native build has critical bugs (rare, since preview catches most):

#### Android
1. Go to Google Play Console
2. Select app → Release → Manage releases
3. Find the bad release → Halt rollout
4. Find previous good release → Resume it

#### iOS
1. Go to App Store Connect
2. Select app → Version/Release Management
3. Find the bad version → Click "Reject This Binary"
4. Resubmit the previous version

### Database Migration Rollback (Supabase)
If a migration introduces a breaking change:
1. **Local testing**: Test rollback script on preview environment
2. **Backup production DB**: Supabase dashboard → Database → Backups
3. **Run rollback migration**
   ```sql
   -- Carefully craft and test a migration that reverses the change
   -- Example: if a column was added, drop it
   ```
4. **Update app code** to match the rolled-back schema
5. **Test thoroughly** in dev/preview before deploying

---

## Health Checks & Monitoring

### Supabase Dashboard Queries
Run these in the SQL Editor to monitor app health:

#### 1. Item Stats by Status
```sql
select * from public.v_item_stats;
```
Expected: 
- `available`: majority of items
- `lent`: active rentals
- `wash`: items being cleaned

Alert if available drops below 60% (suggests RLS issue).

#### 2. User Activity
```sql
select * from public.v_user_activity
order by items_listed desc
limit 10;
```
Shows top listers and renters. Alert if all users have 0 items.

#### 3. Haus Collective Health
```sql
select * from public.v_haus_health;
```
Monitor member count, available items per house. Alert if a house drops below 3 members.

#### 4. RLS Policy Status
```sql
select * from public.v_rls_policy_status;
```
All should show `rls_status = 'enabled'`. If not, a migration may have failed.

### Key Metrics to Monitor
| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| Auth signup success rate | > 95% | < 90% |
| DB query latency (p95) | < 200ms | > 500ms |
| RLS policy denials | 0-1% of requests | > 5% |
| Crash rate (Expo dashboard) | < 0.1% | > 1% |
| Item availability ratio | > 60% | < 40% |

### Log Monitoring (Supabase)
1. Dashboard → Logs → Auth logs: Check for failed signups
2. Dashboard → Logs → Database logs: Check for query errors
3. Dashboard → Logs → Realtime logs: Monitor WebSocket connections (if using Supabase Realtime)

### Set Up Alerts (Recommended)
Use Supabase's built-in alerting or third-party services (e.g., DataDog, New Relic):
- Alert on auth error rate spike
- Alert on DB query latency spike
- Alert on RLS policy rejections
- Alert on connection pool exhaustion

---

## Feature Flags Pattern

Since Wearhaus has no dedicated feature flag system, use the `app.json` `extra` field for simple feature control.

### Configuration in app.json
```json
{
  "expo": {
    "name": "Wearhaus",
    "slug": "wearhaus",
    "version": "1.0.0",
    "extra": {
      "features": {
        "hausChatEnabled": false,
        "socialShareEnabled": true,
        "paymentIntegrationEnabled": false,
        "betaUIEnabled": false
      },
      "environment": "production"
    }
  }
}
```

### Usage in App Code
```typescript
import Constants from 'expo-constants';

const features = Constants.expoConfig?.extra?.features || {};

if (features.hausChatEnabled) {
  // Render chat UI
}

if (features.socialShareEnabled) {
  // Render share buttons
}
```

### Deployment Flow
1. **Before release**: Set flags to `false` for unreleased features
2. **Feature complete**: Build with `betaUIEnabled: true` in dev build
3. **Ready to ship**: Set all flags to final values
4. **Publish OTA**: `eas update --branch production`
5. **Rollback if needed**: Republish with flags reverted

### Pros & Cons
**Pros**: Simple, no external dependencies, fast rollback
**Cons**: Requires rebuild/redeploy to toggle; doesn't scale to 100+ flags

For production with 10+ concurrent features, consider:
- LaunchDarkly SDK (recommended for React Native)
- Configcat (simpler alternative)
- Supabase Edge Functions + custom API for dynamic flags

---

## GitHub Actions CI Workflow

Located in `.github/workflows/ci.yml`. Triggered on:
- Push to `main`
- Pull request to `main`

### Jobs

#### 1. lint-and-type-check
```bash
npm ci
npx tsc --noEmit
npx eslint . --ext .js,.jsx,.ts,.tsx
```
- Fails PR if TypeScript errors
- ESLint warnings non-blocking (exit code 0)

#### 2. test
```bash
npm ci
npm test -- --coverage --ci
```
- Jest tests with coverage reporting
- Uploads coverage to Codecov (optional)
- Fails if tests fail

#### 3. eas-preview (main branch only)
```bash
eas build --platform all --profile preview --non-interactive
```
- Runs only on push to `main` (not PR)
- Requires `EXPO_TOKEN` secret set in GitHub
- Builds Android APK + iOS simulator archive

### Setup GitHub Actions

#### 1. Add EXPO_TOKEN Secret
```bash
# Generate token in Expo dashboard: https://expo.dev/settings/tokens
# Then in GitHub repo: Settings → Secrets and variables → Actions → New repository secret
# Name: EXPO_TOKEN
# Value: <paste your token>
```

#### 2. Verify Workflow Triggers
- Push to main: All 3 jobs run
- Pull request: Only lint-and-type-check + test jobs run

#### 3. Monitor Builds
- GitHub: Actions tab shows build status & logs
- Expo dashboard: Shows EAS build progress in real-time

---

## Security Best Practices

### Supabase
- [ ] Enable row-level security on all tables (done in migrations)
- [ ] Use service_role key only in backend (not in app)
- [ ] Store anon key in .env.local (safe, scoped to RLS policies)
- [ ] Enable database backups (Supabase daily backups included)
- [ ] Monitor for RLS policy bypasses
- [ ] Audit user email verification (consider mandatory email confirmation)

### EAS Builds
- [ ] Never commit API keys or secrets to git
- [ ] Use GitHub Secrets for EXPO_TOKEN
- [ ] Rotate credentials annually
- [ ] Use local credentialsSource for iOS/Android signing

### GitHub Actions
- [ ] Limit EXPO_TOKEN scope (token can trigger builds)
- [ ] Use branch protection rules (require CI to pass)
- [ ] Sign commits (use GPG or SSH)
- [ ] Audit workflow permissions

### App Code
- [ ] Never log sensitive data (passwords, tokens)
- [ ] Use secure storage for auth tokens (AsyncStorage is not cryptographically secured; consider expo-secure-store)
- [ ] Validate input on Supabase RLS level (first line of defense)
- [ ] Implement rate limiting on auth endpoints (Supabase has built-in limits)

---

## Troubleshooting

### Build fails on GitHub Actions
1. Check EXPO_TOKEN is set in Secrets
2. Verify `npm ci` succeeds locally
3. Check TypeScript errors: `npx tsc --noEmit`
4. Review EAS build logs in Expo dashboard

### Supabase migrations fail
1. Ensure migrations run in order (001, 002, seed)
2. Check that anon key has execute permission on functions
3. Verify service_role key has full database access
4. Review PostgreSQL error in SQL Editor output

### RLS policies blocking reads
1. Run `select * from public.v_rls_policy_status;`
2. If policy_count = 0, re-run the migration
3. Verify auth.role() = 'authenticated' is set (not 'anon')
4. Check with service_role key to bypass RLS for debugging

### Auth token expires
1. Supabase refresh tokens expire after 7 days by default
2. App should use `session.refresh_session()` before expiry
3. Implement token refresh in useEffect on app startup
4. Fall back to login if refresh fails

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [React Navigation Docs](https://reactnavigation.org)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
