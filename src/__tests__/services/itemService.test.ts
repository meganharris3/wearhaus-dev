/**
 * Unit tests for src/services/itemService.ts
 *
 * Strategy: mock the Supabase client at the module level and configure each
 * test's chain via a helper that returns a thenable, allowing tests to await
 * the full query chain just as the real service code does.
 */

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Creates a chainable builder whose final resolution is `result`. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const chainMethods = ['select', 'eq', 'ilike', 'order', 'limit', 'lte', 'single'];

  chainMethods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  // Make the chain awaitable so `const { data, error } = await query` works.
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);

  return chain;
}

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import {
  fetchFeedItems,
  searchItems,
  fetchItemById,
  fetchMyItems,
} from '../../services/itemService';
import type { Item } from '../../types';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id:             '1',
  owner_id:       'u1',
  name:           'Test Dress',
  category:       'dress',
  size_label:     'S',
  price_per_day:  800,
  status:         'available',
  location_label: '0.3 mi · NYU',
  ...overrides,
});

// ---------------------------------------------------------------------------
// fetchFeedItems
// ---------------------------------------------------------------------------
describe('fetchFeedItems', () => {
  it('returns items from Supabase on success', async () => {
    const items = [makeItem({ id: '1' }), makeItem({ id: '2', status: 'available' })];
    mockFrom.mockReturnValue(makeChain({ data: items, error: null }));

    const result = await fetchFeedItems();

    expect(mockFrom).toHaveBeenCalledWith('items');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await fetchFeedItems();

    expect(result).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));

    await expect(fetchFeedItems()).rejects.toThrow('DB error');
  });

  it('applies category filter when category is not "All"', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchFeedItems('dress');

    // ilike should have been called with the category value
    expect(chain.ilike).toHaveBeenCalledWith('category', '%dress%');
  });

  it('does not apply ilike filter when category is "All"', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchFeedItems('All');

    expect(chain.ilike).not.toHaveBeenCalled();
  });

  it('does not apply ilike filter when category is undefined', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchFeedItems(undefined);

    expect(chain.ilike).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// searchItems
// ---------------------------------------------------------------------------
describe('searchItems', () => {
  it('returns matching items for a name query', async () => {
    const items = [makeItem({ name: 'Silk Dress' })];
    const chain = makeChain({ data: items, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await searchItems({ query: 'Silk' });

    expect(chain.ilike).toHaveBeenCalledWith('name', '%Silk%');
    expect(result[0].name).toBe('Silk Dress');
  });

  it('applies size filter', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await searchItems({ size: 'S' });

    expect(chain.eq).toHaveBeenCalledWith('size_label', 'S');
  });

  it('applies category filter', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await searchItems({ category: 'jacket' });

    expect(chain.ilike).toHaveBeenCalledWith('category', '%jacket%');
  });

  it('applies maxPrice filter', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await searchItems({ maxPrice: 1000 });

    expect(chain.lte).toHaveBeenCalledWith('price_per_day', 1000);
  });

  it('applies no filters when params are empty', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await searchItems({});

    expect(chain.ilike).not.toHaveBeenCalled();
    expect(chain.eq).not.toHaveBeenCalled();
    expect(chain.lte).not.toHaveBeenCalled();
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await searchItems({});
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Search failed' } }));
    await expect(searchItems({ query: 'x' })).rejects.toThrow('Search failed');
  });
});

// ---------------------------------------------------------------------------
// fetchItemById
// ---------------------------------------------------------------------------
describe('fetchItemById', () => {
  it('returns an item by id', async () => {
    const item = makeItem({ id: 'abc-123' });
    // fetchItemById ends the chain with .single() which resolves directly
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: item, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchItemById('abc-123');

    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123');
    expect(result?.id).toBe('abc-123');
  });

  it('throws on error from single()', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(chain);

    await expect(fetchItemById('missing')).rejects.toThrow('Not found');
  });
});

// ---------------------------------------------------------------------------
// fetchMyItems
// ---------------------------------------------------------------------------
describe('fetchMyItems', () => {
  it('fetches all items for a user with no tab filter', async () => {
    const items = [makeItem({ owner_id: 'u1' })];
    const chain = makeChain({ data: items, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchMyItems('u1', 'All');

    expect(chain.eq).toHaveBeenCalledWith('owner_id', 'u1');
    // "All" tab should not add a status eq filter
    const eqCalls = chain.eq.mock.calls;
    const statusCalls = eqCalls.filter((c: string[]) => c[0] === 'status');
    expect(statusCalls).toHaveLength(0);
    expect(result[0].owner_id).toBe('u1');
  });

  it('filters by status available for "Listed" tab', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyItems('u1', 'Listed');

    expect(chain.eq).toHaveBeenCalledWith('status', 'available');
  });

  it('filters by status lent for "Lent Out" tab', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyItems('u1', 'Lent Out');

    expect(chain.eq).toHaveBeenCalledWith('status', 'lent');
  });

  it('filters by status wash for "Wash" tab', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyItems('u1', 'Wash');

    expect(chain.eq).toHaveBeenCalledWith('status', 'wash');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Forbidden' } }));
    await expect(fetchMyItems('u1', 'All')).rejects.toThrow('Forbidden');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchMyItems('u1', 'All');
    expect(result).toEqual([]);
  });
});
