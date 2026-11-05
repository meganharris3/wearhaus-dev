/**
 * Tests for HausDetailScreen's Invite sheet — it used to copy a made-up
 * wearhaus.app/join/<slugified name> link and had no way to invite a friend in-app.
 *
 * Covers:
 * - the link shown and copied is the haus's real /join/<code> link
 * - friends who aren't members yet can be picked and sent in-app invites (which notify them)
 * - friends already in the haus aren't offered
 * - a haus with no link (a campus closet) offers no way to invite at all
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({
    key: 'k', name: 'HausDetail',
    params: { haus: { id: 'h1', name: 'Alpha Phi Closet', member_count: 2, piece_count: 0 } },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name: string }) => React.createElement(Text, rest, name);
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});

jest.mock('../../context/ClosetContext', () => ({
  useCloset: () => ({ items: [], updateItem: jest.fn() }),
}));
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ leaveHaus: jest.fn(), renameHaus: jest.fn() }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, profile: { display_name: 'Me' } }),
}));
jest.mock('../../context/HausCollectionsContext', () => ({
  useHausCollections: () => ({ getCollectionsForHaus: () => [], loadCollectionsForHaus: jest.fn() }),
}));
jest.mock('../../context/FriendsContext', () => ({
  useFriends: () => ({
    friends: [
      { id: 'f1', name: 'Jordan Lee', handle: '@jordan', initials: 'JL' },
      { id: 'f2', name: 'Alex Kim', handle: '@alexkim', initials: 'AK' },
    ],
  }),
}));
const mockConfirm = jest.fn();
jest.mock('../../context/ConfirmationContext', () => ({
  useConfirmation: () => mockConfirm,
}));

const mockInvite = jest.fn().mockResolvedValue(undefined);
const mockFetchCode = jest.fn();
jest.mock('../../services/hausService', () => ({
  fetchMembershipRole: jest.fn().mockResolvedValue('member'),
  // Alex is already a member
  fetchAllHausMembers: jest.fn().mockResolvedValue([
    { userId: 'me', role: 'admin', joinedAt: '', displayName: 'Me' },
    { userId: 'f2', role: 'member', joinedAt: '', displayName: 'Alex Kim' },
  ]),
  fetchHausInviteCode: (...a: unknown[]) => mockFetchCode(...a),
  inviteMembersToHaus: (...a: unknown[]) => mockInvite(...a),
}));
const mockSetString = jest.fn().mockResolvedValue(true);
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...a: unknown[]) => mockSetString(...a),
}));
jest.mock('../../utils/hausInvite', () => ({
  hausInviteUrl: (code: string) => `https://wearhaus.test/join/${code}`,
}));

import HausDetailScreen from '../../screens/hauses/HausDetailScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchCode.mockResolvedValue('abc123def456');
});

async function openInviteSheet() {
  render(<HausDetailScreen />);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByText('Invite')); });
}

it("shows and copies the haus's real invite link", async () => {
  await openInviteSheet();

  expect(screen.getByText('https://wearhaus.test/join/abc123def456')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('COPY')); });
  expect(mockSetString).toHaveBeenCalledWith('https://wearhaus.test/join/abc123def456');
  expect(mockConfirm).toHaveBeenCalledWith('Link copied');
});

it('only offers friends who are not already members', async () => {
  await openInviteSheet();

  expect(screen.getByText('Jordan Lee')).toBeTruthy();
  expect(screen.queryByText('@alexkim')).toBeNull();
});

it('sends in-app invites to the picked friends', async () => {
  await openInviteSheet();

  expect(screen.queryByText(/SEND \d INVITE/)).toBeNull();
  fireEvent.press(screen.getByText('Jordan Lee'));
  await act(async () => { fireEvent.press(screen.getByText('SEND 1 INVITE')); });

  expect(mockInvite).toHaveBeenCalledWith('h1', 'me', ['f1']);
  expect(mockConfirm).toHaveBeenCalledWith('Invite sent');
  expect(screen.getByText('INVITED')).toBeTruthy();
  expect(screen.queryByText(/SEND \d INVITE/)).toBeNull();
});

it('offers no invites for a haus without a link (a campus closet)', async () => {
  mockFetchCode.mockResolvedValue(null);
  await openInviteSheet();

  expect(screen.getByText(/Campus closets are for verified students/)).toBeTruthy();
  expect(screen.queryByText('Jordan Lee')).toBeNull();
  expect(screen.queryByText('COPY')).toBeNull();
});

it("says so when the link couldn't be loaded", async () => {
  mockFetchCode.mockRejectedValue(new Error('network'));
  await openInviteSheet();

  expect(screen.getByText("Couldn't load the invite link")).toBeTruthy();
});
