/**
 * Unit tests for src/services/hausService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit'];

  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);

  return chain;
}

// IMPORTANT: babel-jest hoists this jest.mock() call above any top-level
// `const mockX = jest.fn()` declared earlier in this file (hoisting moves
// jest.mock calls and ES imports above plain statements, not the other way
// around), so a factory that *references* an externally-declared mock
// variable sees it as `undefined` at the time the factory actually runs.
// Fix: create the jest.fn() inline inside the factory, then pull the
// reference back out via the (now-mocked) import afterwards.
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import {
  fetchMyHauses,
  fetchAllHauses,
  fetchHausMembers,
} from '../../services/hausService';
import type { Haus } from '../../types';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const makeHaus = (overrides: Partial<Haus> = {}): Haus => ({
  id:           'h1',
  name:         'Style Queens',
  member_count: 4,
  piece_count:  12,
  ...overrides,
});

// ---------------------------------------------------------------------------
// fetchMyHauses
// ---------------------------------------------------------------------------
describe('fetchMyHauses', () => {
  it('returns hauses for the given userId', async () => {
    const data = [
      { haus: makeHaus({ id: 'h1', name: 'Style Queens' }) },
      { haus: makeHaus({ id: 'h2', name: 'NYU Closet' }) },
    ];
    mockFrom.mockReturnValue(makeChain({ data, error: null }));

    const result = await fetchMyHauses('user-1');

    expect(mockFrom).toHaveBeenCalledWith('haus_memberships');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Style Queens');
    expect(result[1].id).toBe('h2');
  });

  it('filters out null haus entries', async () => {
    const data = [{ haus: makeHaus() }, { haus: null }];
    mockFrom.mockReturnValue(makeChain({ data, error: null }));

    const result = await fetchMyHauses('user-1');

    expect(result).toHaveLength(1);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchMyHauses('user-1');
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchMyHauses('user-1')).rejects.toThrow('DB error');
  });

  it('queries by user_id', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyHauses('user-42');

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-42');
  });
});

// ---------------------------------------------------------------------------
// fetchAllHauses
// ---------------------------------------------------------------------------
describe('fetchAllHauses', () => {
  it('returns all hauses ordered by member_count', async () => {
    const data = [makeHaus({ id: 'h1', member_count: 10 }), makeHaus({ id: 'h2', member_count: 5 })];
    const chain = makeChain({ data, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchAllHauses();

    expect(mockFrom).toHaveBeenCalledWith('hauses');
    expect(chain.order).toHaveBeenCalledWith('member_count', { ascending: false });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchAllHauses();
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Network error' } }));
    await expect(fetchAllHauses()).rejects.toThrow('Network error');
  });
});

// ---------------------------------------------------------------------------
// fetchHausMembers
// ---------------------------------------------------------------------------
describe('fetchHausMembers', () => {
  it('returns members for a given haus', async () => {
    const data = [
      { role: 'admin', joined_at: '2024-01-01', user: { id: 'u1', display_name: 'Maya' } },
    ];
    const chain = makeChain({ data, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchHausMembers('h1');

    expect(mockFrom).toHaveBeenCalledWith('haus_memberships');
    expect(chain.eq).toHaveBeenCalledWith('haus_id', 'h1');
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('admin');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchHausMembers('h1');
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Not found' } }));
    await expect(fetchHausMembers('h1')).rejects.toThrow('Not found');
  });

  it('orders members by joined_at ascending', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchHausMembers('h1');

    expect(chain.order).toHaveBeenCalledWith('joined_at', { ascending: true });
  });
});
