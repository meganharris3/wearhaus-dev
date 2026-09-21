/**
 * Unit tests for src/services/interactionsService.ts
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
  fetchFavoriteItemIds,
  favoriteItem,
  unfavoriteItem,
  fetchComments,
  addComment,
} from '../../services/interactionsService';

beforeEach(() => { jest.clearAllMocks(); });

describe('fetchFavoriteItemIds', () => {
  it("selects the user's favorites and returns a Set of item ids", async () => {
    const chain = makeChain({ data: [{ item_id: 'i1' }, { item_id: 'i2' }], error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchFavoriteItemIds('u1');

    expect(mockFrom).toHaveBeenCalledWith('item_favorites');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(result).toEqual(new Set(['i1', 'i2']));
  });

  it('returns an empty set when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect((await fetchFavoriteItemIds('u1')).size).toBe(0);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchFavoriteItemIds('u1')).rejects.toThrow('DB error');
  });
});

describe('favoriteItem', () => {
  it('inserts a favorite row', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await favoriteItem('u1', 'i1');

    expect(mockFrom).toHaveBeenCalledWith('item_favorites');
    expect(chain.insert).toHaveBeenCalledWith({ user_id: 'u1', item_id: 'i1' });
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'duplicate key' } }));
    await expect(favoriteItem('u1', 'i1')).rejects.toThrow('duplicate key');
  });
});

describe('unfavoriteItem', () => {
  it('deletes by user_id and item_id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await unfavoriteItem('u1', 'i1');

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('item_id', 'i1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(unfavoriteItem('u1', 'i1')).rejects.toThrow('nope');
  });
});

describe('fetchComments', () => {
  const row = (id: string, at: string) => ({
    id, item_id: 'i1', author_id: 'u1', text: id, created_at: at, author: { display_name: 'Maya Chen' },
  });

  it('queries by item, newest first, default limit 50', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchComments('i1');

    expect(mockFrom).toHaveBeenCalledWith('item_comments');
    expect(chain.eq).toHaveBeenCalledWith('item_id', 'i1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('honours a custom limit', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await fetchComments('i1', { limit: 5 });
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('returns comments oldest-first and maps fields', async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [row('c2', '2026-01-02'), row('c1', '2026-01-01')], error: null,
    }));

    const result = await fetchComments('i1');

    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result[0]).toEqual({
      id: 'c1', itemId: 'i1', authorId: 'u1', authorName: 'Maya Chen', text: 'c1', createdAt: '2026-01-01',
    });
  });

  it("falls back to 'User' when the author row is missing", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [{ ...row('c1', '2026-01-01'), author: null }], error: null }));
    expect((await fetchComments('i1'))[0].authorName).toBe('User');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchComments('i1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchComments('i1')).rejects.toThrow('DB error');
  });
});

describe('addComment', () => {
  it('inserts the comment and returns the mapped row', async () => {
    const chain = makeChain({
      data: { id: 'c1', item_id: 'i1', author_id: 'u1', text: 'Love it', created_at: '2026-01-01', author: { display_name: 'Maya Chen' } },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await addComment('i1', 'u1', 'Love it');

    expect(chain.insert).toHaveBeenCalledWith({ item_id: 'i1', author_id: 'u1', text: 'Love it' });
    expect(result).toEqual({
      id: 'c1', itemId: 'i1', authorId: 'u1', authorName: 'Maya Chen', text: 'Love it', createdAt: '2026-01-01',
    });
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'RLS violation' } }));
    await expect(addComment('i1', 'u1', 'x')).rejects.toThrow('RLS violation');
  });
});
