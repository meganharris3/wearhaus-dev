/**
 * Unit tests for src/services/hausService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'range', 'insert', 'delete', 'update', 'upsert'];

  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  chain.single = jest.fn().mockResolvedValue(result);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
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
  fetchCampusHaus,
  fetchHausMembers,
  fetchAllHausMembers,
  createHaus,
  leaveHaus,
  inviteMembersToHaus,
  acceptHausInvite,
  declineHausInvite,
  fetchHausInviteCode,
  fetchHausInvitePreview,
  joinHausByInviteCode,
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
// fetchCampusHaus
// ---------------------------------------------------------------------------
describe('fetchCampusHaus', () => {
  it('queries hauses filtered to the given campus and haus_type "campus"', async () => {
    const chain = makeChain({ data: makeHaus({ id: 'campus-h1' }), error: null });
    mockFrom.mockReturnValue(chain);

    await fetchCampusHaus('campus-1');

    expect(mockFrom).toHaveBeenCalledWith('hauses');
    expect(chain.eq).toHaveBeenCalledWith('campus_id', 'campus-1');
    expect(chain.eq).toHaveBeenCalledWith('haus_type', 'campus');
  });

  it('returns the haus when one exists', async () => {
    const haus = makeHaus({ id: 'campus-h1', piece_count: 42 });
    mockFrom.mockReturnValue(makeChain({ data: haus, error: null }));

    const result = await fetchCampusHaus('campus-1');

    expect(result).toEqual(haus);
  });

  it('returns null when the campus closet has not been created yet', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await fetchCampusHaus('campus-1');
    expect(result).toBeNull();
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Network error' } }));
    await expect(fetchCampusHaus('campus-1')).rejects.toThrow('Network error');
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
  it('creates the haus and its admin membership through the create_haus RPC, then returns the row', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'h1', error: null });
    const chain = makeChain({ data: makeHaus({ id: 'h1', member_count: 1 }), error: null });
    mockFrom.mockReturnValue(chain);

    const haus = await createHaus({ name: 'Style Queens', description: 'ours' });

    expect(mockRpc).toHaveBeenCalledWith('create_haus', { p_name: 'Style Queens', p_description: 'ours' });
    // no direct inserts — RLS rejects a self-inserted admin membership
    expect(chain.insert).not.toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'h1');
    expect(haus).toEqual(makeHaus({ id: 'h1', member_count: 1 }));
  });

  it('throws when the RPC fails, instead of returning a haus', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'A haus needs a name' } });
    await expect(createHaus({ name: ' ' })).rejects.toThrow('A haus needs a name');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// inviteMembersToHaus / acceptHausInvite / declineHausInvite
// ---------------------------------------------------------------------------
describe('inviteMembersToHaus', () => {
  it('upserts one pending haus_invitations row per invitee, ignoring duplicates', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await inviteMembersToHaus('h1', 'admin-1', ['friend-a', 'friend-b']);

    expect(mockFrom).toHaveBeenCalledWith('haus_invitations');
    expect(chain.upsert).toHaveBeenCalledWith(
      [
        { haus_id: 'h1', inviter_id: 'admin-1', invitee_id: 'friend-a' },
        { haus_id: 'h1', inviter_id: 'admin-1', invitee_id: 'friend-b' },
      ],
      { onConflict: 'haus_id,invitee_id', ignoreDuplicates: true },
    );
  });

  it('does not query at all when given no invitees', async () => {
    await inviteMembersToHaus('h1', 'admin-1', []);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(inviteMembersToHaus('h1', 'admin-1', ['friend-a'])).rejects.toThrow('DB error');
  });
});

describe('acceptHausInvite', () => {
  it('marks the invitation accepted, scoped to the invitee, then inserts a member row', async () => {
    const inviteChain = makeChain({ data: null, error: null });
    const memberChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(inviteChain)  // .from('haus_invitations')
      .mockReturnValueOnce(memberChain); // .from('haus_memberships')

    await acceptHausInvite('invite-1', 'h1', 'user-1');

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'haus_invitations');
    expect(inviteChain.update).toHaveBeenCalledWith({ status: 'accepted' });
    expect(inviteChain.eq).toHaveBeenCalledWith('id', 'invite-1');
    expect(inviteChain.eq).toHaveBeenCalledWith('invitee_id', 'user-1');

    expect(mockFrom).toHaveBeenNthCalledWith(2, 'haus_memberships');
    expect(memberChain.insert).toHaveBeenCalledWith({ haus_id: 'h1', user_id: 'user-1', role: 'member' });
  });

  it('throws without inserting a membership row if marking the invitation accepted fails', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: 'RLS denied' } }));
    await expect(acceptHausInvite('invite-1', 'h1', 'user-1')).rejects.toThrow('RLS denied');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe('declineHausInvite', () => {
  it('marks the invitation declined, scoped to the invitee', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await declineHausInvite('invite-1', 'user-1');

    expect(mockFrom).toHaveBeenCalledWith('haus_invitations');
    expect(chain.update).toHaveBeenCalledWith({ status: 'declined' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'invite-1');
    expect(chain.eq).toHaveBeenCalledWith('invitee_id', 'user-1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(declineHausInvite('invite-1', 'user-1')).rejects.toThrow('DB error');
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

// ---------------------------------------------------------------------------
// Invite links (019_haus_invite_links.sql)
// ---------------------------------------------------------------------------
describe('fetchHausInviteCode', () => {
  it("reads the haus's code from haus_invite_links", async () => {
    const chain = makeChain({ data: { code: 'abc123def456' }, error: null });
    mockFrom.mockReturnValue(chain);

    await expect(fetchHausInviteCode('h1')).resolves.toBe('abc123def456');
    expect(mockFrom).toHaveBeenCalledWith('haus_invite_links');
    expect(chain.eq).toHaveBeenCalledWith('haus_id', 'h1');
  });

  it("returns null when it can't see one (not a member)", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    await expect(fetchHausInviteCode('h1')).resolves.toBeNull();
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchHausInviteCode('h1')).rejects.toThrow('DB error');
  });
});

describe('fetchHausInvitePreview', () => {
  it('returns the haus behind the code', async () => {
    const row = { ...makeHaus(), is_member: false };
    mockRpc.mockResolvedValueOnce({ data: [row], error: null });

    await expect(fetchHausInvitePreview('abc123def456')).resolves.toEqual(row);
    expect(mockRpc).toHaveBeenCalledWith('haus_invite_preview', { p_code: 'abc123def456' });
  });

  it('returns null for an unknown code', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchHausInvitePreview('nope')).resolves.toBeNull();
  });
});

describe('joinHausByInviteCode', () => {
  it('joins through the RPC and returns the haus id', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'h1', error: null });

    await expect(joinHausByInviteCode('abc123def456')).resolves.toBe('h1');
    expect(mockRpc).toHaveBeenCalledWith('join_haus_by_invite_code', { p_code: 'abc123def456' });
  });

  it('throws when the RPC refuses (bad code, signed out)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'This invite link is not valid' } });
    await expect(joinHausByInviteCode('nope')).rejects.toThrow('This invite link is not valid');
  });
});
