# Wearhaus Database Schema Reference

All tables live in the `public` schema of a Supabase (PostgreSQL 15) project. Row Level Security is enabled on every table.

> **Coverage:** this reference covers migrations 001–002 and 010–014. Tables added by migrations 003–009 (`friendships`, `rentals`, onboarding/campus columns, storage and haus additions) are not yet documented here — see the migration files themselves.

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

### `board_visibility` / `board_cover_style` (migration 012)

```sql
CREATE TYPE board_visibility  AS ENUM ('public', 'friends', 'hauses', 'private');
CREATE TYPE board_cover_style AS ENUM ('mosaic', 'single', 'stack');
```

### `message_type` / `thread_status` (migration 013)

```sql
CREATE TYPE message_type  AS ENUM ('text', 'system', 'borrow_request', 'counter_offer', 'confirmed', 'item_mention');
CREATE TYPE thread_status AS ENUM ('pending_request', 'counter_sent', 'active_rental', 'completed', 'direct');
```

### `notification_type` (migration 014)

```sql
CREATE TYPE notification_type AS ENUM (
  'borrow_request', 'borrow_accepted', 'friend_request', 'friend_accepted',
  'haus_invite', 'message', 'system'
);
```

`haus_invite`, `message` and `system` are reserved — nothing produces them yet.

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

### `public.haus_collections` (migration 011)

Named, curated groupings of items inside a haus.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `haus_id` | `uuid` | NOT NULL, FK → `hauses(id)` ON DELETE CASCADE | — | Owning haus |
| `name` | `text` | NOT NULL | — | Collection name |
| `created_by` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | Creator (only they can rename/delete) |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | `now()` | `updated_at` auto-stamped by trigger |

**Indexes:** `idx_haus_collections_haus_id (haus_id)`.

---

### `public.haus_collection_items` (migration 011)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `collection_id` | `uuid` | NOT NULL, FK → `haus_collections(id)` ON DELETE CASCADE | — | — |
| `item_id` | `uuid` | NOT NULL, FK → `items(id)` ON DELETE CASCADE | — | — |
| `added_by` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | Only the adder can remove it |
| `added_at` | `timestamptz` | NOT NULL | `now()` | — |
| — | — | UNIQUE `(collection_id, item_id)` | — | An item appears once per collection |

**Indexes:** `idx_collection_items_collection_id (collection_id)`, `idx_collection_items_item_id (item_id)`.

---

### `public.boards` (migration 012)

A user's personal, curated grouping of their own items.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `owner_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | — |
| `name` | `text` | NOT NULL | — | — |
| `visibility` | `board_visibility` | NOT NULL | `'private'` | Read policy currently only distinguishes `private` from everything else |
| `cover_style` | `board_cover_style` | NOT NULL | `'mosaic'` | — |
| `created_at` / `updated_at` | `timestamptz` | NOT NULL | `now()` | `updated_at` auto-stamped by trigger |

**Indexes:** `idx_boards_owner_id (owner_id)`.

---

### `public.board_items` (migration 012)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `board_id` | `uuid` | NOT NULL, FK → `boards(id)` ON DELETE CASCADE | — | — |
| `item_id` | `uuid` | NOT NULL, FK → `items(id)` ON DELETE CASCADE | — | — |
| `position` | `integer` | NOT NULL | `0` | Reserved for manual ordering |
| `added_at` | `timestamptz` | NOT NULL | `now()` | — |
| — | — | UNIQUE `(board_id, item_id)` | — | — |

**Indexes:** `idx_board_items_board_id (board_id)`, `idx_board_items_item_id (item_id)`.

---

### `public.threads` (migration 013)

A direct-message conversation between two users, optionally about one item.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `user_a` / `user_b` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE, CHECK `user_a <> user_b` | — | The two participants (order carries no meaning) |
| `item_id` | `uuid` | FK → `items(id)` ON DELETE SET NULL | NULL | Item under discussion |
| `status` | `thread_status` | NOT NULL | `'direct'` | — |
| `last_message` / `last_message_at` | `text` / `timestamptz` | — / NOT NULL | NULL / `now()` | Denormalised inbox preview, maintained by `trg_sync_thread_last_message` |
| `user_a_read_at` / `user_b_read_at` | `timestamptz` | NOT NULL | `now()` | Per-user read marker; a thread is unread for a user when `last_message_at` is later |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes:** `idx_threads_user_a`, `idx_threads_user_b`, `idx_threads_last_message_at (last_message_at DESC)`, and the unique `uq_threads_pair_item` on `(least(user_a,user_b), greatest(user_a,user_b), coalesce(item_id, zero-uuid))` — one thread per unordered user pair per item (or per pair when there is no item).

---

### `public.messages` (migration 013)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `thread_id` | `uuid` | NOT NULL, FK → `threads(id)` ON DELETE CASCADE | — | — |
| `sender_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | System messages are sent as the acting user with `type = 'system'` |
| `type` | `message_type` | NOT NULL | `'text'` | — |
| `text` | `text` | — | NULL | — |
| `payload` | `jsonb` | — | NULL | Structured content (borrow request / counter offer). The only column clients may UPDATE |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes:** `idx_messages_thread_created (thread_id, created_at DESC)`.

---

### `public.item_favorites` (migration 014)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `user_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | — |
| `item_id` | `uuid` | NOT NULL, FK → `items(id)` ON DELETE CASCADE | — | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| — | — | PK `(user_id, item_id)` | — | — |

**Indexes:** `idx_item_favorites_item_id (item_id)`.

---

### `public.item_comments` (migration 014)

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `item_id` | `uuid` | NOT NULL, FK → `items(id)` ON DELETE CASCADE | — | — |
| `author_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | — |
| `text` | `text` | NOT NULL | — | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes:** `idx_item_comments_item_created (item_id, created_at DESC)`.

---

### `public.notifications` (migration 014)

A user's notification feed. **Written only by triggers**; the client can read its own rows and set `read`.

| Column | Type | Constraints | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | PK | `uuid_generate_v4()` | — |
| `user_id` | `uuid` | NOT NULL, FK → `users(id)` ON DELETE CASCADE | — | Recipient |
| `type` | `notification_type` | NOT NULL | — | — |
| `payload` | `jsonb` | NOT NULL | `'{}'` | Type-specific: friend → `friendship_id`, `from_user_id`, `from_name`; borrow → `thread_id`, `message_id`, `from_user_id`, `borrower_name`, `item_name`, `days`, `date_range` |
| `read` | `boolean` | NOT NULL | `false` | Drives the unread dot. Client-updatable (column grant) |
| `resolved` | `boolean` | NOT NULL | `false` | An actionable request (friend/borrow) has been answered, from anywhere. Set by triggers only |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes:** `idx_notifications_user_created (user_id, created_at DESC)`, partial `idx_notifications_user_unread (user_id) WHERE read = false`, and expression indexes on `payload->>'friendship_id'` (friend requests) and `payload->>'message_id'` (borrow requests) used by the resolve triggers.

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

### `public.haus_collections` / `public.haus_collection_items`

| Policy | Operation | Rule |
|---|---|---|
| `haus_collections: member read` / `member insert` | SELECT / INSERT | Caller is a member of the collection's haus (insert also requires `auth.uid() = created_by`) |
| `haus_collections: creator update` / `creator delete` | UPDATE / DELETE | `auth.uid() = created_by` |
| `haus_collection_items: member read` / `member insert` | SELECT / INSERT | Caller is a member of the collection's haus (insert also requires `auth.uid() = added_by`) |
| `haus_collection_items: adder delete` | DELETE | `auth.uid() = added_by` |

### `public.boards` / `public.board_items`

| Policy | Operation | Rule |
|---|---|---|
| `boards: owner read` | SELECT | `auth.uid() = owner_id` |
| `boards: public read` | SELECT | `visibility <> 'private'` and authenticated (friends/hauses scoping not yet enforced) |
| `boards: owner insert` / `update` / `delete` | INSERT / UPDATE / DELETE | `auth.uid() = owner_id` |
| `board_items: owner read` / `insert` / `delete` | SELECT / INSERT / DELETE | Caller owns the parent board |

### `public.threads` / `public.messages`

| Policy | Operation | Rule |
|---|---|---|
| `threads: participant read` / `insert` / `update` | SELECT / INSERT / UPDATE | `auth.uid()` is `user_a` or `user_b` |
| `messages: participant read` | SELECT | Caller participates in the thread |
| `messages: participant insert` | INSERT | Caller participates in the thread **and** `auth.uid() = sender_id` |
| `messages: participant update` | UPDATE | Caller participates in the thread. A column grant limits UPDATE to `payload` only |

### `public.item_favorites` / `public.item_comments`

| Policy | Operation | Rule |
|---|---|---|
| `item_favorites: authenticated read` | SELECT | Any authenticated user |
| `item_favorites: self insert` / `self delete` | INSERT / DELETE | `auth.uid() = user_id` |
| `item_comments: authenticated read` | SELECT | Any authenticated user |
| `item_comments: author insert` / `author delete` | INSERT / DELETE | `auth.uid() = author_id` |

### `public.notifications`

| Policy | Operation | Rule |
|---|---|---|
| `notifications: self read` | SELECT | `auth.uid() = user_id` |
| `notifications: self update` | UPDATE | `auth.uid() = user_id`; a column grant limits UPDATE to `read` only |
| — | INSERT | No client policy: rows are created by `SECURITY DEFINER` triggers only |

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

### Messaging triggers (migration 013)

- **`trg_sync_thread_last_message`** → `sync_thread_last_message()` — AFTER INSERT on `messages`. Updates the thread's `last_message` (a readable preview for structured types), `last_message_at`, and the *sender's* read marker so their own message is never unread to them.
- **`mark_thread_read(p_thread_id)`** — `SECURITY DEFINER` RPC that stamps the calling user's read marker, so the client needn't know whether it is `user_a` or `user_b`.

### Notification triggers (migration 014)

All are `SECURITY DEFINER` with `search_path = public`; they are the only writers of `notifications`.

| Trigger | On | Effect |
|---|---|---|
| `trg_notify_friend_request` | INSERT `friendships` | `friend_request` notification to the recipient |
| `trg_resolve_friend_request` | UPDATE of `status` / DELETE `friendships` | Marks the request notification `resolved`; on accept, sends `friend_accepted` to the requester |
| `trg_notify_borrow_request` | INSERT `messages` (`type = 'borrow_request'`) | `borrow_request` notification to the other participant |
| `trg_resolve_borrow_request` | UPDATE of `payload` on `messages` | When `payload.status` becomes `accepted`/`declined`: marks the notification `resolved`; on accept, sends `borrow_accepted` to the requester |

To add another notification type, copy this shape: a source-table trigger inserting into `notifications`, plus a resolve trigger if the notification is actionable.

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


### `010_fix_member_count_trigger.sql`

Data repair only. `hauses.member_count` had been double-counted (on create the client set it explicitly *and* the trigger incremented it; on leave the client decremented *and* the trigger did). The client no longer duplicates the trigger; this migration recomputes any drifted `member_count` from actual memberships. `v_member_count_drift` in `monitoring.sql` should now return no rows.

### `011_add_haus_collections.sql`

Adds `haus_collections` and `haus_collection_items` (previously in-memory only).

### `012_add_boards.sql`

Adds `boards`, `board_items`, and the `board_visibility` / `board_cover_style` enums (previously in-memory only).

### `013_add_messages.sql`

Adds `threads`, `messages`, the `message_type` / `thread_status` enums, the inbox-preview trigger, per-user read tracking with the `mark_thread_read` RPC, and a payload-only UPDATE grant so borrow requests can be accepted or declined.

### `014_add_interactions_and_notifications.sql`

Adds `item_favorites`, `item_comments`, `notifications`, the `notification_type` enum, and the four notification triggers above.

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
