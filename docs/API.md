# Wearhaus API Reference

All data access goes through the Supabase JavaScript client (`@supabase/supabase-js`). There is no custom REST or GraphQL server. Every function in `src/services/` is a thin wrapper that builds a Supabase query, handles errors, and returns typed objects.

---

## Setup

```typescript
// src/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

All service functions import this singleton. It must be initialized before any call is made (guaranteed by the `App.tsx` font-loading gate which renders `AuthProvider` only after fonts are ready).

---

## Auth Service (`src/services/authService.ts`)

### `signUp`

```typescript
signUp(email: string, password: string, displayName: string): Promise<{ error: AuthError | null }>
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `email` | `string` | User's email address |
| `password` | `string` | Minimum 6 characters (enforced by Supabase) |
| `displayName` | `string` | Stored in `auth.users.raw_user_meta_data.display_name`; the `handle_new_user` trigger copies it to `public.users.display_name` |

**Returns** `{ error: null }` on success or `{ error: { message: string } }` on failure.

**Example call**

```typescript
const { error } = await signUp('maya@nyu.edu', 'secret123', 'Maya Chen');
if (error) console.error(error.message);
```

**Example success response**

```json
{ "error": null }
```

**Error conditions**

- `"User already registered"` — email already exists in `auth.users`
- `"Password should be at least 6 characters"` — Supabase auth rule
- Network timeout — Supabase unreachable

---

### `signIn`

```typescript
signIn(email: string, password: string): Promise<{ error: AuthError | null }>
```

**Parameters**

| Name | Type | Description |
|---|---|---|
| `email` | `string` | Registered email |
| `password` | `string` | Account password |

**Returns** `{ error: null }` on success. On success the Supabase client stores the session JWT in `AsyncStorage` automatically; `AuthContext` receives the session via `onAuthStateChange`.

**Example call**

```typescript
const { error } = await signIn('maya@nyu.edu', 'secret123');
```

**Error conditions**

- `"Invalid login credentials"` — wrong email or password
- `"Email not confirmed"` — if email confirmation is enabled in the Supabase dashboard

---

### `signOut`

```typescript
signOut(): Promise<void>
```

Clears the stored session from `AsyncStorage` and invalidates the refresh token server-side.

**Example call**

```typescript
await signOut();
```

No return value. `AuthContext.onAuthStateChange` fires with a `null` session.

---

### `getSession`

```typescript
getSession(): Promise<Session | null>
```

Rehydrates the persisted session from `AsyncStorage`. Called once on `AuthContext` mount to restore a logged-in user after app cold start.

**Example call**

```typescript
const session = await getSession();
if (session) console.log('Logged in as', session.user.email);
```

**Returns** a Supabase `Session` object or `null` if no session exists or it has expired.

---

## Items Service (`src/services/itemService.ts`)

All item queries filter `status = 'available'` for feed/search. The `owner` field is populated via a Supabase foreign table join (`owner:users(...)`).

### `fetchFeedItems`

```typescript
fetchFeedItems(category?: string): Promise<Item[]>
```

Fetches available items for the Home screen feed, ordered newest-first. Optionally filters to a single category.

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `category` | `string \| undefined` | — | When provided and not `"All"`, adds `.eq('category', category)` |

**SQL equivalent**

```sql
SELECT
  i.id, i.name, i.photo_url, i.category, i.size_label,
  i.price_per_day, i.status, i.location_label,
  u.id AS owner_id, u.display_name, u.avatar_url
FROM items i
JOIN users u ON u.id = i.owner_id
WHERE i.status = 'available'
  [AND i.category = $1]
ORDER BY i.created_at DESC;
```

**Example call**

```typescript
const items = await fetchFeedItems('dress');
```

**Example response shape**

```json
[
  {
    "id": "c3000000-0000-0000-0000-000000000001",
    "name": "Silk Slip Dress",
    "photo_url": "https://images.unsplash.com/...",
    "category": "dress",
    "size_label": "S",
    "price_per_day": 800,
    "status": "available",
    "location_label": "0.3 mi · NYU",
    "owner": {
      "id": "a1000000-0000-0000-0000-000000000001",
      "display_name": "Maya Chen",
      "avatar_url": "https://i.pravatar.cc/150?u=maya"
    }
  }
]
```

**Error conditions**

- Throws `Error(message)` on any Supabase error (RLS violation, network failure)
- Returns `[]` when no items match the filter

---

### `searchItems`

```typescript
searchItems(params: {
  query?: string;
  size?: string;
  category?: string;
  maxPrice?: number;
}): Promise<Item[]>
```

Powers the Explore screen. All params are optional; each provided param adds a filter clause.

**Parameters**

| Name | Type | Supabase filter |
|---|---|---|
| `query` | `string` | `.ilike('name', '%query%')` (case-insensitive substring) |
| `size` | `string` | `.eq('size_label', size)` |
| `category` | `string` | `.eq('category', category)` |
| `maxPrice` | `number` (cents) | `.lte('price_per_day', maxPrice)` |

**SQL equivalent**

```sql
SELECT id, name, photo_url, category, size_label, price_per_day, status, location_label,
       u.id, u.display_name, u.avatar_url
FROM items i JOIN users u ON u.id = i.owner_id
WHERE i.status = 'available'
  [AND i.name ILIKE '%query%']
  [AND i.size_label = $size]
  [AND i.category = $category]
  [AND i.price_per_day <= $maxPrice];
```

**Example call**

```typescript
const items = await searchItems({ query: 'blazer', maxPrice: 1000 });
```

**Error conditions**

- Throws `Error(message)` on Supabase error
- Returns `[]` when no items match

---

### `fetchItemById`

```typescript
fetchItemById(id: string): Promise<Item | null>
```

Fetches a single item with full owner profile. Used by `ItemDetailScreen` to hydrate complete data (including `rating` and `university`) when navigating from a card.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Item primary key |

**SQL equivalent**

```sql
SELECT i.*, u.id, u.display_name, u.avatar_url, u.rating, u.university
FROM items i JOIN users u ON u.id = i.owner_id
WHERE i.id = $1
LIMIT 1;
```

**Example call**

```typescript
const item = await fetchItemById('c3000000-0000-0000-0000-000000000001');
```

**Example response shape**

```json
{
  "id": "c3000000-0000-0000-0000-000000000001",
  "owner_id": "a1000000-0000-0000-0000-000000000001",
  "name": "Silk Slip Dress",
  "description": "Ivory silk bias-cut slip dress, worn once to a gala.",
  "photo_url": "https://images.unsplash.com/...",
  "category": "dress",
  "size_label": "S",
  "price_per_day": 800,
  "price_per_week": 3500,
  "status": "available",
  "location_label": "0.3 mi · NYU",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z",
  "owner": {
    "id": "a1000000-0000-0000-0000-000000000001",
    "display_name": "Maya Chen",
    "avatar_url": "https://i.pravatar.cc/150?u=maya",
    "rating": 4.9,
    "university": "NYU"
  }
}
```

**Error conditions**

- Throws `Error("JSON object requested, multiple (or no) rows returned")` if ID does not exist — caller should guard with try/catch

---

### `fetchMyItems`

```typescript
fetchMyItems(userId: string, tab: string): Promise<Item[]>
```

Fetches items owned by the current user, filtered by the active tab in My Closet.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `userId` | `string` (UUID) | `auth.uid()` of the current user |
| `tab` | `"All" \| "Listed" \| "Lent Out" \| "Wash"` | Maps to `status` filter |

**Tab → status mapping**

| Tab | Filter |
|---|---|
| `"All"` | No status filter |
| `"Listed"` | `status = 'available'` |
| `"Lent Out"` | `status = 'lent'` |
| `"Wash"` | `status = 'wash'` |

**SQL equivalent**

```sql
SELECT * FROM items
WHERE owner_id = $1
  [AND status = $2];
```

**Example call**

```typescript
const items = await fetchMyItems(user.id, 'Listed');
```

**Error conditions**

- Throws `Error(message)` on Supabase error
- RLS enforces `owner_id = auth.uid()` server-side — a user cannot query another user's items via this function

---

## Hauses Service (`src/services/hausService.ts`)

### `fetchMyHauses`

```typescript
fetchMyHauses(userId: string): Promise<Haus[]>
```

Returns all hauses the current user is a member of, via the `haus_memberships` join table.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `userId` | `string` (UUID) | Current user's ID |

**SQL equivalent**

```sql
SELECT h.id, h.name, h.description, h.cover_url, h.member_count, h.piece_count
FROM haus_memberships m
JOIN hauses h ON h.id = m.haus_id
WHERE m.user_id = $1;
```

**Example call**

```typescript
const hauses = await fetchMyHauses(user.id);
```

**Example response shape**

```json
[
  {
    "id": "b2000000-0000-0000-0000-000000000001",
    "name": "NYU Village Collective",
    "description": "Lower Manhattan students sharing formal and festival wear.",
    "cover_url": null,
    "member_count": 2,
    "piece_count": 5
  }
]
```

**Error conditions**

- Throws `Error(message)` on Supabase error
- Returns `[]` if user has no memberships

---

### `fetchAllHauses`

```typescript
fetchAllHauses(): Promise<Haus[]>
```

Returns all hauses sorted by member count descending. Used to populate the "Find More Hauses" discovery section.

**SQL equivalent**

```sql
SELECT id, name, description, cover_url, member_count, piece_count
FROM hauses
ORDER BY member_count DESC;
```

**Example call**

```typescript
const all = await fetchAllHauses();
```

**Error conditions**

- Throws `Error(message)` on Supabase error

---

## Users Service (`src/services/userService.ts`)

### `fetchUserProfile`

```typescript
fetchUserProfile(userId: string): Promise<UserProfile | null>
```

Fetches a user's public profile row from `public.users`. Called by `AuthContext` on login to populate `profile` for all screens.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `userId` | `string` (UUID) | `auth.uid()` or another user's ID |

**SQL equivalent**

```sql
SELECT id, display_name, avatar_url, university, bio,
       items_listed, rentals_completed, rating
FROM users
WHERE id = $1
LIMIT 1;
```

**Example call**

```typescript
const profile = await fetchUserProfile(session.user.id);
```

**Example response shape**

```json
{
  "id": "a1000000-0000-0000-0000-000000000001",
  "display_name": "Maya Chen",
  "avatar_url": "https://i.pravatar.cc/150?u=maya",
  "university": "NYU",
  "bio": "Fashion lover. Renting out my barely-worn event pieces.",
  "items_listed": 4,
  "rentals_completed": 12,
  "rating": 4.9
}
```

**Error conditions**

- Throws `Error(message)` if user row does not exist (e.g., signup trigger failed)

---

## Core Query Patterns

### Pattern 1: Simple filtered list

```sql
-- SQL
SELECT id, name FROM items WHERE status = 'available' ORDER BY created_at DESC;
```

```typescript
// JS client
const { data, error } = await supabase
  .from('items')
  .select('id, name')
  .eq('status', 'available')
  .order('created_at', { ascending: false });
```

---

### Pattern 2: Foreign table join (owner details on item)

```sql
-- SQL
SELECT i.*, u.display_name, u.avatar_url
FROM items i JOIN users u ON u.id = i.owner_id
WHERE i.id = $1;
```

```typescript
// JS client
const { data } = await supabase
  .from('items')
  .select('*, owner:users(id, display_name, avatar_url)')
  .eq('id', id)
  .single();
```

---

### Pattern 3: Join through an association table (my hauses)

```sql
-- SQL
SELECT h.* FROM haus_memberships m JOIN hauses h ON h.id = m.haus_id WHERE m.user_id = $1;
```

```typescript
// JS client
const { data } = await supabase
  .from('haus_memberships')
  .select('haus:hauses(id, name, description, cover_url, member_count, piece_count)')
  .eq('user_id', userId);
const hauses = data?.map((r: any) => r.haus) ?? [];
```

---

### Pattern 4: Multi-filter search with optional clauses

```sql
-- SQL
SELECT * FROM items WHERE status = 'available' AND name ILIKE '%blazer%' AND price_per_day <= 1000;
```

```typescript
// JS client
let q = supabase.from('items').select('*').eq('status', 'available');
if (params.query)    q = q.ilike('name', `%${params.query}%`);
if (params.maxPrice) q = q.lte('price_per_day', params.maxPrice);
const { data } = await q;
```

---

### Pattern 5: Owner-scoped query (My Closet)

```sql
-- SQL
SELECT * FROM items WHERE owner_id = $1 AND status = 'available';
```

```typescript
// JS client — RLS also enforces owner_id = auth.uid() server-side
const { data } = await supabase
  .from('items')
  .select('*')
  .eq('owner_id', userId)
  .eq('status', 'available');
```

---

### Pattern 6: Single row fetch with `.single()`

```sql
-- SQL
SELECT * FROM users WHERE id = $1 LIMIT 1;
```

```typescript
// JS client — throws if 0 or 2+ rows returned
const { data, error } = await supabase
  .from('users')
  .select('id, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating')
  .eq('id', userId)
  .single();
```
