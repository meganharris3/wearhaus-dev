/**
 * Tests for MessagesContext's background refresh — same bug/fix as RequestsContext's: the
 * Masthead badge (MessagesIcon) renders on every screen, not just the Messages screen, but
 * threads only ever loaded once on mount. A message that arrived while the user was browsing
 * elsewhere never showed up in the unread count until they happened to open Messages itself.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

let mockUser: { id: string } | null = { id: 'me' };
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockFetchThreads = jest.fn();
const mockUpdateMessagePayload = jest.fn();
const mockFetchMessages = jest.fn();
jest.mock('../../services/messageService', () => ({
  fetchThreads: (...args: unknown[]) => mockFetchThreads(...args),
  fetchThread: jest.fn(),
  fetchMessages: (...args: unknown[]) => mockFetchMessages(...args),
  findOrCreateThread: jest.fn(),
  sendMessage: jest.fn(),
  updateMessagePayload: (...args: unknown[]) => mockUpdateMessagePayload(...args),
  updateThreadStatus: jest.fn(),
  markThreadRead: jest.fn(),
}));

import { MessagesProvider, useMessages } from '../../context/MessagesContext';

type Ctx = ReturnType<typeof useMessages>;
let ctx: Ctx;

function Capture() {
  ctx = useMessages();
  return <Text>{ctx.unreadCount}</Text>;
}

const makeThread = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 't1',
  otherUser: { id: 'u2', name: 'Jordan', handle: '@jordan', initials: 'J', avatarColor: '#fff' },
  status: 'active',
  unread: true,
  lastMessage: 'hey',
  lastMessageTime: '2026-01-01T00:00:00Z',
  messages: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'me' };
  mockFetchThreads.mockResolvedValue([]);
});

describe('background refresh', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('refetches threads again on its own, without a screen focus/mount triggering it', async () => {
    mockFetchThreads.mockResolvedValue([]);
    render(<MessagesProvider><Capture /></MessagesProvider>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mockFetchThreads).toHaveBeenCalledTimes(1);
    expect(ctx.unreadCount).toBe(0);

    mockFetchThreads.mockResolvedValue([makeThread()]);
    await act(async () => { jest.advanceTimersByTime(30000); await Promise.resolve(); await Promise.resolve(); });

    expect(mockFetchThreads.mock.calls.length).toBeGreaterThan(1);
    expect(ctx.unreadCount).toBe(1);
  });

  it('stops polling once unmounted', async () => {
    mockFetchThreads.mockResolvedValue([]);
    const { unmount } = render(<MessagesProvider><Capture /></MessagesProvider>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const callsAtUnmount = mockFetchThreads.mock.calls.length;

    unmount();
    await act(async () => { jest.advanceTimersByTime(120000); });

    expect(mockFetchThreads.mock.calls.length).toBe(callsAtUnmount);
  });

  it('does not poll at all when there is no logged-in user', async () => {
    mockUser = null;
    render(<MessagesProvider><Capture /></MessagesProvider>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    mockFetchThreads.mockClear();

    await act(async () => { jest.advanceTimersByTime(120000); });

    expect(mockFetchThreads).not.toHaveBeenCalled();
  });
});

describe('acceptCounterOffer', () => {
  const request = {
    id: 'm1', threadId: 't1', type: 'borrow_request', senderId: 'me', timestamp: '2026-11-01T00:00:00Z',
    payload: {
      lenderId: 'u2', lenderFirstName: 'Jordan', borrowerId: 'me', borrowerFirstName: 'Megan',
      item: { name: 'Denim Jacket', size: 'M', condition: 'Good', thumbColor: '#ddd', photo: null },
      startDate: 'Nov 3', endDate: 'Nov 5', startDateISO: '2026-11-03', endDateISO: '2026-11-05',
      itemId: 'i1', days: 3, pricePerDay: 10, pickupMethod: 'Pickup', total: 32.1, status: 'pending',
    },
  };
  const counter = {
    id: 'm2', threadId: 't1', type: 'counter_offer', senderId: 'u2', timestamp: '2026-11-01T01:00:00Z',
    payload: {
      pricePerDay: 800, dates: { start: 'Nov 10', end: 'Nov 10' },
      startDateISO: '2026-11-10', endDateISO: '2026-11-10',
    },
  };

  async function renderWith(messages: unknown[]) {
    mockFetchThreads.mockResolvedValue([makeThread()]);
    mockFetchMessages.mockResolvedValue(messages);
    mockUpdateMessagePayload.mockResolvedValue(undefined);
    render(<MessagesProvider><Capture /></MessagesProvider>);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { await ctx.openThread('t1'); });
  }

  it('rewrites the borrow request with the countered terms, accepted', async () => {
    await renderWith([request, counter]);
    await act(async () => { await ctx.acceptCounterOffer('t1', 'm2'); });

    const [id, payload] = mockUpdateMessagePayload.mock.calls[0];
    expect(id).toBe('m1');
    expect(payload).toMatchObject({
      status: 'accepted', pricePerDay: 8, days: 1,
      startDateISO: '2026-11-10', endDateISO: '2026-11-10',
    });
  });

  it('marks the offer accepted, in the database and locally', async () => {
    await renderWith([request, counter]);
    await act(async () => { await ctx.acceptCounterOffer('t1', 'm2'); });

    expect(mockUpdateMessagePayload).toHaveBeenCalledWith('m2', expect.objectContaining({ status: 'accepted' }));
    const msgs = ctx.getThread('t1')!.messages;
    expect((msgs.find((m) => m.id === 'm2')!.payload as { status?: string }).status).toBe('accepted');
    expect((msgs.find((m) => m.id === 'm1')!.payload as { status?: string }).status).toBe('accepted');
  });

  it('refuses when the request was already accepted', async () => {
    await renderWith([{ ...request, payload: { ...request.payload, status: 'accepted' } }, counter]);
    await expect(ctx.acceptCounterOffer('t1', 'm2')).rejects.toThrow(/already accepted/);
    expect(mockUpdateMessagePayload).not.toHaveBeenCalled();
  });

  it('refuses when there is no borrow request to apply the offer to', async () => {
    await renderWith([counter]);
    await expect(ctx.acceptCounterOffer('t1', 'm2')).rejects.toThrow(/no borrow request/);
    expect(mockUpdateMessagePayload).not.toHaveBeenCalled();
  });
});
