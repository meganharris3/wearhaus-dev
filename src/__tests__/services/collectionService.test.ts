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

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

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
