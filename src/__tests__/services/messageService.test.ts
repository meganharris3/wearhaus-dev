/**
 * Unit tests for src/services/messageService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'is', 'lt', 'or', 'order', 'limit', 'insert', 'delete', 'update'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.single = jest.fn().mockResolvedValue(result);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

import {
  fetchThreads,
  fetchThread,
  fetchMessages,
  findOrCreateThread,
  sendMessage,
  updateMessagePayload,
  updateThreadStatus,
  markThreadRead,
  respondToBorrowRequest,
} from '../../services/messageService';

beforeEach(() => { jest.clearAllMocks(); });

const threadRow = (overrides: Record<string, unknown> = {}) => ({
  id: 't1', user_a: 'me', user_b: 'u2', item_id: null, status: 'direct',
  last_message: 'hey', last_message_at: '2026-01-02T00:00:00Z',
  user_a_read_at: '2026-01-03T00:00:00Z', user_b_read_at: '2026-01-01T00:00:00Z',
  item: null,
  a: { id: 'me', display_name: 'Me Myself', username: 'me', avatar_url: null },
  b: { id: 'u2', display_name: 'Maya Chen', username: 'maya', avatar_url: null },
  ...overrides,
});

describe('fetchThreads', () => {
  it('queries threads for either participant, newest first, default limit 20', async () => {
    const chain = makeChain({ data: [threadRow()], error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchThreads('me');

    expect(mockFrom).toHaveBeenCalledWith('threads');
    expect(chain.or).toHaveBeenCalledWith('user_a.eq.me,user_b.eq.me');
    expect(chain.order).toHaveBeenCalledWith('last_message_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
  });

  it('maps the other participant, last message, and empty message list', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [threadRow()], error: null }));

    const [t] = await fetchThreads('me');

    expect(t.id).toBe('t1');
    expect(t.otherUser).toMatchObject({ id: 'u2', name: 'Maya Chen', handle: 'maya', initials: 'MC' });
    expect(t.lastMessage).toBe('hey');
    expect(t.lastMessageTime).toBe('2026-01-02T00:00:00Z');
    expect(t.messages).toEqual([]);
  });

  it('picks the user_a side as the other participant when I am user_b, and reads user_b_read_at', async () => {
    const asUserB = threadRow({
      user_a: 'u2', user_b: 'me',
      a: { id: 'u2', display_name: 'Maya Chen', username: 'maya', avatar_url: null },
      b: { id: 'me', display_name: 'Me Myself', username: 'me', avatar_url: null },
      user_a_read_at: '2026-01-05T00:00:00Z', // other side's marker must be ignored
      user_b_read_at: '2026-01-01T00:00:00Z', // mine is older than last_message_at → unread
    });
    mockFrom.mockReturnValue(makeChain({ data: [asUserB], error: null }));

    const [t] = await fetchThreads('me');

    expect(t.otherUser.id).toBe('u2');
    expect(t.otherUser.name).toBe('Maya Chen');
    expect(t.unread).toBe(true);
  });

  it('is unread when the last message is newer than my read marker', async () => {
    // I am user_a; my read_at (Jan 3) is after last_message_at (Jan 2) → read.
    mockFrom.mockReturnValue(makeChain({ data: [threadRow()], error: null }));
    expect((await fetchThreads('me'))[0].unread).toBe(false);

    mockFrom.mockReturnValue(makeChain({
      data: [threadRow({ user_a_read_at: '2026-01-01T00:00:00Z' })], error: null,
    }));
    expect((await fetchThreads('me'))[0].unread).toBe(true);
  });

  it('carries the joined item through', async () => {
    const item = { id: 'i1', owner_id: 'u2', name: 'Denim Jacket', price_per_day: 1200, status: 'available' };
    mockFrom.mockReturnValue(makeChain({ data: [threadRow({ item_id: 'i1', item })], error: null }));
    expect((await fetchThreads('me'))[0].item?.name).toBe('Denim Jacket');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchThreads('me')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchThreads('me')).rejects.toThrow('DB error');
  });
});

describe('fetchThread', () => {
  it('fetches one thread by id and maps it', async () => {
    const chain = makeChain({ data: threadRow(), error: null });
    mockFrom.mockReturnValue(chain);

    const t = await fetchThread('t1', 'me');

    expect(chain.eq).toHaveBeenCalledWith('id', 't1');
    expect(t.id).toBe('t1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(fetchThread('t1', 'me')).rejects.toThrow('nope');
  });
});

describe('fetchMessages', () => {
  const row = (id: string, at: string) => ({
    id, thread_id: 't1', sender_id: 'u2', type: 'text', text: id, payload: null, created_at: at,
  });

  it('queries by thread, newest first, default limit 30', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMessages('t1');

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(chain.eq).toHaveBeenCalledWith('thread_id', 't1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(30);
    expect(chain.lt).not.toHaveBeenCalled();
  });

  it('pages backwards with .lt when `before` is given', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMessages('t1', { limit: 10, before: '2026-01-01T00:00:00Z' });

    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.lt).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z');
  });

  it('returns messages oldest-first for display and maps fields', async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [row('m2', '2026-01-02'), row('m1', '2026-01-01')], error: null,
    }));

    const result = await fetchMessages('t1');

    expect(result.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(result[0]).toMatchObject({ threadId: 't1', senderId: 'u2', type: 'text', text: 'm1', timestamp: '2026-01-01' });
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchMessages('t1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchMessages('t1')).rejects.toThrow('DB error');
  });
});

describe('findOrCreateThread', () => {
  it('returns the existing thread id without inserting', async () => {
    const chain = makeChain({ data: { id: 't9' }, error: null });
    mockFrom.mockReturnValue(chain);

    const id = await findOrCreateThread('me', 'u2');

    expect(chain.or).toHaveBeenCalledWith('and(user_a.eq.me,user_b.eq.u2),and(user_a.eq.u2,user_b.eq.me)');
    expect(chain.is).toHaveBeenCalledWith('item_id', null);
    expect(chain.insert).not.toHaveBeenCalled();
    expect(id).toBe('t9');
  });

  it('matches on item_id when an item is given', async () => {
    const chain = makeChain({ data: { id: 't9' }, error: null });
    mockFrom.mockReturnValue(chain);

    await findOrCreateThread('me', 'u2', 'i1');

    expect(chain.eq).toHaveBeenCalledWith('item_id', 'i1');
    expect(chain.is).not.toHaveBeenCalled();
  });

  it('inserts a new thread when none exists', async () => {
    const find = makeChain({ data: null, error: null });
    const create = makeChain({ data: { id: 't10' }, error: null });
    mockFrom.mockReturnValueOnce(find).mockReturnValueOnce(create);

    const id = await findOrCreateThread('me', 'u2', 'i1', 'pending_request');

    expect(create.insert).toHaveBeenCalledWith({
      user_a: 'me', user_b: 'u2', item_id: 'i1', status: 'pending_request',
    });
    expect(id).toBe('t10');
  });

  it('defaults new threads to status direct with a null item', async () => {
    const create = makeChain({ data: { id: 't10' }, error: null });
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: null })).mockReturnValueOnce(create);

    await findOrCreateThread('me', 'u2');

    expect(create.insert).toHaveBeenCalledWith({ user_a: 'me', user_b: 'u2', item_id: null, status: 'direct' });
  });

  it('throws if the lookup fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'find failed' } }));
    await expect(findOrCreateThread('me', 'u2')).rejects.toThrow('find failed');
  });

  it('throws if the insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: null, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { message: 'insert failed' } }));
    await expect(findOrCreateThread('me', 'u2')).rejects.toThrow('insert failed');
  });
});

describe('sendMessage', () => {
  const inserted = {
    id: 'm1', thread_id: 't1', sender_id: 'me', type: 'text', text: 'hi', payload: null, created_at: '2026-01-01',
  };

  it('inserts into messages and returns the mapped row', async () => {
    const chain = makeChain({ data: inserted, error: null });
    mockFrom.mockReturnValue(chain);

    const msg = await sendMessage('t1', 'me', { text: 'hi' });

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(chain.insert).toHaveBeenCalledWith({
      thread_id: 't1', sender_id: 'me', type: 'text', text: 'hi', payload: null,
    });
    expect(msg).toMatchObject({ id: 'm1', threadId: 't1', senderId: 'me', text: 'hi', timestamp: '2026-01-01' });
  });

  it('sends type and payload for structured messages', async () => {
    const chain = makeChain({ data: { ...inserted, type: 'counter_offer', text: null, payload: { pricePerDay: 900 } }, error: null });
    mockFrom.mockReturnValue(chain);

    const msg = await sendMessage('t1', 'me', { type: 'counter_offer', data: { pricePerDay: 900 } });

    expect(chain.insert).toHaveBeenCalledWith({
      thread_id: 't1', sender_id: 'me', type: 'counter_offer', text: null, payload: { pricePerDay: 900 },
    });
    expect(msg.payload).toEqual({ pricePerDay: 900 });
    expect(msg.text).toBeUndefined();
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'RLS violation' } }));
    await expect(sendMessage('t1', 'me', { text: 'x' })).rejects.toThrow('RLS violation');
  });
});

describe('updateMessagePayload', () => {
  it('updates only the payload column by message id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await updateMessagePayload('m1', { status: 'accepted' });

    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(chain.update).toHaveBeenCalledWith({ payload: { status: 'accepted' } });
    expect(chain.eq).toHaveBeenCalledWith('id', 'm1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(updateMessagePayload('m1', {})).rejects.toThrow('nope');
  });
});

describe('updateThreadStatus', () => {
  it('updates status by thread id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await updateThreadStatus('t1', 'pending_request');

    expect(mockFrom).toHaveBeenCalledWith('threads');
    expect(chain.update).toHaveBeenCalledWith({ status: 'pending_request' });
    expect(chain.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(updateThreadStatus('t1', 'direct')).rejects.toThrow('nope');
  });
});

describe('markThreadRead', () => {
  it('calls the mark_thread_read RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await markThreadRead('t1');

    expect(mockRpc).toHaveBeenCalledWith('mark_thread_read', { p_thread_id: 't1' });
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    await expect(markThreadRead('t1')).rejects.toThrow('rpc failed');
  });
});

describe('respondToBorrowRequest', () => {
  it('rewrites the request status, then posts a system message as the responder', async () => {
    const read = makeChain({ data: { payload: { status: 'pending', lenderFirstName: 'Maya', days: 2 } }, error: null });
    const update = makeChain({ data: null, error: null });
    const insert = makeChain({
      data: { id: 'm9', thread_id: 't1', sender_id: 'lender', type: 'system', text: 'Maya accepted the request', payload: null, created_at: '2026-01-01' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(update).mockReturnValueOnce(insert);

    await respondToBorrowRequest('m1', 't1', 'lender', 'accepted', 'Maya');

    expect(read.eq).toHaveBeenCalledWith('id', 'm1');
    expect(update.update).toHaveBeenCalledWith({
      payload: { status: 'accepted', lenderFirstName: 'Maya', days: 2 },
    });
    expect(update.eq).toHaveBeenCalledWith('id', 'm1');
    expect(insert.insert).toHaveBeenCalledWith({
      thread_id: 't1', sender_id: 'lender', type: 'system', text: 'Maya accepted the request', payload: null,
    });
  });

  it('words a decline correctly', async () => {
    const read = makeChain({ data: { payload: {} }, error: null });
    const insert = makeChain({
      data: { id: 'm9', thread_id: 't1', sender_id: 'lender', type: 'system', text: 'x', payload: null, created_at: '2026-01-01' },
      error: null,
    });
    mockFrom.mockReturnValueOnce(read).mockReturnValueOnce(makeChain({ data: null, error: null })).mockReturnValueOnce(insert);

    await respondToBorrowRequest('m1', 't1', 'lender', 'declined', 'Maya');

    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ text: 'Maya declined the request' }));
  });

  it('throws, and posts nothing, if the request cannot be read', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: { message: 'not found' } }));
    await expect(respondToBorrowRequest('m1', 't1', 'lender', 'accepted', 'Maya')).rejects.toThrow('not found');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('does not post the system message if the status update fails', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { payload: {} }, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { message: 'update failed' } }));
    await expect(respondToBorrowRequest('m1', 't1', 'lender', 'accepted', 'Maya')).rejects.toThrow('update failed');
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
