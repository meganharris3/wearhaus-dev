/**
 * Tests for useVisitedProfile — loads another user's real profile and closet for the visitor
 * profile screen (FriendProfile). Before this, that screen only knew a visited user's name if
 * they happened to be in your friends list, never showed their avatar, and hardcoded their
 * closet to an empty list.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockFetchUserProfile = jest.fn();
jest.mock('../../services/userService', () => ({
  fetchUserProfile: (...args: unknown[]) => mockFetchUserProfile(...args),
}));
const mockFetchMyItems = jest.fn();
jest.mock('../../services/itemService', () => ({
  fetchMyItems: (...args: unknown[]) => mockFetchMyItems(...args),
}));

import { useVisitedProfile } from '../../hooks/useVisitedProfile';
import type { Item, Friend, Haus } from '../../types';

type Result = ReturnType<typeof useVisitedProfile>;
let result: Result;

function Harness({ userId, friends = [], hauses = [] }: { userId?: string; friends?: Friend[]; hauses?: Haus[] }) {
  result = useVisitedProfile(userId, { id: 'me', friends, hauses });
  return <Text>{result.items.length}</Text>;
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1', owner_id: 'u2', name: 'Item', category: ['dress'], size_label: ['S'],
  price_per_day: 800, status: 'available', location_label: 'NYU', visibility: 'public',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchUserProfile.mockResolvedValue({
    id: 'u2', display_name: 'Jordan Lee', username: 'jordan', avatar_url: 'https://img/a.jpg',
    items_listed: 0, rentals_completed: 0, rating: 4.6,
  });
  mockFetchMyItems.mockResolvedValue([]);
});

it('loads the visited user\'s profile by id', async () => {
  render(<Harness userId="u2" />);
  await settle();
  expect(mockFetchUserProfile).toHaveBeenCalledWith('u2');
  expect(result.profile?.display_name).toBe('Jordan Lee');
  expect(result.profile?.avatar_url).toBe('https://img/a.jpg');
});

it('loads every item in their closet, not just one status tab', async () => {
  render(<Harness userId="u2" />);
  await settle();
  expect(mockFetchMyItems).toHaveBeenCalledWith('u2', 'All');
});

it('hides their drafts and private items, keeps public ones', async () => {
  mockFetchMyItems.mockResolvedValue([
    makeItem({ id: 'pub', name: 'Public Dress' }),
    makeItem({ id: 'draft', status: 'draft' }),
    makeItem({ id: 'priv', visibility: 'private' }),
  ]);
  render(<Harness userId="u2" />);
  await settle();
  expect(result.items.map((i) => i.id)).toEqual(['pub']);
});

it('shows their friends-only items only if they are your friend', async () => {
  mockFetchMyItems.mockResolvedValue([makeItem({ id: 'fr', visibility: 'friends' })]);

  render(<Harness userId="u2" />);
  await settle();
  expect(result.items).toHaveLength(0);

  render(<Harness userId="u2" friends={[{ id: 'u2', name: 'Jordan', handle: '@jordan', initials: 'J', avatarColor: '#fff', itemsShared: 0 }]} />);
  await settle();
  expect(result.items.map((i) => i.id)).toEqual(['fr']);
});

it('does nothing without a userId', async () => {
  render(<Harness />);
  await settle();
  expect(mockFetchUserProfile).not.toHaveBeenCalled();
  expect(mockFetchMyItems).not.toHaveBeenCalled();
  expect(result.profile).toBeNull();
});

it('keeps going with the profile if loading items fails', async () => {
  mockFetchMyItems.mockRejectedValue(new Error('network'));
  render(<Harness userId="u2" />);
  await settle();
  expect(result.profile?.display_name).toBe('Jordan Lee');
  expect(result.items).toEqual([]);
});
