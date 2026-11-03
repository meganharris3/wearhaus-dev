/**
 * Tests for RequestsContext's haus_invite / haus_accepted support — the notification side of
 * real "Add Members" functionality (see hausService.test.ts for the service layer, and
 * CreateHausScreen.test.tsx for the picker UI). friend_request/borrow_request handling
 * pre-dates this change and isn't covered here.
 *
 * Covers:
 * - a pending haus_invite notification maps to a Request with hausName/borrowerName (inviter)
 * - a resolved haus_invite notification is hidden, same as friend_request/borrow_request
 * - haus_accepted maps to an already-accepted, informational Request
 * - acceptRequest/declineRequest on a haus_invite call acceptHausInvite/declineHausInvite with
 *   the invitation_id and haus_id from the notification payload, not some other id
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

let mockUser: { id: string } | null = { id: 'me' };
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: { display_name: 'Me' } }),
}));

const mockFetchNotifications = jest.fn();
jest.mock('../../services/notificationService', () => ({
  fetchNotifications: (...args: unknown[]) => mockFetchNotifications(...args),
  markNotificationRead: jest.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/friendService', () => ({
  acceptFriendRequest: jest.fn(),
  declineFriendRequest: jest.fn(),
}));
jest.mock('../../services/messageService', () => ({
  respondToBorrowRequest: jest.fn(),
}));

const mockAcceptHausInvite = jest.fn().mockResolvedValue(undefined);
const mockDeclineHausInvite = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/hausService', () => ({
  acceptHausInvite: (...args: unknown[]) => mockAcceptHausInvite(...args),
  declineHausInvite: (...args: unknown[]) => mockDeclineHausInvite(...args),
}));

import { RequestsProvider, useRequests, type Request } from '../../context/RequestsContext';

type Ctx = ReturnType<typeof useRequests>;
let ctx: Ctx;

function Capture() {
  ctx = useRequests();
  return <Text>{ctx.requests.length}</Text>;
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

async function renderProvider() {
  render(<RequestsProvider><Capture /></RequestsProvider>);
  await settle();
}

const hausInviteRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'n1',
  type: 'haus_invite',
  read: false,
  resolved: false,
  createdAt: '2026-01-01T00:00:00Z',
  payload: {
    invitation_id: 'invite-1',
    haus_id: 'haus-1',
    haus_name: 'Style Queens',
    inviter_id: 'u2',
    inviter_name: 'Jordan',
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 'me' };
  mockFetchNotifications.mockResolvedValue([]);
});

describe('haus_invite mapping', () => {
  it('maps a pending haus_invite to a pending Request naming the inviter and the haus', async () => {
    mockFetchNotifications.mockResolvedValue([hausInviteRow()]);
    await renderProvider();

    expect(ctx.requests).toHaveLength(1);
    const req = ctx.requests[0] as Request;
    expect(req.type).toBe('haus_invite');
    expect(req.status).toBe('pending');
    expect(req.borrowerName).toBe('Jordan');
    expect(req.hausName).toBe('Style Queens');
  });

  it('hides a haus_invite that has already been resolved', async () => {
    mockFetchNotifications.mockResolvedValue([hausInviteRow({ resolved: true })]);
    await renderProvider();
    expect(ctx.requests).toHaveLength(0);
  });
});

describe('haus_accepted mapping', () => {
  it('maps haus_accepted to an informational, already-accepted Request', async () => {
    mockFetchNotifications.mockResolvedValue([{
      id: 'n2', type: 'haus_accepted', read: false, resolved: false,
      createdAt: '2026-01-01T00:00:00Z',
      payload: { haus_name: 'Style Queens', from_name: 'Alex' },
    }]);
    await renderProvider();

    expect(ctx.requests).toHaveLength(1);
    const req = ctx.requests[0] as Request;
    expect(req.status).toBe('accepted');
    expect(req.borrowerName).toBe('Alex');
    expect(req.hausName).toBe('Style Queens');
  });
});

describe('responding to a haus_invite', () => {
  it('acceptRequest calls acceptHausInvite with the invitation_id, haus_id, and current user', async () => {
    mockFetchNotifications.mockResolvedValue([hausInviteRow()]);
    await renderProvider();

    await act(async () => { await ctx.acceptRequest('n1'); });

    expect(mockAcceptHausInvite).toHaveBeenCalledWith('invite-1', 'haus-1', 'me');
    expect(mockDeclineHausInvite).not.toHaveBeenCalled();
  });

  it('declineRequest calls declineHausInvite with the invitation_id and current user', async () => {
    mockFetchNotifications.mockResolvedValue([hausInviteRow()]);
    await renderProvider();

    await act(async () => { await ctx.declineRequest('n1'); });

    expect(mockDeclineHausInvite).toHaveBeenCalledWith('invite-1', 'me');
    expect(mockAcceptHausInvite).not.toHaveBeenCalled();
  });
});
