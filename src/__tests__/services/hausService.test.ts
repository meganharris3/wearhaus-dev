/**
 * Unit tests for src/services/hausService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'range', 'insert', 'delete', 'update'];

  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  chain.single = jest.fn().mockResolvedValue(result);
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
  supabase: { from: jest.fn(), rpc: jest.fn().mockResolvedValue({ data: null, error: null }) },
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

import {
  fetchMyHauses,
  fetchAllHauses,
  fetchHausMembers,
  fetchAllHausMembers,
  createHaus,
  leaveHaus,
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
  it('defaults to the first 50 rows, with id as a stable tiebreaker', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchAllHauses();

    expect(chain.range).toHaveBeenCalledWith(0, 49);
    expect(chain.order).toHaveBeenCalledWith('id');
    expect(chain.limit).not.toHaveBeenCalled();
  });

  it('pages with limit and offset', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchAllHauses({ limit: 20, offset: 40 });

    expect(chain.range).toHaveBeenCalledWith(40, 59);
  });

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

// ---------------------------------------------------------------------------
// fetchAllHausMembers
// ---------------------------------------------------------------------------
describe('fetchAllHausMembers', () => {
  it('maps membership rows to HausMemberRow without a row limit', async () => {
    const data = [
      { user_id: 'u1', role: 'admin', joined_at: '2024-01-01', user: { id: 'u1', display_name: 'Maya Chen', avatar_url: 'https://x/a.png' } },
      { user_id: 'u2', role: 'member', joined_at: '2024-02-01', user: { id: 'u2', display_name: 'Jo', avatar_url: null } },
    ];
    const chain = makeChain({ data, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchAllHausMembers('h1');

    expect(mockFrom).toHaveBeenCalledWith('haus_memberships');
    expect(chain.eq).toHaveBeenCalledWith('haus_id', 'h1');
    expect(chain.limit).not.toHaveBeenCalled();
    expect(result).toEqual([
      { userId: 'u1', role: 'admin', joinedAt: '2024-01-01', displayName: 'Maya Chen', avatarUrl: 'https://x/a.png' },
      { userId: 'u2', role: 'member', joinedAt: '2024-02-01', displayName: 'Jo', avatarUrl: undefined },
    ]);
  });

  it("falls back to 'Member' when the joined user row is missing", async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [{ user_id: 'u3', role: 'member', joined_at: '2024-03-01', user: null }],
      error: null,
    }));
    const result = await fetchAllHausMembers('h1');
    expect(result[0].displayName).toBe('Member');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchAllHausMembers('h1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Not found' } }));
    await expect(fetchAllHausMembers('h1')).rejects.toThrow('Not found');
  });

  it('orders members by joined_at ascending', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchAllHausMembers('h1');

    expect(chain.order).toHaveBeenCalledWith('joined_at', { ascending: true });
  });
});

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
    mockFrom.mockReturnValue(deleteChain);

    await leaveHaus('h1', 'user-1');

    expect(mockFrom).toHaveBeenCalledWith('haus_memberships');
    expect(deleteChain.eq).toHaveBeenCalledWith('haus_id', 'h1');
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
