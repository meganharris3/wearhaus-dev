/**
 * Unit tests for src/services/campusService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'limit', 'insert', 'update', 'upsert'];

  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);

  return chain;
}

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import { joinCampusCloset } from '../../services/campusService';
import type { CampusInfo } from '../../data/campusDomains';

beforeEach(() => {
  jest.clearAllMocks();
});

const campus: CampusInfo = { id: 'campus-1', name: 'NYU' } as CampusInfo;

describe('joinCampusCloset', () => {
  it('creates a new campus haus without setting member_count — the DB trigger owns it', async () => {
    const lookupChain = makeChain({ data: [], error: null });
    const insertChain = makeChain({ data: { id: 'h1' }, error: null });
    insertChain.single = jest.fn().mockResolvedValue({ data: { id: 'h1' }, error: null });
    const membershipChain = makeChain({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(lookupChain)     // .from('hauses') lookup
      .mockReturnValueOnce(insertChain)     // .from('hauses') insert
      .mockReturnValueOnce(membershipChain); // .from('haus_memberships') upsert

    await joinCampusCloset(campus, 'user-1');

    const insertCall = insertChain.insert.mock.calls[0][0];
    expect(insertCall).not.toHaveProperty('member_count');
    expect(insertCall).not.toHaveProperty('piece_count');
  });

  it('reuses an existing campus haus without inserting a new one', async () => {
    const lookupChain = makeChain({ data: [{ id: 'existing-haus' }], error: null });
    const membershipChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(membershipChain);

    const hausId = await joinCampusCloset(campus, 'user-1');

    expect(hausId).toBe('existing-haus');
  });

  it('upserts the membership with the joining user', async () => {
    const lookupChain = makeChain({ data: [{ id: 'existing-haus' }], error: null });
    const membershipChain = makeChain({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(membershipChain);

    await joinCampusCloset(campus, 'user-1');

    expect(membershipChain.upsert).toHaveBeenCalledWith({ user_id: 'user-1', haus_id: 'existing-haus', role: 'member' });
  });

  it('throws when the haus insert fails', async () => {
    const lookupChain = makeChain({ data: [], error: null });
    const insertChain = makeChain({ data: null, error: { message: 'insert failed' } });
    insertChain.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(insertChain);

    await expect(joinCampusCloset(campus, 'user-1')).rejects.toThrow('insert failed');
  });

  it('throws when the membership upsert fails', async () => {
    const lookupChain = makeChain({ data: [{ id: 'existing-haus' }], error: null });
    const membershipChain = makeChain({ data: null, error: { message: 'upsert failed' } });
    mockFrom.mockReturnValueOnce(lookupChain).mockReturnValueOnce(membershipChain);

    await expect(joinCampusCloset(campus, 'user-1')).rejects.toThrow('upsert failed');
  });
});
