/**
 * Unit tests for the pagination behaviour of friendService.fetchSuggestedFriends
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'order', 'limit', 'range'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import { fetchSuggestedFriends } from '../../services/friendService';

beforeEach(() => { jest.clearAllMocks(); });

describe('fetchSuggestedFriends', () => {
  it('excludes the current user and defaults to the first 10 rows in a stable order', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchSuggestedFriends('u1');

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(chain.neq).toHaveBeenCalledWith('id', 'u1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('id');
    expect(chain.range).toHaveBeenCalledWith(0, 9);
    expect(chain.limit).not.toHaveBeenCalled();
  });

  it('pages with limit and offset', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchSuggestedFriends('u1', { limit: 10, offset: 10 });

    expect(chain.range).toHaveBeenCalledWith(10, 19);
  });

  it('maps users to suggestions', async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [{ id: 'u2', display_name: 'Maya Chen', username: 'maya', avatar_url: null }],
      error: null,
    }));

    const [s] = await fetchSuggestedFriends('u1');

    expect(s).toMatchObject({ id: 'u2', name: 'Maya Chen', handle: '@maya', initials: 'MC' });
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchSuggestedFriends('u1')).rejects.toThrow('DB error');
  });
});
