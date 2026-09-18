# Supabase Backend Persistence & Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every mock/local-only feature (Haus Collections, Boards, Haus Members/invites, Messages, Favorites, Comments, Notifications) onto real Supabase tables, fix a pre-existing data-integrity bug in `haus.member_count`, and make list queries pagination-ready so nothing does an unbounded table scan as data grows.

**Architecture:** Every new table follows the exact conventions already established in `supabase/migrations/001_initial_schema.sql` through `009_add_rentals.sql`: uuid PKs via `uuid_generate_v4()`, `created_at`/`updated_at timestamptz not null default now()`, `on delete cascade` FKs, RLS enabled on every table with named policies (`"table: description"`), and `idx_<table>_<column>` indexes on every FK and every column used in a `WHERE`/`ORDER BY`. Each feature gets one migration file, one `src/services/*.ts` file (thin wrapper around `supabase.from(...)`, throws `Error(error.message)` on failure — matching `hausService.ts`), a matching Jest test file using the existing `makeChain()` mock pattern from `src/__tests__/services/hausService.test.ts`, and a Context rewrite that fetches from the service instead of holding pure `useState`.

**Tech Stack:** Supabase (Postgres 15 + RLS), `@supabase/supabase-js`, React Context, Jest + `jest-expo`.

**Scope notes (read before starting):**
- **I cannot execute SQL against the live database.** Every migration below is a new file in `supabase/migrations/`; you apply it via the Supabase SQL Editor exactly as 001–009 were applied (paste, run, verify). Each migration task ends with a verification query to run after pasting.
- **"Profile pictures and names"** (requested in scope) is not a separate subsystem — it was always a *symptom* of the Haus Members tab using a hardcoded local list instead of the real `haus_memberships → users` join that already exists. Part 4 fixes it by wiring the real data through; there is no separate migration for it.
- **Haus invites**: the current `haus_memberships` RLS policy only allows `auth.uid() = user_id` on insert — i.e. a user can only add *themselves* to a haus. An admin cannot unilaterally add someone else. Building a full pending-invite-with-approval system (a `haus_invites` table, push notification, accept/decline flow) is a separate feature, not implied by "polish the backend." Part 4 makes the Members list and the invite-link flow (which already works — it's just a shareable link, no DB write) real, and removes the fake "add member by @handle" UI that currently *looks* like it invites someone but never touches the database. If you want real pending invites, that's a good follow-up plan on its own.
- **Messages**: scoped to persistent threads/messages with pagination. Realtime (live-updating chat via Supabase Realtime subscriptions) is explicitly YAGNI'd here — polling/refetch-on-focus is what `MessagesContext` already does structurally for other data. Say the word if you want realtime added; it's a small follow-up once the tables exist.
- **Notifications**: scoped to the table, RLS, and one concrete trigger (friend request → notification) as a working example. Wiring every event type (haus invite, borrow request, message) to generate notifications is mechanical repetition of the same trigger pattern — Task 6.2 shows you exactly how to add more, but I'm not speculatively building triggers for event types that don't have a finished feature yet (e.g. haus invites don't exist as a flow — see above).

---

## Part 1 — Fix the `member_count` double-count bug

**Why first:** this is a real, already-shipped correctness bug independent of everything else, cheap to fix, and worth doing before adding more code that reads `member_count`.

**The bug:** `supabase/migrations/001_initial_schema.sql` creates a trigger `trg_haus_member_count` that increments/decrements `hauses.member_count` on every `haus_memberships` insert/delete. Separately:
- `src/services/hausService.ts` → `createHaus()` inserts the new haus row with `member_count: 1` explicitly, *then* inserts the creator's membership row. That membership insert fires the trigger, which increments `member_count` again → ends up at **2** for a brand-new haus with one member.
- `src/services/hausService.ts` → `leaveHaus()` deletes the membership row (trigger fires, decrements once), *then* calls the `decrement_haus_member_count` RPC, which decrements **again**.

**Files:**
- Create: `supabase/migrations/010_fix_member_count_trigger.sql`
- Modify: `src/services/hausService.ts:23-40` (`createHaus`), `src/services/hausService.ts:50-69` (`leaveHaus`)
- Test: `src/__tests__/services/hausService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/services/hausService.test.ts` (new `describe` blocks, after the existing `fetchHausMembers` block):

```typescript
// ---------------------------------------------------------------------------
// createHaus
// ---------------------------------------------------------------------------
describe('createHaus', () => {
  it('does not set member_count on insert — the DB trigger owns it', async () => {
    const insertChain = makeChain({ data: makeHaus({ id: 'h1' }), error: null });
    insertChain.single = jest.fn().mockResolvedValue({ data: makeHaus({ id: 'h1' }), error: null });
    const membershipChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(insertChain)     // .from('hauses')
      .mockReturnValueOnce(membershipChain); // .from('haus_memberships')

    await createHaus({ name: 'Style Queens' }, 'user-1');

    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall).not.toHaveProperty('member_count');
  });
});

// ---------------------------------------------------------------------------
// leaveHaus
// ---------------------------------------------------------------------------
describe('leaveHaus', () => {
  it('deletes the membership and does not call the decrement RPC', async () => {
    const deleteChain = makeChain({ data: null, error: null });
    const mockRpc = jest.fn();
    mockFrom.mockReturnValue(deleteChain);
    (require('../../lib/supabase').supabase as any).rpc = mockRpc;

    await leaveHaus('h1', 'user-1');

    expect(mockFrom).toHaveBeenCalledWith('haus_memberships');
    expect(deleteChain.eq).toHaveBeenCalledWith('haus_id', 'h1');
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
```

Also update the mock setup at the top of the file to include `insert`, `delete`, and `single` in the chainable methods list, and export an `rpc` stub on the mocked `supabase` object:

```typescript
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'delete', 'update'];

  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);

  return chain;
}

const mockFrom = jest.fn();
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

import {
  fetchMyHauses,
  fetchAllHauses,
  fetchHausMembers,
  createHaus,
  leaveHaus,
} from '../../services/hausService';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/__tests__/services/hausService.test.ts -t "member_count|does not call the decrement RPC" -v`
Expected: FAIL — `createHaus`'s insert call currently includes `member_count: 1`; `leaveHaus` currently calls `mockRpc`.

- [ ] **Step 3: Fix `hausService.ts`**

In `src/services/hausService.ts`, change `createHaus`:

```typescript
export async function createHaus(
  payload: Pick<Haus, 'name' | 'description'>,
  userId: string,
): Promise<Haus> {
  const { data, error } = await supabase
    .from('hauses')
    .insert({ name: payload.name, description: payload.description ?? null })
    .select('id, name, description, cover_url, member_count, piece_count')
    .single();
  if (error) throw new Error(error.message);

  // Add creator as admin member — the trg_haus_member_count trigger
  // increments member_count from its column default (0) to 1 here.
  const { error: memberError } = await supabase
    .from('haus_memberships')
    .insert({ haus_id: data.id, user_id: userId, role: 'admin', joined_at: new Date().toISOString() });
  if (memberError) throw new Error(memberError.message);

  return data as Haus;
}
```

Change `leaveHaus`:

```typescript
export async function leaveHaus(hausId: string, userId: string): Promise<void> {
  // trg_haus_member_count decrements member_count automatically on delete.
  const { error } = await supabase
    .from('haus_memberships')
    .delete()
    .eq('haus_id', hausId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/__tests__/services/hausService.test.ts -v`
Expected: PASS (all tests, including the pre-existing ones — confirm you didn't break `fetchMyHauses`/`fetchAllHauses`/`fetchHausMembers`).

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/010_fix_member_count_trigger.sql`:

```sql
-- ============================================================
-- FIX: member_count was double-counted.
--
-- Root cause: trg_haus_member_count (001) already increments/
-- decrements hauses.member_count on every haus_memberships
-- insert/delete. The client (hausService.ts) was *also*
-- setting member_count: 1 explicitly on haus creation and
-- *also* calling decrement_haus_member_count() on leave,
-- double-applying both directions.
--
-- Fix is client-side (hausService.ts createHaus/leaveHaus no
-- longer duplicate what the trigger does) — this migration
-- only repairs existing rows whose count has drifted from the
-- ground truth (actual membership rows).
-- ============================================================

update public.hauses h
set member_count = (
  select count(*) from public.haus_memberships m where m.haus_id = h.id
),
updated_at = now()
where member_count <> (
  select count(*) from public.haus_memberships m where m.haus_id = h.id
);

-- decrement_haus_member_count (007) is no longer called by the
-- client. Left in place (unused) rather than dropped — cheap to
-- keep, no downside, avoids a migration that could fail if
-- something else references it.
```

- [ ] **Step 6: Verify the migration**

After pasting into the Supabase SQL Editor and running it, verify with:

```sql
select h.id, h.name, h.member_count, count(m.id) as actual_members
from public.hauses h
left join public.haus_memberships m on m.haus_id = h.id
group by h.id, h.name, h.member_count
having h.member_count <> count(m.id);
```

Expected: **0 rows** (no drift remaining).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/010_fix_member_count_trigger.sql src/services/hausService.ts src/__tests__/services/hausService.test.ts
git commit -m "fix: stop double-counting haus.member_count on create/leave"
```

---

## Part 2 — Haus Collections persistence

**Files:**
- Create: `supabase/migrations/011_add_haus_collections.sql`
- Create: `src/services/collectionService.ts`
- Create: `src/__tests__/services/collectionService.test.ts`
- Modify: `src/context/HausCollectionsContext.tsx` (full rewrite)
- Modify: `src/screens/hauses/HausDetailScreen.tsx` (drop `MOCK_HAUS_ITEMS` usage in `resolveCollectionItem`)
- Modify: `src/screens/hauses/CollectionDetailScreen.tsx`, `src/screens/hauses/AddItemsToCollectionScreen.tsx` (drop `MOCK_HAUS_ITEMS` usage)

### Task 2.1: Migration

- [ ] **Step 1: Write `supabase/migrations/011_add_haus_collections.sql`**

```sql
-- ============================================================
-- Haus Collections: curated sub-groupings of items within a
-- Haus. Previously pure client-side state (HausCollectionsContext)
-- with fake MOCK_HAUS_ITEMS mixed in — this makes it real.
-- ============================================================

create table public.haus_collections (
  id         uuid primary key default uuid_generate_v4(),
  haus_id    uuid not null references public.hauses(id) on delete cascade,
  name       text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.haus_collection_items (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.haus_collections(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  added_by      uuid not null references public.users(id) on delete cascade,
  added_at      timestamptz not null default now(),
  unique (collection_id, item_id)
);

-- Indexes
create index idx_haus_collections_haus_id       on public.haus_collections (haus_id);
create index idx_collection_items_collection_id on public.haus_collection_items (collection_id);
create index idx_collection_items_item_id       on public.haus_collection_items (item_id);

-- RLS
alter table public.haus_collections      enable row level security;
alter table public.haus_collection_items enable row level security;

-- haus_collections: any haus member can read/create; only the
-- creator can rename/delete (mirrors "creator as admin" pattern
-- used for hauses themselves).
create policy "haus_collections: member read" on public.haus_collections
  for select
  using (exists (
    select 1 from public.haus_memberships
    where haus_id = haus_collections.haus_id and user_id = auth.uid()
  ));

create policy "haus_collections: member insert" on public.haus_collections
  for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.haus_memberships
      where haus_id = haus_collections.haus_id and user_id = auth.uid()
    )
  );

create policy "haus_collections: creator update" on public.haus_collections
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "haus_collections: creator delete" on public.haus_collections
  for delete
  using (auth.uid() = created_by);

-- haus_collection_items: any haus member can read/add; only the
-- person who added an item can remove it (so you can't yank
-- someone else's contribution).
create policy "haus_collection_items: member read" on public.haus_collection_items
  for select
  using (exists (
    select 1 from public.haus_collections c
    join public.haus_memberships m on m.haus_id = c.haus_id
    where c.id = haus_collection_items.collection_id and m.user_id = auth.uid()
  ));

create policy "haus_collection_items: member insert" on public.haus_collection_items
  for insert
  with check (
    auth.uid() = added_by
    and exists (
      select 1 from public.haus_collections c
      join public.haus_memberships m on m.haus_id = c.haus_id
      where c.id = haus_collection_items.collection_id and m.user_id = auth.uid()
    )
  );

create policy "haus_collection_items: adder delete" on public.haus_collection_items
  for delete
  using (auth.uid() = added_by);

create trigger trg_haus_collections_updated_at
  before update on public.haus_collections
  for each row execute procedure public.set_updated_at();
```

- [ ] **Step 2: Verify** (after applying in SQL Editor)

```sql
select * from public.v_rls_policy_status where table_name in ('haus_collections', 'haus_collection_items');
```

Expected: both rows show `rls_status = 'enabled'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/011_add_haus_collections.sql
git commit -m "feat: add haus_collections and haus_collection_items tables"
```

### Task 2.2: `collectionService.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/services/collectionService.test.ts`:

```typescript
/**
 * Unit tests for src/services/collectionService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'delete', 'update'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

const mockFrom = jest.fn();
jest.mock('../../lib/supabase', () => ({ supabase: { from: mockFrom } }));

import {
  fetchCollectionsForHaus,
  fetchCollectionItems,
  createCollection,
  addItemsToCollection,
  removeItemFromCollection,
} from '../../services/collectionService';

beforeEach(() => { jest.clearAllMocks(); });

describe('fetchCollectionsForHaus', () => {
  it('queries haus_collections filtered by haus_id, newest first', async () => {
    const chain = makeChain({ data: [{ id: 'c1', haus_id: 'h1', name: 'Date Night', created_by: 'u1', created_at: '2026-01-01', haus_collection_items: [{ count: 3 }] }], error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchCollectionsForHaus('h1');

    expect(mockFrom).toHaveBeenCalledWith('haus_collections');
    expect(chain.eq).toHaveBeenCalledWith('haus_id', 'h1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(1);
    expect(result[0].itemCount).toBe(3);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchCollectionsForHaus('h1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchCollectionsForHaus('h1')).rejects.toThrow('DB error');
  });
});

describe('fetchCollectionItems', () => {
  it('joins to items and returns them', async () => {
    const data = [{ item: { id: 'i1', name: 'Denim Jacket', owner_id: 'u1', price_per_day: 1200, status: 'available' } }];
    const chain = makeChain({ data, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchCollectionItems('c1');

    expect(mockFrom).toHaveBeenCalledWith('haus_collection_items');
    expect(chain.eq).toHaveBeenCalledWith('collection_id', 'c1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Denim Jacket');
  });
});

describe('createCollection', () => {
  it('inserts with haus_id, name, created_by and returns the row', async () => {
    const chain = makeChain({ data: { id: 'c1', haus_id: 'h1', name: 'Date Night', created_by: 'u1', created_at: '2026-01-01' }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createCollection('h1', 'Date Night', 'u1');

    expect(chain.insert).toHaveBeenCalledWith({ haus_id: 'h1', name: 'Date Night', created_by: 'u1' });
    expect(result.id).toBe('c1');
  });
});

describe('addItemsToCollection', () => {
  it('inserts one row per item id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await addItemsToCollection('c1', ['i1', 'i2'], 'u1');

    expect(chain.insert).toHaveBeenCalledWith([
      { collection_id: 'c1', item_id: 'i1', added_by: 'u1' },
      { collection_id: 'c1', item_id: 'i2', added_by: 'u1' },
    ]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'duplicate key' } }));
    await expect(addItemsToCollection('c1', ['i1'], 'u1')).rejects.toThrow('duplicate key');
  });
});

describe('removeItemFromCollection', () => {
  it('deletes by collection_id and item_id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await removeItemFromCollection('c1', 'i1');

    expect(chain.eq).toHaveBeenCalledWith('collection_id', 'c1');
    expect(chain.eq).toHaveBeenCalledWith('item_id', 'i1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/__tests__/services/collectionService.test.ts -v`
Expected: FAIL with "Cannot find module '../../services/collectionService'".

- [ ] **Step 3: Write `src/services/collectionService.ts`**

```typescript
import { supabase } from '../lib/supabase';
import type { Item } from '../types';

export interface HausCollectionRow {
  id: string;
  hausId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  itemCount: number;
}

export async function fetchCollectionsForHaus(hausId: string): Promise<HausCollectionRow[]> {
  const { data, error } = await supabase
    .from('haus_collections')
    .select('id, haus_id, name, created_by, created_at, haus_collection_items(count)')
    .eq('haus_id', hausId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id:        row.id,
    hausId:    row.haus_id,
    name:      row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    itemCount: row.haus_collection_items?.[0]?.count ?? 0,
  }));
}

export async function fetchCollectionItems(collectionId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('haus_collection_items')
    .select(`item:items(id, owner_id, name, photo_url, category, size_label, price_per_day, status, location_label, owner:users(id, display_name, avatar_url))`)
    .eq('collection_id', collectionId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => row.item).filter(Boolean) as Item[];
}

export async function createCollection(hausId: string, name: string, userId: string): Promise<HausCollectionRow> {
  const { data, error } = await supabase
    .from('haus_collections')
    .insert({ haus_id: hausId, name, created_by: userId })
    .select('id, haus_id, name, created_by, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, hausId: data.haus_id, name: data.name,
    createdBy: data.created_by, createdAt: data.created_at, itemCount: 0,
  };
}

export async function addItemsToCollection(collectionId: string, itemIds: string[], userId: string): Promise<void> {
  const { error } = await supabase
    .from('haus_collection_items')
    .insert(itemIds.map(itemId => ({ collection_id: collectionId, item_id: itemId, added_by: userId })));

  if (error) throw new Error(error.message);
}

export async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('haus_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('item_id', itemId);

  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/__tests__/services/collectionService.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/collectionService.ts src/__tests__/services/collectionService.test.ts
git commit -m "feat: add collectionService backed by haus_collections tables"
```

### Task 2.3: Rewire `HausCollectionsContext`

- [ ] **Step 1: Rewrite `src/context/HausCollectionsContext.tsx`**

```typescript
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchCollectionsForHaus, createCollection as createCollectionRemote,
  addItemsToCollection as addItemsRemote, removeItemFromCollection as removeItemRemote,
  type HausCollectionRow,
} from '../services/collectionService';

export interface HausCollection {
  id: string;
  hausId: string;
  name: string;
  itemIds: string[]; // populated lazily by fetchCollectionItems in the detail screen
  createdBy: string;
  createdAt: string;
  itemCount: number;
}

function toCollection(row: HausCollectionRow): HausCollection {
  return { ...row, itemIds: [] };
}

interface HausCollectionsContextValue {
  collectionsByHaus: Record<string, HausCollection[]>;
  isLoading: boolean;
  loadCollectionsForHaus: (hausId: string) => Promise<void>;
  getCollectionsForHaus: (hausId: string) => HausCollection[];
  getCollectionById: (id: string) => HausCollection | undefined;
  createHausCollection: (hausId: string, name: string) => Promise<HausCollection>;
  addItemsToCollection: (collectionId: string, itemIds: string[]) => Promise<void>;
  removeItemFromCollection: (collectionId: string, itemId: string) => Promise<void>;
}

const HausCollectionsContext = createContext<HausCollectionsContextValue | null>(null);

export function HausCollectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collectionsByHaus, setCollectionsByHaus] = useState<Record<string, HausCollection[]>>({});
  const [isLoading, setLoading] = useState(false);

  const loadCollectionsForHaus = useCallback(async (hausId: string) => {
    setLoading(true);
    try {
      const rows = await fetchCollectionsForHaus(hausId);
      setCollectionsByHaus(prev => ({ ...prev, [hausId]: rows.map(toCollection) }));
    } finally {
      setLoading(false);
    }
  }, []);

  function getCollectionsForHaus(hausId: string): HausCollection[] {
    return collectionsByHaus[hausId] ?? [];
  }

  function getCollectionById(id: string): HausCollection | undefined {
    for (const list of Object.values(collectionsByHaus)) {
      const found = list.find(c => c.id === id);
      if (found) return found;
    }
    return undefined;
  }

  async function createHausCollection(hausId: string, name: string): Promise<HausCollection> {
    if (!user?.id) throw new Error('Not authenticated');
    const row = await createCollectionRemote(hausId, name, user.id);
    const collection = toCollection(row);
    setCollectionsByHaus(prev => ({ ...prev, [hausId]: [collection, ...(prev[hausId] ?? [])] }));
    return collection;
  }

  async function addItemsToCollection(collectionId: string, itemIds: string[]): Promise<void> {
    if (!user?.id) throw new Error('Not authenticated');
    await addItemsRemote(collectionId, itemIds, user.id);
    setCollectionsByHaus(prev => {
      const next = { ...prev };
      for (const hausId of Object.keys(next)) {
        next[hausId] = next[hausId].map(c =>
          c.id === collectionId ? { ...c, itemCount: c.itemCount + itemIds.length } : c,
        );
      }
      return next;
    });
  }

  async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
    await removeItemRemote(collectionId, itemId);
    setCollectionsByHaus(prev => {
      const next = { ...prev };
      for (const hausId of Object.keys(next)) {
        next[hausId] = next[hausId].map(c =>
          c.id === collectionId ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c,
        );
      }
      return next;
    });
  }

  return (
    <HausCollectionsContext.Provider value={{
      collectionsByHaus, isLoading, loadCollectionsForHaus,
      getCollectionsForHaus, getCollectionById,
      createHausCollection, addItemsToCollection, removeItemFromCollection,
    }}>
      {children}
    </HausCollectionsContext.Provider>
  );
}

export function useHausCollections(): HausCollectionsContextValue {
  const ctx = useContext(HausCollectionsContext);
  if (!ctx) throw new Error('useHausCollections must be used within HausCollectionsProvider');
  return ctx;
}
```

Note: `MOCK_HAUS_ITEMS` and the `CollectionItem` mock type are deleted entirely — collections now only ever reference real `items` rows.

- [ ] **Step 2: Update call sites**

In `src/screens/hauses/HausDetailScreen.tsx`:
- Replace the `import { useHausCollections, MOCK_HAUS_ITEMS, type HausCollection } from '../../context/HausCollectionsContext';` with `import { useHausCollections, type HausCollection } from '../../context/HausCollectionsContext';`.
- Add a `useEffect(() => { loadCollectionsForHaus(haus.id); }, [haus.id])` (destructure `loadCollectionsForHaus` from `useHausCollections()`).
- Simplify `resolveCollectionItem` (added in the redesign) to only look at `closetItems` — delete the `MOCK_HAUS_ITEMS` fallback branch, since collection items are always real now:

```typescript
function resolveCollectionItem(id: string, closetItems: Item[]) {
  const real = closetItems.find(i => i.id === id);
  if (real) return { ownerId: real.owner_id as string | undefined, photoUrl: real.photo_url, thumbColor: '#E4E0D0' };
  return { ownerId: undefined as string | undefined, photoUrl: undefined, thumbColor: '#EEEAE0' };
}
```
- Replace the `onPress={() => setLeaveVisible ... createLargeBtn}` collection-create handler to call `createHausCollection(haus.id, name)` (this was previously a modal/prompt — check `CreateCollectionScreen.tsx` and wire its submit handler to `createHausCollection` instead of the old `addCollection`).

In `src/screens/hauses/CreateCollectionScreen.tsx`: replace `addCollection(...)` call with `await createHausCollection(hausId, name)` (now async — wrap the submit handler and show a loading state on the button, matching the pattern already used for `handleRename` in `HausDetailScreen.tsx`).

In `src/screens/hauses/CollectionDetailScreen.tsx` and `src/screens/hauses/AddItemsToCollectionScreen.tsx`: remove all `MOCK_HAUS_ITEMS` imports/usages; item lists now come from `fetchCollectionItems(collectionId)` (call it in a `useEffect`, same pattern as `HausCollectionsContext.loadCollectionsForHaus`) rather than resolving `collection.itemIds` against a mixed real/mock pool.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `HausCollectionsContext.tsx`, `HausDetailScreen.tsx`, `CreateCollectionScreen.tsx`, `CollectionDetailScreen.tsx`, `AddItemsToCollectionScreen.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/context/HausCollectionsContext.tsx src/screens/hauses/HausDetailScreen.tsx src/screens/hauses/CreateCollectionScreen.tsx src/screens/hauses/CollectionDetailScreen.tsx src/screens/hauses/AddItemsToCollectionScreen.tsx
git commit -m "feat: wire HausCollectionsContext to real Supabase data"
```

---

## Part 3 — Boards persistence

Mirrors Part 2 exactly, one level simpler (owned by a single user, not a haus).

**Files:**
- Create: `supabase/migrations/012_add_boards.sql`
- Create: `src/services/boardService.ts`
- Create: `src/__tests__/services/boardService.test.ts`
- Modify: `src/context/BoardsContext.tsx` (full rewrite)

### Task 3.1: Migration

- [ ] **Step 1: Write `supabase/migrations/012_add_boards.sql`**

```sql
-- ============================================================
-- Boards: a closet owner's personal curated groupings of their
-- own items. Previously pure client-side state (BoardsContext),
-- lost on every refresh.
-- ============================================================

create type board_visibility  as enum ('public', 'friends', 'hauses', 'private');
create type board_cover_style as enum ('mosaic', 'single', 'stack');

create table public.boards (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.users(id) on delete cascade,
  name         text not null,
  visibility   board_visibility  not null default 'private',
  cover_style  board_cover_style not null default 'mosaic',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.board_items (
  id         uuid primary key default uuid_generate_v4(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  item_id    uuid not null references public.items(id)  on delete cascade,
  position   integer not null default 0,
  added_at   timestamptz not null default now(),
  unique (board_id, item_id)
);

create index idx_boards_owner_id       on public.boards (owner_id);
create index idx_board_items_board_id  on public.board_items (board_id);
create index idx_board_items_item_id   on public.board_items (item_id);

alter table public.boards      enable row level security;
alter table public.board_items enable row level security;

-- Boards are owner-only for every operation except reading a
-- non-private board, which follows the same visibility model as
-- items (public/friends/hauses/private). Keeping the read policy
-- simple for now: owner can always read; everyone authenticated
-- can read non-private boards. Friends/hauses-scoped visibility
-- enforcement (matching item visibility) is a follow-up — this
-- matches what the client currently does (no cross-user board
-- viewing exists yet in the UI).
create policy "boards: owner read" on public.boards
  for select using (auth.uid() = owner_id);

create policy "boards: public read" on public.boards
  for select using (visibility != 'private' and auth.role() = 'authenticated');

create policy "boards: owner insert" on public.boards
  for insert with check (auth.uid() = owner_id);

create policy "boards: owner update" on public.boards
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "boards: owner delete" on public.boards
  for delete using (auth.uid() = owner_id);

create policy "board_items: owner read" on public.board_items
  for select using (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create policy "board_items: owner insert" on public.board_items
  for insert with check (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create policy "board_items: owner delete" on public.board_items
  for delete using (exists (
    select 1 from public.boards where id = board_items.board_id and owner_id = auth.uid()
  ));

create trigger trg_boards_updated_at
  before update on public.boards
  for each row execute procedure public.set_updated_at();
```

- [ ] **Step 2: Verify**

```sql
select * from public.v_rls_policy_status where table_name in ('boards', 'board_items');
```

Expected: both `rls_status = 'enabled'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/012_add_boards.sql
git commit -m "feat: add boards and board_items tables"
```

### Task 3.2: `boardService.ts`

- [ ] **Step 1: Write the failing test** — create `src/__tests__/services/boardService.test.ts` following the exact same `makeChain` pattern as `collectionService.test.ts` (Task 2.2, Step 1), testing:
  - `fetchMyBoards(userId)` → queries `boards`, `.eq('owner_id', userId)`, `.order('created_at', {ascending: false})`
  - `createBoard(userId, name, visibility, coverStyle)` → inserts, returns row
  - `updateBoard(boardId, updates)` → updates by id
  - `deleteBoard(boardId)` → deletes by id
  - `addItemsToBoard(boardId, itemIds)` → bulk insert into `board_items`
  - `removeItemFromBoard(boardId, itemId)` → delete by `board_id` + `item_id`
  - `moveItemToBoard(fromBoardId, toBoardId, itemId)` → delete from source, insert into destination (two calls)

  (Same structure as Task 2.2's test file — write it with the same level of coverage: happy path, null data, and Supabase-error-throws for each function.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/__tests__/services/boardService.test.ts -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/boardService.ts`**

```typescript
import { supabase } from '../lib/supabase';
import type { Board, CoverStyle, VisibilityMode } from '../types';

export async function fetchMyBoards(userId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, name, visibility, cover_style, created_at, board_items(item_id)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id:          row.id,
    ownerId:     row.owner_id,
    name:        row.name,
    visibility:  row.visibility as VisibilityMode,
    coverStyle:  row.cover_style as CoverStyle,
    createdAt:   row.created_at,
    itemIds:     (row.board_items ?? []).map((bi: any) => bi.item_id),
  }));
}

export async function createBoard(
  userId: string, name: string, visibility: VisibilityMode, coverStyle: CoverStyle,
): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .insert({ owner_id: userId, name, visibility, cover_style: coverStyle })
    .select('id, owner_id, name, visibility, cover_style, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, ownerId: data.owner_id, name: data.name,
    visibility: data.visibility, coverStyle: data.cover_style,
    createdAt: data.created_at, itemIds: [],
  };
}

export async function updateBoard(boardId: string, updates: Partial<Pick<Board, 'name' | 'visibility' | 'coverStyle'>>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.visibility !== undefined) payload.visibility = updates.visibility;
  if (updates.coverStyle !== undefined) payload.cover_style = updates.coverStyle;

  const { error } = await supabase.from('boards').update(payload).eq('id', boardId);
  if (error) throw new Error(error.message);
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  if (error) throw new Error(error.message);
}

export async function addItemsToBoard(boardId: string, itemIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('board_items')
    .insert(itemIds.map(itemId => ({ board_id: boardId, item_id: itemId })));
  if (error) throw new Error(error.message);
}

export async function removeItemFromBoard(boardId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('board_items')
    .delete()
    .eq('board_id', boardId)
    .eq('item_id', itemId);
  if (error) throw new Error(error.message);
}

export async function moveItemToBoard(fromBoardId: string, toBoardId: string, itemId: string): Promise<void> {
  await removeItemFromBoard(fromBoardId, itemId);
  const { error } = await supabase
    .from('board_items')
    .insert({ board_id: toBoardId, item_id: itemId });
  if (error) throw new Error(error.message);
}
```

Note: `types/index.ts`'s `Board` interface already has `ownerId`/`itemIds`/`createdAt` — this matches it directly, no type changes needed.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/__tests__/services/boardService.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/boardService.ts src/__tests__/services/boardService.test.ts
git commit -m "feat: add boardService backed by boards tables"
```

### Task 3.3: Rewire `BoardsContext`

- [ ] **Step 1: Rewrite `src/context/BoardsContext.tsx`**

```typescript
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchMyBoards, createBoard as createBoardRemote, updateBoard as updateBoardRemote,
  deleteBoard as deleteBoardRemote, addItemsToBoard as addItemsRemote,
  removeItemFromBoard as removeItemRemote, moveItemToBoard as moveItemRemote,
} from '../services/boardService';
import type { Board } from '../types';

interface BoardsContextValue {
  boards: Board[];
  isLoading: boolean;
  addBoard: (board: Pick<Board, 'name' | 'visibility' | 'coverStyle'>) => Promise<void>;
  updateBoard: (board: Board) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  addItemsToBoard: (boardId: string, itemIds: string[]) => Promise<void>;
  removeItemFromBoard: (boardId: string, itemId: string) => Promise<void>;
  moveItemToBoard: (fromBoardId: string, toBoardId: string, itemId: string) => Promise<void>;
}

const BoardsContext = createContext<BoardsContextValue | null>(null);

export function BoardsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) { setBoards([]); setLoading(false); return; }
      setLoading(true);
      try {
        const remote = await fetchMyBoards(user.id);
        if (!cancelled) setBoards(remote);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function addBoard(board: Pick<Board, 'name' | 'visibility' | 'coverStyle'>) {
    if (!user?.id) throw new Error('Not authenticated');
    const created = await createBoardRemote(user.id, board.name, board.visibility, board.coverStyle);
    setBoards(prev => [created, ...prev]);
  }

  async function updateBoard(updated: Board) {
    await updateBoardRemote(updated.id, updated);
    setBoards(prev => prev.map(b => b.id === updated.id ? updated : b));
  }

  async function deleteBoard(boardId: string) {
    await deleteBoardRemote(boardId);
    setBoards(prev => prev.filter(b => b.id !== boardId));
  }

  async function addItemsToBoard(boardId: string, itemIds: string[]) {
    await addItemsRemote(boardId, itemIds);
    setBoards(prev => prev.map(b =>
      b.id === boardId ? { ...b, itemIds: [...b.itemIds, ...itemIds.filter(id => !b.itemIds.includes(id))] } : b,
    ));
  }

  async function removeItemFromBoard(boardId: string, itemId: string) {
    await removeItemRemote(boardId, itemId);
    setBoards(prev => prev.map(b =>
      b.id === boardId ? { ...b, itemIds: b.itemIds.filter(id => id !== itemId) } : b,
    ));
  }

  async function moveItemToBoard(fromBoardId: string, toBoardId: string, itemId: string) {
    await moveItemRemote(fromBoardId, toBoardId, itemId);
    setBoards(prev => prev.map(b => {
      if (b.id === fromBoardId) return { ...b, itemIds: b.itemIds.filter(id => id !== itemId) };
      if (b.id === toBoardId) return { ...b, itemIds: [...b.itemIds, itemId] };
      return b;
    }));
  }

  return (
    <BoardsContext.Provider value={{
      boards, isLoading, addBoard, updateBoard, deleteBoard,
      addItemsToBoard, removeItemFromBoard, moveItemToBoard,
    }}>
      {children}
    </BoardsContext.Provider>
  );
}

export function useBoards(): BoardsContextValue {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error('useBoards must be used within BoardsProvider');
  return ctx;
}
```

- [ ] **Step 2: Update call sites**

`addBoard` and `updateBoard`/`deleteBoard` are now async. Check `src/screens/boards/CreateBoardScreen.tsx` (`handleSave`, `handleDelete`) and `src/screens/closet/ClosetScreen.tsx` (`BoardsGrid`/`onCreatePress` chain) — `await` the calls and show a loading/disabled state on the submit button while in flight (same pattern as `HausesScreen.tsx`'s `confirmLeave`/`isLeaving`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `BoardsContext.tsx`, `CreateBoardScreen.tsx`, `ClosetScreen.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/context/BoardsContext.tsx src/screens/boards/CreateBoardScreen.tsx src/screens/closet/ClosetScreen.tsx
git commit -m "feat: wire BoardsContext to real Supabase data"
```

---

## Part 4 — Real Haus Members (fixes "profile pictures and names")

**Files:**
- Modify: `src/screens/hauses/HausDetailScreen.tsx` (Members tab + Invite modal)
- No new migration — `haus_memberships` and `fetchHausMembers` already exist.

- [ ] **Step 1: Extend `fetchHausMembers` to return more than 5 and include role**

`src/services/hausService.ts` currently caps at `.limit(5)` — fine for a "preview" use case, wrong for an actual Members tab. Add a second function rather than changing the existing one's contract (callers of the 5-row preview version may exist elsewhere):

```typescript
export interface HausMemberRow {
  userId: string;
  role: 'member' | 'admin';
  joinedAt: string;
  displayName: string;
  avatarUrl?: string;
}

export async function fetchAllHausMembers(hausId: string): Promise<HausMemberRow[]> {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select(`user_id, role, joined_at, user:users(id, display_name, avatar_url)`)
    .eq('haus_id', hausId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    userId:      row.user_id,
    role:        row.role,
    joinedAt:    row.joined_at,
    displayName: row.user?.display_name ?? 'Member',
    avatarUrl:   row.user?.avatar_url ?? undefined,
  }));
}
```

Add a Jest test for it in `src/__tests__/services/hausService.test.ts` following the exact same shape as the existing `fetchHausMembers` `describe` block (happy path, null data, Supabase error, ordering).

- [ ] **Step 2: Wire the Members tab in `HausDetailScreen.tsx`**

Replace the local mock `members` state:

```typescript
const [members, setMembers] = useState<InviteMember[]>([
  { id: 'me', name: 'You', handle: '@you', initials: 'ME', isYou: true },
]);
```

with a real fetch:

```typescript
const [members, setMembers] = useState<HausMemberRow[]>([]);

useEffect(() => {
  let cancelled = false;
  fetchAllHausMembers(haus.id).then(rows => { if (!cancelled) setMembers(rows); }).catch(() => {});
  return () => { cancelled = true; };
}, [haus.id]);
```

Update `HausMembersList` (the component rendering the Members tab) to take `HausMemberRow[]` instead of `InviteMember[]`, deriving initials from `displayName` (same `.split(' ').map(w => w[0])` pattern used elsewhere in this file for `myInitials`) and showing `avatarUrl` as an `<Image>` when present, falling back to the initials circle when not — mirror the "isMine" avatar treatment already built for `HausItemGrid`'s owner badges (yellow fill when `row.userId === user?.id`, else `ivoryMid`).

- [ ] **Step 3: Remove the fake "add member by @handle" UI**

`handleAddMember`/`handleRemoveMember` in `HausDetailScreen.tsx` currently push/splice a local array — this never touches the database, so tapping "ADD" in the invite modal *looks* like it added someone but didn't. Delete `handleAddMember`, `handleRemoveMember`, `inviteInput`/`setInviteInput` state, and the corresponding input row + member-list-with-remove-button block inside the Invite modal (`modal.inviteRow`, the per-member `Pressable onPress={() => handleRemoveMember(m.id)}`). Keep the "SHARE INVITE" section (copy link / QR / story) exactly as-is — that part doesn't claim to do something it doesn't; it's a real shareable link. Replace the deleted member-list-with-remove-button block with a read-only render of the same `members` (now real) list you just wired in Step 2, so the invite modal shows *who's actually in the haus* while someone shares the link.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `HausDetailScreen.tsx`, `hausService.ts`.

- [ ] **Step 5: Run the haus service tests**

Run: `npx jest src/__tests__/services/hausService.test.ts -v`
Expected: PASS, including the new `fetchAllHausMembers` tests.

- [ ] **Step 6: Commit**

```bash
git add src/services/hausService.ts src/__tests__/services/hausService.test.ts src/screens/hauses/HausDetailScreen.tsx
git commit -m "fix: wire Haus Members tab to real haus_memberships data, remove fake invite-add UI"
```

---

## Part 5 — Messages / threads

**Files:**
- Create: `supabase/migrations/013_add_messages.sql`
- Create: `src/services/messageService.ts`
- Create: `src/__tests__/services/messageService.test.ts`
- Modify: `src/context/MessagesContext.tsx` (full rewrite)

### Task 5.1: Migration

- [ ] **Step 1: Write `supabase/migrations/013_add_messages.sql`**

```sql
-- ============================================================
-- Messages: direct-message threads between two users, optionally
-- attached to an item (borrow negotiation). Previously pure
-- client-side state (MessagesContext) — every conversation was
-- lost on refresh.
-- ============================================================

create type message_type   as enum ('text', 'system', 'borrow_request', 'counter_offer', 'confirmed', 'item_mention');
create type thread_status  as enum ('pending_request', 'counter_sent', 'active_rental', 'completed', 'direct');

create table public.threads (
  id               uuid primary key default uuid_generate_v4(),
  user_a           uuid not null references public.users(id) on delete cascade,
  user_b           uuid not null references public.users(id) on delete cascade,
  item_id          uuid references public.items(id) on delete set null,
  status           thread_status not null default 'direct',
  last_message     text,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint threads_distinct_users check (user_a <> user_b),
  unique (user_a, user_b, item_id)
);

create table public.messages (
  id         uuid primary key default uuid_generate_v4(),
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender_id  uuid not null references public.users(id) on delete cascade,
  type       message_type not null default 'text',
  text       text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index idx_threads_user_a           on public.threads (user_a);
create index idx_threads_user_b           on public.threads (user_b);
create index idx_threads_last_message_at  on public.threads (last_message_at desc);
create index idx_messages_thread_created  on public.messages (thread_id, created_at desc);

alter table public.threads  enable row level security;
alter table public.messages enable row level security;

create policy "threads: participant read" on public.threads
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "threads: participant insert" on public.threads
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "threads: participant update" on public.threads
  for update using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "messages: participant read" on public.messages
  for select using (exists (
    select 1 from public.threads
    where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
  ));

create policy "messages: participant insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.threads
      where id = messages.thread_id and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

-- Keep threads.last_message / last_message_at in sync so the
-- inbox list query never has to join+aggregate messages.
create or replace function public.sync_thread_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.threads
     set last_message    = coalesce(new.text, '[' || new.type || ']'),
         last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end;
$$;

create trigger trg_sync_thread_last_message
  after insert on public.messages
  for each row execute procedure public.sync_thread_last_message();
```

- [ ] **Step 2: Verify**

```sql
select * from public.v_rls_policy_status where table_name in ('threads', 'messages');
```

Expected: both `rls_status = 'enabled'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/013_add_messages.sql
git commit -m "feat: add threads and messages tables"
```

### Task 5.2: `messageService.ts`

- [ ] **Step 1: Write the failing test** — create `src/__tests__/services/messageService.test.ts` (same `makeChain` pattern), covering:
  - `fetchThreads(userId, { limit = 20, before? })` → `.or('user_a.eq.USERID,user_b.eq.USERID')`, `.order('last_message_at', {ascending:false})`, `.limit(limit)`
  - `fetchMessages(threadId, { limit = 30, before? })` → `.eq('thread_id', threadId)`, `.order('created_at', {ascending:false})`, `.limit(limit)`, and when `before` is passed, `.lt('created_at', before)`
  - `findOrCreateThread(userId, otherUserId, itemId?)` → tries a `select` first (`.or()` matching either ordering of user_a/user_b), inserts if none found
  - `sendMessage(threadId, senderId, { text?, type?, payload? })` → inserts into `messages`

  Follow the exact coverage style of `collectionService.test.ts` (Task 2.2 Step 1): happy path, empty/null data, Supabase-error-throws, and one assertion per query-builder call that matters (which column filtered, what order, what limit).

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/__tests__/services/messageService.test.ts -v`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/services/messageService.ts`**

```typescript
import { supabase } from '../lib/supabase';
import type { ChatMessage, MessageType, Thread, ThreadStatus } from '../types';

const THREAD_SELECT = `
  id, user_a, user_b, item_id, status, last_message, last_message_at,
  a:users!threads_user_a_fkey(id, display_name, avatar_url),
  b:users!threads_user_b_fkey(id, display_name, avatar_url)
`;

function toThread(row: any, myId: string): Thread {
  const other = row.user_a === myId ? row.b : row.a;
  return {
    id: row.id,
    otherUser: {
      id: other?.id ?? '', name: other?.display_name ?? 'User',
      handle: '', initials: (other?.display_name ?? 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      avatarColor: '#E2DED0',
    },
    status: row.status as ThreadStatus,
    unread: false,
    lastMessage: row.last_message ?? '',
    lastMessageTime: row.last_message_at,
    messages: [],
  };
}

export async function fetchThreads(userId: string, opts: { limit?: number } = {}): Promise<Thread[]> {
  const limit = opts.limit ?? 20;
  const { data, error } = await supabase
    .from('threads')
    .select(THREAD_SELECT)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => toThread(row, userId));
}

export async function fetchMessages(threadId: string, opts: { limit?: number; before?: string } = {}): Promise<ChatMessage[]> {
  const limit = opts.limit ?? 30;
  let query = supabase
    .from('messages')
    .select('id, thread_id, sender_id, type, text, payload, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.before) query = query.lt('created_at', opts.before);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).reverse().map((row: any) => ({
    id: row.id, threadId: row.thread_id, type: row.type as MessageType,
    senderId: row.sender_id, text: row.text ?? undefined,
    payload: row.payload ?? undefined, timestamp: row.created_at,
  }));
}

export async function findOrCreateThread(userId: string, otherUserId: string, itemId?: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('threads')
    .select('id')
    .or(`and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`)
    .eq('item_id', itemId ?? null)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('threads')
    .insert({ user_a: userId, user_b: otherUserId, item_id: itemId ?? null })
    .select('id')
    .single();

  if (createError) throw new Error(createError.message);
  return created.id;
}

export async function sendMessage(
  threadId: string, senderId: string,
  payload: { text?: string; type?: MessageType; data?: unknown },
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId, sender_id: senderId,
      type: payload.type ?? 'text', text: payload.text ?? null,
      payload: payload.data ?? null,
    })
    .select('id, thread_id, sender_id, type, text, payload, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, threadId: data.thread_id, type: data.type,
    senderId: data.sender_id, text: data.text ?? undefined,
    payload: data.payload ?? undefined, timestamp: data.created_at,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/__tests__/services/messageService.test.ts -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/messageService.ts src/__tests__/services/messageService.test.ts
git commit -m "feat: add messageService backed by threads/messages tables"
```

### Task 5.3: Rewire `MessagesContext`

- [ ] **Step 1: Rewrite `src/context/MessagesContext.tsx`** to fetch `fetchThreads(user.id)` on mount/focus (drop the module-level `nextThreadId`/`nextMessageId` counters — the DB assigns UUIDs now), expose `openThread(threadId)` which lazily calls `fetchMessages(threadId)`, and `sendMessage(threadId, text)` which calls the real `sendMessage` service function then appends the returned row to local state (optimistic-append pattern, same shape as `ClosetContext.addItem`).

  Read the current `src/context/MessagesContext.tsx` in full before rewriting — its existing public interface (`useMessages()` return shape: `threads`, `openThread`, `sendMessage`, etc.) is consumed by `MessagesScreen.tsx`, `ChatThreadScreen.tsx`, and `MakeOfferScreen.tsx`. Keep the exact same function names/signatures so those three screens don't need changes — only the *implementation* moves from local mutation to service calls + local cache update.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `MessagesContext.tsx`, `MessagesScreen.tsx`, `ChatThreadScreen.tsx`, `MakeOfferScreen.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/context/MessagesContext.tsx
git commit -m "feat: wire MessagesContext to real Supabase threads/messages"
```

---

## Part 6 — Favorites, Comments, Notifications

**Files:**
- Create: `supabase/migrations/014_add_interactions_and_notifications.sql`
- Create: `src/services/interactionsService.ts`
- Create: `src/services/notificationService.ts`
- Create: `src/__tests__/services/interactionsService.test.ts`, `src/__tests__/services/notificationService.test.ts`
- Modify: `src/context/InteractionsContext.tsx`, `src/context/RequestsContext.tsx` (full rewrites)

### Task 6.1: Migration

- [ ] **Step 1: Write `supabase/migrations/014_add_interactions_and_notifications.sql`**

```sql
-- ============================================================
-- Favorites + comments on items, and a user notification feed.
-- All three were pure client-side state before this
-- (InteractionsContext, RequestsContext) with client-generated
-- IDs and hardcoded seed data.
-- ============================================================

create table public.item_favorites (
  user_id    uuid not null references public.users(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.item_comments (
  id         uuid primary key default uuid_generate_v4(),
  item_id    uuid not null references public.items(id) on delete cascade,
  author_id  uuid not null references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create type notification_type as enum ('borrow_request', 'friend_request', 'haus_invite', 'message', 'system');

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       notification_type not null,
  payload    jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_item_favorites_item_id     on public.item_favorites (item_id);
create index idx_item_comments_item_created on public.item_comments (item_id, created_at desc);
create index idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index idx_notifications_user_unread  on public.notifications (user_id) where read = false;

alter table public.item_favorites enable row level security;
alter table public.item_comments  enable row level security;
alter table public.notifications  enable row level security;

create policy "item_favorites: authenticated read" on public.item_favorites
  for select using (auth.role() = 'authenticated');
create policy "item_favorites: self insert" on public.item_favorites
  for insert with check (auth.uid() = user_id);
create policy "item_favorites: self delete" on public.item_favorites
  for delete using (auth.uid() = user_id);

create policy "item_comments: authenticated read" on public.item_comments
  for select using (auth.role() = 'authenticated');
create policy "item_comments: author insert" on public.item_comments
  for insert with check (auth.uid() = author_id);
create policy "item_comments: author delete" on public.item_comments
  for delete using (auth.uid() = author_id);

-- Notifications are never written by the client directly — only
-- by triggers (security definer), so there is no client insert
-- policy. Users may only read and mark-as-read their own.
create policy "notifications: self read" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications: self update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Example trigger: a pending friend request generates a
-- notification for the recipient. Follow this exact pattern to
-- add more (haus invites, borrow requests, new messages) once
-- those flows exist client-side — same shape, different source
-- table/event.
create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, payload)
    values (new.friend_id, 'friend_request', jsonb_build_object('friendship_id', new.id, 'from_user_id', new.user_id));
  end if;
  return new;
end;
$$;

create trigger trg_notify_friend_request
  after insert on public.friendships
  for each row execute procedure public.notify_friend_request();
```

- [ ] **Step 2: Verify**

```sql
select * from public.v_rls_policy_status where table_name in ('item_favorites', 'item_comments', 'notifications');
```

Expected: all three `rls_status = 'enabled'`.

Also sanity-check the trigger:

```sql
select tgname from pg_trigger where tgname = 'trg_notify_friend_request';
```

Expected: 1 row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/014_add_interactions_and_notifications.sql
git commit -m "feat: add item_favorites, item_comments, notifications tables"
```

### Task 6.2: `interactionsService.ts` + `notificationService.ts`

- [ ] **Step 1: Write failing tests** for both services (`src/__tests__/services/interactionsService.test.ts`, `src/__tests__/services/notificationService.test.ts`), same `makeChain` pattern, covering every exported function listed below.

- [ ] **Step 2: Run to verify both fail** (module not found).

- [ ] **Step 3: Write `src/services/interactionsService.ts`**

```typescript
import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

export async function fetchFavoriteItemIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('item_favorites').select('item_id').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r: any) => r.item_id));
}

export async function favoriteItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('item_favorites').insert({ user_id: userId, item_id: itemId });
  if (error) throw new Error(error.message);
}

export async function unfavoriteItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('item_favorites').delete().eq('user_id', userId).eq('item_id', itemId);
  if (error) throw new Error(error.message);
}

export async function fetchComments(itemId: string, opts: { limit?: number } = {}): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('item_comments')
    .select('id, item_id, author_id, text, created_at, author:users(display_name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id, itemId: row.item_id, authorId: row.author_id,
    authorName: row.author?.display_name ?? 'User', text: row.text, createdAt: row.created_at,
  }));
}

export async function addComment(itemId: string, authorId: string, text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({ item_id: itemId, author_id: authorId, text })
    .select('id, item_id, author_id, text, created_at, author:users(display_name)')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, itemId: data.item_id, authorId: data.author_id,
    authorName: data.author?.display_name ?? 'User', text: data.text, createdAt: data.created_at,
  };
}
```

- [ ] **Step 4: Write `src/services/notificationService.ts`**

```typescript
import { supabase } from '../lib/supabase';

export interface NotificationRow {
  id: string;
  type: 'borrow_request' | 'friend_request' | 'haus_invite' | 'message' | 'system';
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(userId: string, opts: { limit?: number } = {}): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 30);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id, type: row.type, payload: row.payload ?? {}, read: row.read, createdAt: row.created_at,
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 5: Run to verify both pass**

Run: `npx jest src/__tests__/services/interactionsService.test.ts src/__tests__/services/notificationService.test.ts -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/interactionsService.ts src/services/notificationService.ts src/__tests__/services/interactionsService.test.ts src/__tests__/services/notificationService.test.ts
git commit -m "feat: add interactionsService and notificationService"
```

### Task 6.3: Rewire `InteractionsContext` and `RequestsContext`

- [ ] **Step 1: Rewrite `src/context/InteractionsContext.tsx`** — replace the in-memory `Set<string>` favorites and array-of-comments-with-`Date.now()`-ids with: fetch `fetchFavoriteItemIds(user.id)` once on mount, `favoriteItem`/`unfavoriteItem` call the service then update local Set (optimistic), `fetchComments(itemId)` called lazily per item (e.g. when a comments sheet opens) rather than eagerly for every item, `addComment` calls the service then appends the real returned row (with a real UUID and `createdAt`) to local state. Read the current file in full first — keep the exact same exported hook shape so `ItemDetailScreen.tsx` and wherever favorites/comments are consumed don't need call-site changes beyond `await`-ing what's now async.

- [ ] **Step 2: Rewrite `src/context/RequestsContext.tsx`** — delete `INITIAL_REQUESTS` entirely. Fetch `fetchNotifications(user.id)` on mount. `accept`/`decline` for a `friend_request`-type notification call the existing `acceptFriendRequest`/`declineFriendRequest` from `friendService.ts` (already real, per the audit) using `payload.friendship_id`, then call `markNotificationRead(id)` and remove it from local state. For notification types that don't have a real accept/decline flow yet (`borrow_request`, `haus_invite`) — check what `RequestsScreen.tsx` currently does for those and keep the same UI behavior, just backed by `markNotificationRead` instead of local-array mutation.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors in `InteractionsContext.tsx`, `RequestsContext.tsx`, `RequestsScreen.tsx`, `ItemDetailScreen.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/context/InteractionsContext.tsx src/context/RequestsContext.tsx
git commit -m "feat: wire InteractionsContext and RequestsContext to real Supabase data"
```

---

## Part 7 — Pagination pass (the "scale" part)

Every list query below currently either has no limit at all, or a hardcoded limit with no way to fetch the next page. Add a `{ limit?: number; offset?: number }` (or cursor, where noted) param to each, defaulting to today's behavior so existing call sites keep working unchanged.

**Files:**
- Modify: `src/services/hausService.ts` (`fetchAllHauses`)
- Modify: `src/services/itemService.ts` (`fetchMyItems`, and whatever powers `ExploreScreen`'s feed — check for an unbounded `fetchAllItems`-style function)
- Modify: `src/services/friendService.ts` (`fetchSuggestedFriends`)
- Modify: `src/services/borrowService.ts` (`fetchMyRentals`)
- New services from Parts 2/3/5/6 already built with `limit` params — no change needed there.

- [ ] **Step 1: `fetchAllHauses`** — add `opts: { limit?: number; offset?: number } = {}`, default `limit = 50` (today's hardcoded value), apply `.range(offset, offset + limit - 1)` instead of `.limit(50)`. Add a test asserting `.range` is called with the right bounds when `offset` is passed.

- [ ] **Step 2: Read `src/services/itemService.ts` in full** and identify every exported fetch function with no `limit`/`range`. For each, add the same `{ limit?, offset? }` pattern, defaulting `limit` to whatever the current implicit Postgres/PostgREST default is (1000 rows) made explicit — e.g. `limit = 50` for a feed-style list. Add `.range()` calls. Write/extend `src/__tests__/services/itemService.test.ts` to assert the new params are respected.

- [ ] **Step 3: `fetchSuggestedFriends`** — already has `.limit(10)`; add `offset` support the same way (`.range(offset, offset + limit - 1)`).

- [ ] **Step 4: Read `src/services/borrowService.ts` in full**, add the same pattern to `fetchMyRentals`.

- [ ] **Step 5: Typecheck + run full service test suite**

Run: `npx tsc --noEmit && npx jest src/__tests__/services -v`
Expected: no errors, all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/hausService.ts src/services/itemService.ts src/services/friendService.ts src/services/borrowService.ts src/__tests__/services
git commit -m "perf: add pagination params to list queries"
```

---

## Part 8 — Fix pre-existing type bugs surfaced during this pass, update docs

**Files:**
- Modify: `src/services/friendService.ts` (or `src/types/index.ts`)
- Modify: `docs/SCHEMA.md`, `supabase/README.md`, `supabase/monitoring.sql`

- [ ] **Step 1: Fix the `avatar_url` type errors**

`npx tsc --noEmit` currently reports (pre-existing, unrelated to this plan, but touched files nearby): `src/services/friendService.ts:22` and `:97` — `Friend`/`SuggestedFriend` object literals include `avatar_url` but the interfaces in `src/types/index.ts` don't declare it. Add `avatar_url?: string;` to both the `Friend` and `SuggestedFriend` interfaces in `src/types/index.ts` (the field is genuinely being set — the type is just missing it, not the other way around).

- [ ] **Step 2: Update `docs/SCHEMA.md`**

Add a new `## Tables` entry (following the exact format already used for `users`/`items`/`hauses`) for each new table: `haus_collections`, `haus_collection_items`, `boards`, `board_items`, `threads`, `messages`, `item_favorites`, `item_comments`, `notifications`. Include the enum tables (`board_visibility`, `board_cover_style`, `message_type`, `thread_status`, `notification_type`) in the `## ENUMs` section at the top.

- [ ] **Step 3: Update `supabase/README.md`**

Update the "Directory Structure" migration list and the "Schema Overview → Tables" bullet list to include all new tables from migrations 010–014.

- [ ] **Step 4: Update `supabase/monitoring.sql`**

Add health-check views for the new tables, following the existing style of `v_item_stats`/`v_haus_health` (read the file first to match the exact view-naming and column conventions) — at minimum `v_haus_collections_health` (collections + items per haus) and `v_notification_volume` (notifications created per day, for spotting a runaway trigger).

- [ ] **Step 5: Full verification pass**

Run: `npx tsc --noEmit && npx jest -v`
Expected: no type errors anywhere in `src/`, all tests PASS.

In the Supabase SQL Editor, run:

```sql
select * from public.v_rls_policy_status;
```

Expected: every table (old and new) shows `rls_status = 'enabled'`.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts docs/SCHEMA.md supabase/README.md supabase/monitoring.sql
git commit -m "docs: document new tables; fix Friend/SuggestedFriend avatar_url type"
```

---

## Self-review checklist (for whoever executes this)

- Every migration is additive (`create table`/`create policy`) except 010, which is a data-repair `update` — none of them `drop` or `alter` an existing column, so they're safe to apply to a live project with existing data.
- Every new table has RLS enabled and at least a read + write policy scoped to the right principal (owner/participant/member) — verified per-part via `v_rls_policy_status`.
- Every FK column has an index (checked per migration above).
- Apply migrations **in order** (010 → 011 → 012 → 013 → 014) — 013's `threads` FK to `items` and all of them assume 001–009 already applied, which they are.
- Parts 2, 3, 5, 6 are independent of each other and can be done in any order (or in parallel by different people) once Part 1 lands — only Part 4 depends on nothing new, and Part 8 should go last since it documents everything above it.
