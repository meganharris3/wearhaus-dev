/**
 * Tests for the routed Explore tab (screens/home/ExploreScreen), focused on
 * item visibility: which fetched items are shown, and how the FRIENDS / HAUSES
 * audience pills narrow them.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));

let mockFriends: Array<{ id: string }> = [];
jest.mock('../../context/FriendsContext', () => ({
  useFriends: () => ({ friends: mockFriends }),
}));

let mockHauses: Array<{ id: string }> = [];
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ hauses: mockHauses }),
}));

// Masthead's bell and messages icons read these.
jest.mock('../../context/RequestsContext', () => ({
  useRequests: () => ({ pendingCount: 0 }),
}));
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ unreadCount: 0 }),
}));

jest.mock('../../services/itemService', () => ({
  fetchFeedItems: jest.fn(),
  searchItems: jest.fn(),
}));

import { fetchFeedItems } from '../../services/itemService';
import ExploreScreen from '../../screens/home/ExploreScreen';
import type { Item } from '../../types';

const mockFetchFeed = fetchFeedItems as jest.Mock;

const makeItem = (overrides: Partial<Item>): Item => ({
  id: 'x',
  owner_id: 'stranger',
  name: 'Item',
  category: 'dress',
  size_label: 'M',
  price_per_day: 800,
  status: 'available',
  location_label: 'NYU',
  visibility: 'public',
  ...overrides,
});

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

async function renderWith(items: Item[]) {
  mockFetchFeed.mockResolvedValue(items);
  render(<ExploreScreen />);
  await settle();
}

const shown = (name: string) => screen.queryByText(name) !== null;

beforeEach(() => {
  jest.clearAllMocks();
  mockFriends = [];
  mockHauses = [];
});

describe('Explore visibility', () => {
  it('shows public items and hides other people\'s private items', async () => {
    await renderWith([
      makeItem({ id: '1', name: 'Public Dress' }),
      makeItem({ id: '2', name: 'Private Coat', visibility: 'private' }),
    ]);
    expect(shown('Public Dress')).toBe(true);
    expect(shown('Private Coat')).toBe(false);
  });

  it('shows my own private items', async () => {
    await renderWith([makeItem({ id: '1', name: 'My Secret Top', visibility: 'private', owner_id: 'me' })]);
    expect(shown('My Secret Top')).toBe(true);
  });

  it('shows a hauses-only item that is shared to a haus I belong to', async () => {
    mockHauses = [{ id: 'h1' }];
    await renderWith([
      makeItem({ id: '1', name: 'Haus Blazer', visibility: 'hauses', haus_visibility: { h1: true } }),
    ]);
    expect(shown('Haus Blazer')).toBe(true);
  });

  it('hides a hauses-only item shared to hauses I am not in', async () => {
    mockHauses = [{ id: 'h1' }];
    await renderWith([
      makeItem({ id: '1', name: 'Other Haus Blazer', visibility: 'hauses', haus_visibility: { h2: true } }),
    ]);
    expect(shown('Other Haus Blazer')).toBe(false);
  });

  it("shows a friends-only item from a friend, even without the joined owner object", async () => {
    mockFriends = [{ id: 'pal' }];
    await renderWith([
      makeItem({ id: '1', name: 'Friend Skirt', visibility: 'friends', owner_id: 'pal' }),
      makeItem({ id: '2', name: 'Stranger Skirt', visibility: 'friends', owner_id: 'stranger' }),
    ]);
    expect(shown('Friend Skirt')).toBe(true);
    expect(shown('Stranger Skirt')).toBe(false);
  });
});

describe('Explore audience pills', () => {
  const items = () => [
    makeItem({ id: '1', name: 'Public Dress' }),
    makeItem({ id: '2', name: 'Pal Jacket', owner_id: 'pal' }),
    makeItem({ id: '3', name: 'Haus Blazer', visibility: 'hauses', haus_visibility: { h1: true } }),
  ];

  it('FRIENDS narrows to items owned by my friends (via owner_id)', async () => {
    mockFriends = [{ id: 'pal' }];
    mockHauses = [{ id: 'h1' }];
    await renderWith(items());

    fireEvent.press(screen.getByText('FRIENDS'));
    await settle();

    expect(shown('Pal Jacket')).toBe(true);
    expect(shown('Public Dress')).toBe(false);
    expect(shown('Haus Blazer')).toBe(false);
  });

  it('HAUSES narrows to items shared to my hauses', async () => {
    mockFriends = [{ id: 'pal' }];
    mockHauses = [{ id: 'h1' }];
    await renderWith(items());

    fireEvent.press(screen.getByText('HAUSES'));
    await settle();

    expect(shown('Haus Blazer')).toBe(true);
    expect(shown('Public Dress')).toBe(false);
    expect(shown('Pal Jacket')).toBe(false);
  });

  it('ALL shows everything visible again', async () => {
    mockFriends = [{ id: 'pal' }];
    mockHauses = [{ id: 'h1' }];
    await renderWith(items());
    fireEvent.press(screen.getByText('FRIENDS'));
    await settle();

    fireEvent.press(screen.getByText('ALL'));
    await settle();

    expect(shown('Public Dress')).toBe(true);
    expect(shown('Pal Jacket')).toBe(true);
    expect(shown('Haus Blazer')).toBe(true);
  });
});
