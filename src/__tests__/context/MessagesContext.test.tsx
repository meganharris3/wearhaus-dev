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
jest.mock('../../services/messageService', () => ({
  fetchThreads: (...args: unknown[]) => mockFetchThreads(...args),
  fetchThread: jest.fn(),
  fetchMessages: jest.fn(),
  findOrCreateThread: jest.fn(),
  sendMessage: jest.fn(),
  updateMessagePayload: jest.fn(),
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
