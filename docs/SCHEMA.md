# Wearhaus Database Schema Reference

All tables live in the `public` schema of a Supabase (PostgreSQL 15) project. Row Level Security is enabled on every table.

---

## ENUMs

### `item_status`

```sql
CREATE TYPE item_status AS ENUM ('available', 'lent', 'wash');
```

| Value | Meaning |
|---|---|
| `available` | Item is in the owner's possession and available to rent |
| `lent` | Item is currently out on a rental |
| `wash` | Item has been returned and is being cleaned |

### `membership_role`

```sql
CREATE TYPE membership_role AS ENUM ('member', 'admin');
```

| Value | Meaning |
|---|---|
| `member` | Standard haus member — can view and leave |
| `admin` | Can update haus details (enforced by RLS update policy) |

---

## Tables

### `public.users`

Mirrors `auth.users`. The `handle_new_user` trigger creates a row here automatically when a user signs up via Supabase Auth. The primary key matches `auth.users.id`.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | — | Matches Supabase Auth user ID |
| `email` | `text` | NOT NULL, UNIQUE | — | Copied from `auth.users` at signup |
| `display_name` | `text` | NOT NULL | — | From `raw_user_meta_data.display_name`; falls back to email prefix |
| `avatar_url` | `text` | — | NULL | URL to profile photo |
| `university` | `text` | — | NULL | Campus affiliation (user-supplied) |
| `bio` | `text` | — | NULL | Short profile bio |
| `items_listed` | `integer` | NOT NULL | `0` | Managed by service-role; protected from self-mutation by trigger |
| `rentals_completed` | `integer` | NOT NULL | `0` | Same protection |
| `rating` | `numeric(2,1)` | CHECK (0 ≤ rating ≤ 5) | NULL | Aggregate lender rating |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Protected from self-mutation |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-updated by trigger |

**Indexes:** none beyond PK (access is always by primary key).

---

### `public.items`

Represents a single piece of clothing listed for rent.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | Item identifier |
| `owner_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | Listing owner |
| `name` | `text` | NOT NULL | — | Display name (e.g. "Silk Slip Dress") |
| `description` | `text` | — | NULL | Longer item description |
| `photo_url` | `text` | — | NULL | URL; app falls back to placeholder image |
| `category` | `text` | — | NULL | `'dress'` / `'jacket'` / `'shoes'` / `'skirt'` etc. |
| `size_label` | `text` | NOT NULL | — | Human-readable size: `'XS'`, `'M'`, `'US 8'`, etc. |
| `price_per_day` | `integer` | NOT NULL, CHECK ≥ 0 | — | **Stored in cents.** Display as `(price_per_day / 100).toFixed(2)` |
| `price_per_week` | `integer` | CHECK ≥ 0 | NULL | Weekly rate in cents; optional discount |
| `status` | `item_status` | NOT NULL | `'available'` | Lifecycle state |
| `location_label` | `text` | — | NULL | Human-readable distance/campus label |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-updated by trigger |

**Indexes**

| Index | Columns | Type | Purpose |
|---|---|---|---|
| `idx_items_status_created` | `(status, created_at DESC)` | B-tree | Home feed ORDER BY (migration 001) |
| `idx_items_owner_id` | `(owner_id)` | B-tree | My Closet filter (migration 001) |
| `idx_items_name_search` | GIN on `to_tsvector(name \|\| description)` | GIN | Full-text search (migration 001) |
| `idx_items_category` | `(category)` | B-tree | Explore category chip filter (migration 002) |
| `idx_items_price_status` | `(price_per_day, status)` WHERE `status = 'available'` | Partial B-tree | Price-range queries (migration 002) |

---

### `public.hauses`

A shared wardrobe collective. Members pool their listed items under a named group.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | Haus identifier |
| `name` | `text` | NOT NULL | — | Display name (e.g. "NYU Village Collective") |
| `description` | `text` | — | NULL | Short group description |
| `cover_url` | `text` | — | NULL | Cover photo URL |
| `member_count` | `integer` | NOT NULL | `0` | Maintained by `trg_haus_member_count` trigger; do not update directly |
| `piece_count` | `integer` | NOT NULL | `0` | Updated manually or via future trigger |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Auto-updated by trigger |

**Indexes**

| Index | Columns | Purpose |
|---|---|---|
| `idx_hauses_member_count` | `(member_count DESC)` | `fetchAllHauses` sort order (migration 001) |

---

### `public.haus_memberships`

Join table linking users to hauses. The unique constraint prevents duplicate memberships.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `user_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | Member |
| `haus_id` | `uuid` | NOT NULL, FK → `hauses(id)` ON DELETE CASCADE | — | Haus |
| `role` | `membership_role` | NOT NULL | `'member'` | `'member'` or `'admin'` |
| `joined_at` | `timestamptz` | NOT NULL | `now()` | — |
| — | — | UNIQUE `(user_id, haus_id)` | — | Prevents duplicate rows |

**Indexes**

| Index | Columns | Purpose |
|---|---|---|
| `idx_memberships_haus_id` | `(haus_id)` | Haus member lookups (migration 001) |
| `idx_memberships_user_id` | `(user_id)` | `fetchMyHauses` filter (migration 001) |

---

## Views

### `public.user_profiles`

Created in migration 002. A column-limited projection of `public.users` that omits the `email` column. Intended for any future anonymous or reduced-privilege access path.

```sql
CREATE VIEW public.user_profiles AS
  SELECT id, display_name, avatar_url, university, bio,
         items_listed, rentals_completed, rating, created_at
  FROM public.users;
```

---

## RLS Policy Summary

### `public.users`

| Policy | Operation | Rule |
|---|---|---|
| `users: authenticated read` | SELECT | `auth.role() = 'authenticated'` (migration 002 replaces the original broad public read) |
| `users: owner insert` | INSERT | `auth.uid() = id` |
| `users: owner update` | UPDATE | `USING auth.uid() = id` + `WITH CHECK auth.uid() = id` (migration 002 adds WITH CHECK) |

### `public.items`

| Policy | Operation | Rule |
|---|---|---|
| `items: authenticated read` | SELECT | `auth.role() = 'authenticated'` |
| `items: owner insert` | INSERT | `auth.uid() = owner_id` |
| `items: owner update` | UPDATE | `USING auth.uid() = owner_id` + `WITH CHECK auth.uid() = owner_id` (migration 002) |
| `items: owner delete` | DELETE | `auth.uid() = owner_id` |

### `public.hauses`

| Policy | Operation | Rule |
|---|---|---|
| `hauses: authenticated read` | SELECT | `auth.role() = 'authenticated'` |
| `hauses: authenticated insert` | INSERT | `auth.role() = 'authenticated'` |
| `hauses: admin update` | UPDATE | User must have a `haus_memberships` row with `role = 'admin'` for this haus |

### `public.haus_memberships`

| Policy | Operation | Rule |
|---|---|---|
| `haus_memberships: authenticated read` | SELECT | `auth.role() = 'authenticated'` |
| `haus_memberships: self insert` | INSERT | `auth.uid() = user_id AND role = 'member'` (migration 002 adds the `role = 'member'` guard) |
| `haus_memberships: self delete` | DELETE | `auth.uid() = user_id` |

---

## Triggers

### `on_auth_user_created` → `public.handle_new_user()`

- **Table:** `auth.users`
- **Fires:** AFTER INSERT, FOR EACH ROW
- **Purpose:** Auto-creates a `public.users` row when a new account is registered via Supabase Auth.
- **Logic:** Inserts `(id, email, display_name)` where `display_name` is taken from `raw_user_meta_data.display_name`, falling back to the email username prefix (`split_part(email, '@', 1)`).
- **Security:** `SECURITY DEFINER` with `search_path = public` to prevent search-path injection.

### `trg_haus_member_count` → `public.sync_haus_member_count()`

- **Table:** `public.haus_memberships`
- **Fires:** AFTER INSERT OR DELETE, FOR EACH ROW
- **Purpose:** Keeps `hauses.member_count` in sync without requiring an extra query on every read.
- **Logic:** On INSERT increments `member_count + 1`; on DELETE decrements `greatest(member_count - 1, 0)` (floor at zero).

### `trg_users_updated_at` / `trg_items_updated_at` / `trg_hauses_updated_at` → `public.set_updated_at()`

- **Fires:** BEFORE UPDATE, FOR EACH ROW on their respective tables
- **Purpose:** Stamps `updated_at = now()` automatically; callers do not need to pass this column.

### `trg_protect_user_columns` → `public.protect_user_columns()` (migration 002)

- **Table:** `public.users`
- **Fires:** BEFORE UPDATE, FOR EACH ROW
- **Purpose:** Prevents authenticated users from self-modifying privileged columns (`email`, `rating`, `items_listed`, `rentals_completed`, `id`, `created_at`). When `auth.role() <> 'service_role'`, the trigger silently restores the old values for those columns regardless of what the UPDATE sent.

---

## Migration History

### `001_initial_schema.sql`

The baseline migration. Creates everything from scratch:

- Extensions: `uuid-ossp`
- ENUMs: `item_status`, `membership_role`
- Tables: `users`, `items`, `hauses`, `haus_memberships`
- Indexes: 6 (status+created, owner_id, GIN full-text, memberships x2, hauses member_count)
- RLS: enabled on all 4 tables; 13 policies
- Triggers: `on_auth_user_created`, `trg_haus_member_count`, `updated_at` triggers on 3 tables

### `002_security_fixes.sql`

Applied after code review. Addresses 4 findings:

- **C-1 / H-1:** Adds `WITH CHECK` to `items: owner update` and `users: owner update` policies — without `WITH CHECK`, an UPDATE policy only checked the current row, allowing a user to change `owner_id` to another user after passing the `USING` check.
- **C-1 (column protection):** Adds `trg_protect_user_columns` trigger — prevents authenticated users from inflating their own `rating` or `items_listed`.
- **H-2:** Replaces the broad `users: public read` policy with `users: authenticated read` (requires a valid JWT). Adds the `user_profiles` view as a column-limited alternative.
- **L-5:** Tightens `haus_memberships: self insert` to require `role = 'member'` — prevents a user from self-promoting to `admin` on join.
- **Performance (PH-4, PH-6):** Adds `idx_items_category` and a partial index `idx_items_price_status` for price-range queries on available items.

---

## Seed Data (`supabase/seed.sql`)

For development and demo environments only. Do not run against production.

**3 users** inserted directly into `public.users` (bypassing `auth.users` and the signup trigger). Real authenticated users cannot log in as these seed accounts without corresponding `auth.users` rows.

| Display name | Email | University | Items | Rentals | Rating |
|---|---|---|---|---|---|
| Maya Chen | maya@nyu.edu | NYU | 4 | 12 | 4.9 |
| Jordan Reyes | jordan@columbia.edu | Columbia | 3 | 7 | 4.7 |
| Priya Patel | priya@stern.nyu.edu | NYU Stern | 1 | 3 | 5.0 |

**2 hauses**

| Name | Members | Pieces |
|---|---|---|
| NYU Village Collective | 2 | 5 |
| Uptown Closet | 1 | 3 |

**3 memberships:** Maya is admin of NYU Village Collective, Priya is a member; Jordan is admin of Uptown Closet.

**8 items** across all 3 owners, covering statuses `available` (5), `lent` (2), `wash` (1) and categories `dress` (3), `jacket` (2), `shoes` (2), `skirt` (1). Prices range from $4.00/day (Strappy Heels) to $12.00/day (Emerald Gown). All prices stored in cents.
