# Wearhaus — Handoff Summary

---

## What Was Built

Wearhaus is a peer-to-peer clothing rental app for college students, built with React Native (Expo managed workflow) and Supabase. The app includes five main screens (Home, Explore, My Closet, Hauses, Profile), an Item Detail screen, and full email/password authentication. A custom design system — Barlow and Inter fonts, eight ivory/yellow/ink color tokens, and a 2px border radius — is applied consistently across every screen. Supabase provides the PostgreSQL database (items, users, hauses, memberships tables), Row Level Security, and auth. The project is runnable from `expo start` with no build step; it is also wired for EAS Build and GitHub Actions CI when production distribution is needed.

---

## How to Run It (Quickstart)

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd wearhaus
   ```

2. **Set environment variables** — copy the template and fill in your Supabase project values:
   ```bash
   cp .env.example .env.local
   # Edit .env.local:
   # EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   # EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   Both values are in the Supabase dashboard under **Project Settings → API**.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the dev server**
   ```bash
   npx expo start
   ```

5. **Open on device** — install the [Expo Go](https://expo.dev/client) app on iOS or Android, then scan the QR code printed in the terminal. The app will load over your local network.

> Without `.env.local`, the app still launches and shows mock data on every screen. Real Supabase data requires steps 2 and the database setup below.

---

## Supabase Setup

Before live data queries will work, complete these steps in the Supabase dashboard:

1. **Create a new project** at [supabase.com](https://supabase.com). Note the project URL and anon key.

2. **Run migrations** — open the SQL Editor and run the files in order:
   - `supabase/migrations/001_initial_schema.sql` — creates all tables, indexes, RLS policies, and triggers
   - `supabase/migrations/002_security_fixes.sql` — tightens update policies, adds column protection trigger, adds category and price indexes

3. **Run seed data** (optional, dev/demo only):
   - `supabase/seed.sql` — inserts 3 users, 2 hauses, 3 memberships, 8 items

4. **Enable email auth** — in **Authentication → Providers**, ensure "Email" is enabled. For development, disable "Confirm email" so accounts are immediately active after signup.

5. **Verify RLS** — in **Table Editor**, confirm that Row Level Security is toggled ON for `users`, `items`, `hauses`, and `haus_memberships`. The migrations enable RLS automatically, but it is worth confirming in the dashboard.

---

## What Is Wired to Real Data vs. Mock

| Screen | Data source | Notes |
|---|---|---|
| **Home** | `fetchFeedItems(category)` — live Supabase query | Falls back to `MOCK_ITEMS` constant if Supabase is unconfigured |
| **Explore** | `searchItems(params)` — live Supabase query | Falls back to `MOCK_ITEMS` |
| **My Closet** | `fetchMyItems(userId, tab)` — live Supabase query | Falls back to `MOCK_ITEMS`; requires logged-in user |
| **Hauses** | `fetchMyHauses(userId)` — live Supabase query | Falls back to `MOCK_HAUSES` |
| **Profile** | `useAuth().profile` from `AuthContext` — live Supabase profile row | No separate screen-level fetch; profile is loaded at login |
| **Item Detail** | Route param `item` (passed from card tap) + optional `fetchItemById(id)` on mount | Item data is already available from the parent screen's fetch; `fetchItemById` hydrates the extended `owner` fields (rating, university) |
| **Login / Signup** | `supabase.auth.signInWithPassword` / `supabase.auth.signUp` — always live | No mock path; screens show an error if Supabase is unreachable |
| **Bell icon (Home masthead)** | Hardcoded count: `3` | Decorative only; no notifications table |
| **Profile stats** | Live from `profile.items_listed`, `profile.rentals_completed`, `profile.rating` | Values are updated by service-role only (see `trg_protect_user_columns`) |

---

## Known Limitations

These items were deferred during development. They are documented as medium- and low-priority follow-ups.

**Medium priority**

- **Search debounce not implemented** — the Explore screen re-queries Supabase on every keystroke as the user types. This should be wrapped in a 300ms debounce to avoid hammering the API and to prevent stale results from out-of-order responses. The architecture document notes `debounced (300ms)` as the intended behavior.

- **FlatList performance tuning** — `getItemLayout`, `keyExtractor`, `removeClippedSubviews`, and `maxToRenderPerBatch` props are not set. On lists longer than 20–30 items (likely in production), frame drops will be visible during fast scrolling. These are one-line additions per FlatList.

**Low priority**

- **Token storage** — session JWT and refresh token are stored in `AsyncStorage`, which is not encrypted on device. For an app distributed on the App Store or Google Play, these should be moved to `expo-secure-store` (iOS Keychain / Android Keystore). This requires a dev client build (EAS Build with a development profile), not Expo Go.

- **Error message scrubbing** — Supabase error messages are surfaced verbatim to the user (e.g., `"invalid input syntax for type uuid"`). Before production, a scrubbing layer should map internal error strings to user-friendly messages and log the raw error to a monitoring service (e.g., Sentry).

---

## Suggested Next Features

- **Rental booking flow** — a calendar-based availability picker, booking confirmation screen, and a `rentals` table to track active loans. This is the most direct path to making the app functional end-to-end. The "Rent Now" CTA on Item Detail is the entry point.

- **Image upload** — allow users to photograph items from their camera roll when creating a listing. Supabase Storage can host the images; `expo-image-picker` provides the camera-roll interface and is Expo Go compatible.

- **Push notifications** — notify lenders when a rental request is received and notify borrowers when an item is confirmed. Requires EAS Build (dev client) to access APNs/FCM via `expo-notifications`. The bell icon in the masthead is already in place as a visual placeholder.

- **Real-time chat** — a DM thread between lender and borrower to coordinate pickup. Supabase Realtime subscriptions make the message delivery side straightforward; the main work is the UI thread and a `messages` table.

---

## File Map

### Theme and design system

| File | Purpose |
|---|---|
| `src/theme/colors.ts` | 8 color tokens: `ivory`, `ivoryDark`, `ivoryMid`, `yellow`, `yellowBorder`, `yellowText`, `ink`, `muted` |
| `src/theme/typography.ts` | 5 font face constants mapping to loaded Google Font names |
| `src/theme/spacing.ts` | Spacing scale: `xs` (4) through `xxl` (48) |
| `src/theme/index.ts` | Unified `theme` export: `{ colors, fonts, spacing, borderRadius: 2 }` |

### Navigation

| File | Purpose |
|---|---|
| `src/navigation/RootNavigator.tsx` | Auth gate: renders `AuthStack` or `AppStack` based on session state |
| `src/navigation/AuthStack.tsx` | Login → Signup stack (no headers) |
| `src/navigation/AppTabs.tsx` | 5-tab bottom navigator with Ionicons and ivory tab bar |
| `src/navigation/AppStack.tsx` | Wraps `AppTabs` and adds the `ItemDetail` push screen |

### Screens

| File | Purpose |
|---|---|
| `src/screens/auth/LoginScreen.tsx` | Email/password login; inline error display |
| `src/screens/auth/SignupScreen.tsx` | Display name + email + password signup |
| `src/screens/home/HomeScreen.tsx` | Feed with category pill tabs and 2-col item grid |
| `src/screens/explore/ExploreScreen.tsx` | Live-search with filter chips and results count |
| `src/screens/closet/ClosetScreen.tsx` | My items with All/Listed/Lent Out/Wash tabs and wash carousel |
| `src/screens/hauses/HausesScreen.tsx` | My hauses list and find-more discovery box |
| `src/screens/profile/ProfileScreen.tsx` | Stats row, quick actions, settings list |
| `src/screens/item/ItemDetailScreen.tsx` | Full-screen item view with fixed RENT NOW CTA |

### Shared components

| File | Purpose |
|---|---|
| `src/components/ItemCard.tsx` | 2-column grid card: 3:4 photo, status overlay, name/lender/price/size/location |
| `src/components/HausListItem.tsx` | Haus row: name, member/piece count, 3-avatar stack, VIEW button |
| `src/components/Masthead.tsx` | WEARHAUS wordmark with yellow HAUS highlight and bell icon |
| `src/components/SearchBar.tsx` | Text input with ink border and ivory background |
| `src/components/StatusTag.tsx` | AVAIL./LENT/WASH status pill with per-status color |

### Services and infrastructure

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client singleton with AsyncStorage session persistence |
| `src/context/AuthContext.tsx` | `AuthProvider` and `useAuth` hook; global session + profile state |
| `src/services/authService.ts` | `signUp`, `signIn`, `signOut`, `getSession` |
| `src/services/itemService.ts` | `fetchFeedItems`, `searchItems`, `fetchItemById`, `fetchMyItems` |
| `src/services/hausService.ts` | `fetchMyHauses`, `fetchAllHauses` |
| `src/services/userService.ts` | `fetchUserProfile` |
| `src/types/index.ts` | `Item`, `Haus`, `UserProfile`, `HausMembership` TypeScript interfaces |
| `App.tsx` | Entry point: font loading gate, SplashScreen, `AuthProvider` → `RootNavigator` |

### Database

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Full schema: ENUMs, 4 tables, 6 indexes, 13 RLS policies, 3 triggers |
| `supabase/migrations/002_security_fixes.sql` | Security hardening: WITH CHECK policies, column protection trigger, tighter user read policy, 2 new indexes |
| `supabase/seed.sql` | 3 users, 2 hauses, 3 memberships, 8 items for dev/demo |
| `supabase/monitoring.sql` | Health-check views: `v_item_stats`, `v_user_activity`, `v_haus_health`, `v_rls_policy_status` |

### CI / Deployment

| File | Purpose |
|---|---|
| `.env.example` | Template for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `eas.json` | EAS Build profiles: `development`, `preview`, `production` |
| `.github/workflows/ci.yml` | Type-check + tests + EAS preview build on push to `main` |
| `DEPLOYMENT.md` | Full deployment runbook (EAS Build, OTA updates, rollback procedures) |
