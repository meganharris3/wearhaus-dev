# Wearhaus Setup & Deployment Guide

Quick reference for setting up Wearhaus for development, preview, and production deployment.

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Environment Configuration](#environment-configuration)
3. [Local Development](#local-development)
4. [Supabase Setup](#supabase-setup)
5. [GitHub Actions Setup](#github-actions-setup)
6. [EAS Build Setup](#eas-build-setup)
7. [Deployment Checklists](#deployment-checklists)

---

## Initial Setup

### Prerequisites
- Node.js 18+ (use `nvm use` to switch versions)
- npm 8+ (comes with Node.js)
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Xcode (iOS) or Android Studio (Android) for native testing
- Git with GitHub access

### Clone & Install
```bash
cd /Users/meg/wearhaus
npm install
```

Verify setup:
```bash
npx tsc --noEmit    # Type check should pass
npm test            # Tests should run (no failures)
expo start          # Dev server should start
```

---

## Environment Configuration

### Development Environment (.env.local)
Create `.env.local` in the project root:
```bash
cp .env.development .env.local
```

Then edit `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_DEV_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_DEV_ANON_KEY
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_FEATURES_BETA_UI=true
EXPO_PUBLIC_FEATURES_CHAT_ENABLED=true
EXPO_PUBLIC_FEATURES_PAYMENT_ENABLED=true
```

Get these values from your Supabase project:
- Dashboard → Settings → API
- Copy "Project URL" and "anon public" key

### Preview Environment
Managed by GitHub Secrets (see [GitHub Actions Setup](#github-actions-setup) below).

### Production Environment
Environment variables injected at build time from GitHub Secrets. Never commit `.env.production` to version control.

---

## Local Development

### Start Dev Server
```bash
npm install            # First time only
npm start              # Start Expo development server
```

This starts the dev server on `localhost:8081`. You'll see a QR code in the terminal.

### Test on Expo Go
**iPhone/iPad:**
1. Open Expo Go app (from App Store)
2. Tap "Scan QR code"
3. Scan the QR code from terminal
4. App loads in Expo Go

**Android:**
1. Open Expo Go app (from Play Store)
2. Tap the QR scanner icon
3. Scan the QR code from terminal
4. App loads in Expo Go

### Test in Simulator/Emulator
Press `i` (iOS) or `a` (Android) in the dev server terminal to launch simulators.

### File Changes
The app automatically reloads when you save files (hot reload).

### Run Tests
```bash
npm test                    # Run all tests once
npm test -- --watch       # Watch mode (re-run on file change)
npm test -- --coverage    # Coverage report
```

### Type Check
```bash
npx tsc --noEmit          # Check for TypeScript errors
```

### Debug in DevTools
- Press `j` in dev server terminal to open Chrome DevTools
- Inspect elements, set breakpoints, check console logs

---

## Supabase Setup

### Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Enter project name (e.g., "wearhaus-dev")
4. Choose region (pick closest to you for dev, Europe for prod)
5. Set database password (save securely)
6. Click "Create new project" (waits 2-3 minutes)

### Get Project Credentials
1. Dashboard → Settings → API
2. Copy "Project URL"
3. Copy "anon public" key
4. Add to `.env.local`

### Apply Migrations

In Supabase dashboard:
1. Go to SQL Editor (left sidebar)
2. Create a new query
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Verify no errors (check "Results" tab)

Repeat for `002_security_fixes.sql` and `seed.sql` (optional for dev).

### Verify Setup
In SQL Editor, run:
```sql
select * from public.v_rls_policy_status;
```

Should show 4 rows, all with `rls_status = 'enabled'`.

### Configure Auth
1. Go to Authentication (left sidebar)
2. Click "Providers"
3. Enable "Email" (default, already enabled)
4. (Optional) Enable Google, Apple for OAuth

Users will sign up via email/password in the app.

---

## GitHub Actions Setup

### 1. Generate EXPO_TOKEN

In Expo CLI:
```bash
expo login
# Enter your Expo account credentials

expo publish:history
# This verifies you're logged in

expo tokens create --name "GitHub Actions"
# Generates a long token string
# Copy the token (shown once)
```

### 2. Add Secret to GitHub

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: (paste the token from above)
5. Click "Add secret"

### 3. Verify Workflow

1. Go to Actions tab in GitHub
2. Push a commit to main (or create a PR)
3. CI workflow should run automatically
4. All jobs should pass (lint, type-check, test)
5. On push to main, EAS build job should run

If any job fails:
- Click the job to see logs
- Fix the issue locally
- Commit and push again

---

## EAS Build Setup

### 1. Initialize EAS Project
```bash
cd /Users/meg/wearhaus
eas init
```

This creates `eas.json` (already done, no need to run again).

### 2. Configure iOS Credentials

```bash
eas credentials
```

Choose:
- Platform: iOS
- Option: Set up new credentials (recommended for first time)
- Follow prompts for Apple ID

This stores credentials securely in Expo servers (never committed to git).

### 3. Configure Android Credentials

```bash
eas credentials
```

Choose:
- Platform: Android
- Option: Set up new credentials
- Follow prompts for Google Play keystore

### 4. Test Local Build (Optional)

```bash
eas build --platform all --profile preview --local
```

This builds locally (requires Xcode/Android Studio). Good for testing before cloud build.

### 5. Cloud Build

```bash
eas build --platform all --profile preview --non-interactive
```

This queues a build on EAS servers (1-5 minutes). Progress shows in Expo dashboard.

When done:
- Android APK: Ready to download and install on device
- iOS: Link to TestFlight (needs tester email added first)

---

## Deployment Checklists

### Pre-Release Checklist (Dev → Preview)

- [ ] All tests pass: `npm test -- --coverage`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] Linting clean: `npx eslint . --ext .js,.jsx,.ts,.tsx`
- [ ] Features tested manually in Expo Go
- [ ] Feature flags set correctly (set beta features to false before release)
- [ ] Environment variables point to correct Supabase project
- [ ] No console.log() statements (unless intentional)
- [ ] No hardcoded API keys in code (use environment variables)
- [ ] PR reviewed by teammate
- [ ] Commit message is clear and descriptive

### Push to Main (Triggers EAS Preview Build)

```bash
git checkout main
git pull origin main
git merge --no-ff feature/my-feature
git push origin main
```

Then GitHub Actions automatically:
1. Runs lint + type check + tests
2. If all pass, starts EAS build
3. Build completes in 3-5 minutes
4. QA downloads APK from EAS dashboard and tests

### Release to Production

1. **Verify preview build is stable** (QA testing passed, no crashes)

2. **Create release branch**
   ```bash
   git checkout -b release/v1.0.0
   ```

3. **Update version**
   ```json
   // app.json
   "version": "1.0.0"
   ```

4. **Commit version bump**
   ```bash
   git add app.json
   git commit -m "Bump version to 1.0.0"
   ```

5. **Create production build**
   ```bash
   eas build --platform all --profile production --non-interactive
   ```

6. **Submit to stores**
   ```bash
   # Requires signing certificates configured in eas.json
   eas submit --platform all --profile production
   ```

7. **Monitor submission**
   - iOS: 1-2 days review (TestFlight first if beta testing)
   - Android: 1-4 hours review
   - Check Expo dashboard for submission status

### Rollback after Release

**Option A: OTA Update (Recommended for JS/TS changes)**
```bash
# If bug is in JavaScript code, don't need to resubmit to stores
eas update --branch production

# Roll back to previous version
eas update:list --branch production
# Find the good version ID, then:
eas update:republish --branch production --group <good_version_id>
```

Users see update within 15 seconds of app restart.

**Option B: Resubmit Native Build (For native code changes)**
1. Fix the bug in code
2. Create new production build: `eas build --platform all --profile production`
3. Resubmit to stores: `eas submit --platform all --profile production`
4. Wait for store review again (adds 1-2 days)

---

## Monitoring & Health Checks

### Weekly Health Check
Run this query in Supabase SQL Editor:
```sql
-- Item stats
select * from public.v_item_stats;

-- User activity
select count(*) as total_users from public.users;
select count(*) as total_items from public.items;

-- RLS policies
select * from public.v_rls_policy_status;
```

### Check Auth Metrics
1. Supabase dashboard → Auth
2. Look at "Sign-ups by Day" graph
3. Check for error spikes in logs

### Check Database Health
1. Supabase dashboard → Database
2. View CPU usage (should be < 50%)
3. View connection count (should be < 5)
4. View query performance (p95 latency < 200ms)

### Monitor App Crashes
1. Expo dashboard → Projects → wearhaus → Logs
2. Check for JavaScript errors or crashes
3. Fix and publish OTA update if critical

---

## Troubleshooting

### Build fails on GitHub Actions
**Error**: `EXPO_TOKEN not found`
- Solution: Add EXPO_TOKEN to GitHub Secrets (see [GitHub Actions Setup](#github-actions-setup))

**Error**: `npm ci fails`
- Solution: Verify Node.js 18+ is in .github/workflows/ci.yml
- Check package-lock.json is committed

**Error**: `TypeScript errors`
- Solution: Run `npx tsc --noEmit` locally to see errors
- Fix them and commit

### Supabase connection fails
**Error**: `401 Unauthorized`
- Solution: Check EXPO_PUBLIC_SUPABASE_ANON_KEY is correct in .env.local
- Copy from Supabase dashboard → Settings → API

**Error**: `RLS policy violation`
- Solution: Check user is authenticated (signed in)
- Run SQL: `select * from auth.users;` in Supabase to verify user exists

### EAS build fails
**Error**: `Credentials not found`
- Solution: Run `eas credentials` to set up iOS and Android credentials

**Error**: `Build timed out`
- Solution: Check EAS servers status: https://status.expo.io
- Retry build: `eas build --platform all --profile preview`

### App crashes on launch
**Error**: Crash in Expo Go
- Solution: Check browser console for errors (press `j` in dev server)
- Check .env.local has correct Supabase URL and key
- Verify migrations are applied to Supabase

### Can't sign up
**Error**: Auth error
- Solution: Check Supabase Auth is enabled: Dashboard → Authentication → Providers → Email
- Verify RLS policy allows insert on users table
- Check email doesn't already exist (unique constraint)

---

## Quick Reference Commands

```bash
# Development
expo start                          # Start dev server
npm test                            # Run tests
npm test -- --coverage              # Tests with coverage

# Type checking
npx tsc --noEmit                    # Check TypeScript
npx eslint . --ext .js,.jsx,.ts,.tsx  # Check linting

# EAS Build
eas build --platform all --profile development   # Dev build
eas build --platform all --profile preview       # QA build
eas build --platform all --profile production    # Release build

# EAS Update (OTA)
eas update --branch preview         # Push update to preview
eas update --branch production       # Push update to production
eas update:list --branch production # List recent updates

# Git
git checkout -b feature/my-feature   # Create feature branch
git push origin feature/my-feature   # Push to GitHub
git checkout main && git pull        # Sync with main
git merge --no-ff feature/my-feature # Merge feature
git push origin main                 # Trigger CI/build

# Supabase
# Access SQL Editor at: https://supabase.com/dashboard/project/PROJECT_ID/sql
# Access Logs at: https://supabase.com/dashboard/project/PROJECT_ID/logs
```

---

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment & runbook
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Architecture & design
- [supabase/README.md](./supabase/README.md) - Database & migration docs
- [Expo Docs](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Supabase Docs](https://supabase.com/docs)
