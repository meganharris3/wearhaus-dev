/**
 * Unit tests for src/services/notificationService.ts
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
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationService';

beforeEach(() => { jest.clearAllMocks(); });

describe('fetchNotifications', () => {
  it("queries the user's notifications newest first with a default limit of 30", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchNotifications('u1');

    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(30);
  });

  it('maps rows, including resolved, and defaults a null payload to {}', async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [
        { id: 'n1', type: 'friend_request', payload: { friendship_id: 'f1' }, read: false, resolved: false, created_at: '2026-01-01' },
        { id: 'n2', type: 'system', payload: null, read: true, resolved: true, created_at: '2026-01-02' },
      ],
      error: null,
    }));

    const result = await fetchNotifications('u1');

    expect(result[0]).toEqual({
      id: 'n1', type: 'friend_request', payload: { friendship_id: 'f1' },
      read: false, resolved: false, createdAt: '2026-01-01',
    });
    expect(result[1].payload).toEqual({});
    expect(result[1].resolved).toBe(true);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchNotifications('u1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchNotifications('u1')).rejects.toThrow('DB error');
  });
});

describe('markNotificationRead', () => {
  it('sets read = true by id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await markNotificationRead('n1');

    expect(chain.update).toHaveBeenCalledWith({ read: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(markNotificationRead('n1')).rejects.toThrow('nope');
  });
});

describe('markAllNotificationsRead', () => {
  it("marks only the user's unread notifications", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await markAllNotificationsRead('u1');

    expect(chain.update).toHaveBeenCalledWith({ read: true });
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('read', false);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(markAllNotificationsRead('u1')).rejects.toThrow('nope');
  });
});
