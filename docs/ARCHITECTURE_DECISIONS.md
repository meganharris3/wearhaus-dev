# Architecture Decision Records — Wearhaus

---

## ADR-001: Expo Managed Workflow Over Bare React Native

**Status:** Accepted

### Context

Wearhaus is a greenfield mobile app targeting college students. The initial delivery must be functional, demo-able, and installable on both iOS and Android without requiring reviewers to build from Xcode or Android Studio. The development team wanted the fastest possible iteration loop and the lowest possible ops overhead.

Two workflow options exist for React Native projects: the **Expo managed workflow** (Expo Go compatible; no native code in the repo) and the **bare workflow** (full Xcode/Gradle project tree; required for any custom native module).

The managed workflow imposes real constraints: every native dependency must ship inside the Expo SDK. Custom native modules — things like in-app purchase SDKs, advanced camera APIs, Bluetooth, or push-notification SDKs that wrap APNs/FCM directly — are either unavailable or require ejecting to a dev client build.

For this project, those constraints were evaluated against the full requirements list. The only dependencies needed were:

- `@supabase/supabase-js` (pure JS)
- `@react-native-async-storage/async-storage` (in Expo SDK)
- `react-navigation` (in Expo SDK)
- `@expo-google-fonts/*` (Expo-native)
- `@expo/vector-icons` (Expo-native)
- `expo-splash-screen`, `expo-font` (Expo-native)

None of these require a native build step. Payment, camera, push notifications, and real-time features are explicitly out of scope for this version.

### Decision

Use the Expo managed workflow. The app runs with `npx expo start` and is scannable via the Expo Go app on iOS and Android with no build step.

### Consequences

**Positive:**
- Zero-friction onboarding: `npm install && npx expo start` → scan QR code → running app in under 2 minutes.
- No Xcode or Android Studio required on developer machines.
- EAS Build handles production binaries when needed, without changing the development workflow.
- OTA updates via `eas update` deploy JS-only changes instantly without a store review cycle.

**Negative:**
- Session tokens are stored in `AsyncStorage` rather than `expo-secure-store`, because `expo-secure-store` requires a dev client build (it wraps iOS Keychain / Android Keystore via native code). This is a known security trade-off documented in the Known Limitations section of HANDOFF.md.
- Any future feature requiring a custom native module (e.g., push notifications via Notifee, advanced image processing, Bluetooth) will require either migrating to a dev client build or switching to the bare workflow.
- Expo SDK version controls the underlying React Native version. Upgrading React Native requires an Expo SDK upgrade.

---

## ADR-002: Supabase Over a Custom Backend

**Status:** Accepted

### Context

Wearhaus needs: user authentication (email/password, session persistence), a relational database with foreign keys and row-level access control, and a JavaScript/TypeScript client that works inside React Native without native modules.

The two realistic options were:

1. **Custom backend** — Node.js (Express or Fastify) + PostgreSQL, deployed to Railway, Fly, or Heroku. Custom auth layer (JWT issuance, refresh token rotation, session storage).
2. **Supabase** — managed PostgreSQL + built-in Auth + auto-generated REST/Realtime API + JS client.

A custom backend is straightforward but adds significant undifferentiated work: standing up a server, writing auth middleware, managing refresh token rotation, deploying and monitoring an additional service, and writing database migration tooling from scratch.

Supabase provides all of this with zero server code. RLS (Row Level Security) enforces authorization directly in the database using `auth.uid()`, which means there is no application-layer middleware to write or audit. The Supabase JS client works entirely with the anon key — no service-role key ships in the mobile bundle.

The risk of vendor lock-in is real but manageable: all data lives in a standard PostgreSQL database accessible via `psql` or `pg_dump`. The schema and migrations are checked into the repo. Migrating away from Supabase would require replacing the auth system and the client library, but the data model and SQL are fully portable.

### Decision

Use Supabase for auth, database, and data access. No custom backend server.

### Consequences

**Positive:**
- Auth (signup, login, session refresh, JWT validation) is fully managed — zero lines of auth server code written.
- RLS policies enforce row ownership at the database layer, making authorization auditable in SQL.
- The Supabase JS client handles the full data-access surface with a typed query builder.
- Local development uses the Supabase cloud project — no Docker Compose or local Postgres setup required.
- Realtime subscriptions are available without additional infrastructure if needed in the future.

**Negative:**
- All queries are mediated by the Supabase PostgREST layer, not direct SQL. Complex joins require using the embedded foreign table syntax (`owner:users(...)`) rather than arbitrary SQL.
- Rate limits and connection limits are tier-dependent. The free tier has a 500 MB database limit and 2 GB bandwidth/month.
- The Supabase dashboard is a third-party system — schema changes made outside of checked-in migration files will create drift.
- If the Supabase project is paused (free tier pauses after 1 week of inactivity), the app becomes non-functional until manually resumed.

---

## ADR-003: React Context Over Redux / Zustand for State Management

**Status:** Accepted

### Context

The app has two categories of state:

1. **Auth state** — the current session, user object, and profile. This is global: every screen needs to know whether the user is logged in, and several screens read `profile.display_name`, `profile.rating`, etc.
2. **Screen-local state** — items list, hauses list, search filters, active tab, loading/error flags. Each of these is scoped to a single screen and does not need to be shared.

Redux is the canonical choice for large apps with complex shared state, but it introduces significant boilerplate (actions, reducers, selectors, middleware) and a learning curve that is not warranted for an app of this size. Zustand is lighter but still adds an external dependency for state that does not genuinely need to cross component boundaries.

React Context with `useReducer` or plain `useState` is the built-in primitive for global values that change infrequently. Auth state changes at most a few times per session (login, cold-start rehydration, logout). It is a textbook fit for Context.

Screen-local data (items arrays, filter state, loading booleans) does not need to leave the screen component. Lifting that state into a global store would create unnecessary coupling and make each screen harder to reason about in isolation.

### Decision

Use a single `AuthContext` (in `src/context/AuthContext.tsx`) for auth state, session, and the user's own profile. Use `useState` + `useEffect` inside each screen component for all other state.

### Consequences

**Positive:**
- No additional dependencies beyond React itself.
- `AuthContext` is small, focused, and easy to test: it exposes `session`, `user`, `profile`, `loading`, and three async methods (`signIn`, `signUp`, `signOut`).
- Screen components are self-contained: all data-fetching logic, loading state, and error state live in the component that renders them.
- Adding a new screen does not require modifying any global store or wiring up a new reducer.

**Negative:**
- If a future feature needs to share non-auth state across screens (e.g., a rental cart, unread notification count, optimistic UI updates after adding an item), a proper state manager will need to be introduced or the Context approach extended carefully.
- Context re-renders all consumers when the value changes. For auth state this is fine (changes are infrequent); for high-frequency state it would be a problem.
- There is no built-in caching or deduplication. If two screens both mount and call `fetchFeedItems()`, two network requests are made. For this project scope this is acceptable, but a library like React Query would handle this better at scale.

---

## ADR-004: Mock Data Strategy — Inline Per-Screen Constants, Not a Shared Data Layer

**Status:** Accepted

### Context

During screen implementation, the Supabase project may not yet be configured (missing `.env.local` variables, unapplied migrations, or no seed data). The screens need to be buildable and visually reviewable without a live Supabase connection.

Two approaches were considered:

1. **Shared mock layer** — a single `src/mocks/` directory with `MOCK_ITEMS`, `MOCK_HAUSES`, etc. exported and imported wherever needed. Services return mocks when `process.env.EXPO_PUBLIC_SUPABASE_URL` is absent.
2. **Inline per-screen constants** — each screen defines its own `MOCK_ITEMS` or `MOCK_HAUSES` constant at the top of the file and uses it as the initial state value or as a fallback.

The shared mock layer is cleaner for large teams but adds indirection — a developer looking at a screen must jump to `src/mocks/` to understand what data is being rendered. It also risks the mocks drifting out of sync with the TypeScript types if maintained separately.

The inline approach keeps everything needed to understand a screen in one file. It matches how Supabase data will eventually flow (each screen fetches its own data) and means the migration from mock to live data is a one-line change per screen: replace the `useState(MOCK_ITEMS)` initial value with an empty array and uncomment the `useEffect` fetch.

### Decision

Define mock constants inline at the top of each screen file. The naming convention is `MOCK_ITEMS` and `MOCK_HAUSES`. When Supabase is configured, the screen's `useEffect` fetches live data; the mock constant becomes dead code and can be deleted.

### Consequences

**Positive:**
- Every screen is self-contained and renderable without any environment configuration.
- The visual spec can be validated by running `expo start` with no `.env.local` file present.
- No abstraction layer to maintain; the migration path to live data is explicit and trivial.
- Type-checking applies to mock constants the same as to live data — `MOCK_ITEMS: Item[]` enforces the shape.

**Negative:**
- Mock data is duplicated across files rather than maintained in one place. A data model change (e.g., renaming `size_label` to `size`) requires updating every screen's mock constant.
- Screens that have not yet been migrated to live data will silently appear to work in demos — a reviewer must check whether data is live or mocked.
- No mechanism to test error states or empty states against mock data without temporarily modifying the constants.
