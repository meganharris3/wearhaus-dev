/**
 * Tests for the routed Explore tab (screens/home/ExploreScreen), focused on
 * item visibility: which fetched items are shown, and how the FRIENDS / HAUSES
 * audience pills narrow them.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
let mockRouteParams: { campusId?: string } | undefined = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

let mockProfile: { campus_verified?: boolean; campus_id?: string; campus_name?: string } | null = null;
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, profile: mockProfile }),
}));

jest.mock('../../services/hausService', () => ({
  fetchCampusHaus: jest.fn(),
  fetchAllHausMembers: jest.fn(),
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
jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({ isFavorited: () => false, toggleFavorite: jest.fn() }),
}));

jest.mock('../../services/itemService', () => ({
  fetchFeedItems: jest.fn(),
  searchItems: jest.fn(),
}));

import { fetchFeedItems } from '../../services/itemService';
import { fetchCampusHaus, fetchAllHausMembers } from '../../services/hausService';
import ExploreScreen from '../../screens/home/ExploreScreen';
import type { Item } from '../../types';

const mockFetchFeed = fetchFeedItems as jest.Mock;
const mockFetchCampusHaus = fetchCampusHaus as jest.Mock;
const mockFetchAllHausMembers = fetchAllHausMembers as jest.Mock;

const makeItem = (overrides: Partial<Item>): Item => ({
  id: 'x',
  owner_id: 'stranger',
  name: 'Item',
  category: ['dress'],
  size_label: ['M'],
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
  mockProfile = null;
  mockRouteParams = undefined;
  mockFetchCampusHaus.mockResolvedValue(null);
  mockFetchAllHausMembers.mockResolvedValue([]);
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

describe('Explore campus audience', () => {
  it('does not show a Campus pill when the viewer is not campus-verified', async () => {
    mockProfile = { campus_verified: false };
    await renderWith([makeItem({ id: '1', name: 'Public Dress' })]);
    expect(screen.queryByText('CAMPUS')).toBeNull();
  });

  it('shows a Campus pill, labeled with the campus name, once verified', async () => {
    mockProfile = { campus_verified: true, campus_id: 'uc-berkeley', campus_name: 'UC Berkeley' };
    await renderWith([makeItem({ id: '1', name: 'Public Dress' })]);
    expect(screen.getByText('UC BERKELEY')).toBeTruthy();
  });

  it('CAMPUS narrows to items owned by members of the campus haus', async () => {
    mockProfile = { campus_verified: true, campus_id: 'uc-berkeley', campus_name: 'UC Berkeley' };
    mockFetchCampusHaus.mockResolvedValue({ id: 'campus-haus-1', name: 'x', member_count: 1, piece_count: 1 });
    mockFetchAllHausMembers.mockResolvedValue([{ userId: 'classmate', role: 'member', joinedAt: '', displayName: 'x' }]);

    await renderWith([
      makeItem({ id: '1', name: 'Public Dress' }),
      makeItem({ id: '2', name: 'Classmate Jacket', owner_id: 'classmate' }),
    ]);
    await settle(); // the campus-member fetch resolves on a separate effect from the feed

    fireEvent.press(screen.getByText('UC BERKELEY'));
    await settle();

    expect(shown('Classmate Jacket')).toBe(true);
    expect(shown('Public Dress')).toBe(false);
    expect(mockFetchCampusHaus).toHaveBeenCalledWith('uc-berkeley');
    expect(mockFetchAllHausMembers).toHaveBeenCalledWith('campus-haus-1');
  });

  it('defaults the audience to Campus when arriving with a campusId route param', async () => {
    mockProfile = { campus_verified: true, campus_id: 'uc-berkeley', campus_name: 'UC Berkeley' };
    mockRouteParams = { campusId: 'uc-berkeley' };
    mockFetchCampusHaus.mockResolvedValue({ id: 'campus-haus-1', name: 'x', member_count: 1, piece_count: 1 });
    mockFetchAllHausMembers.mockResolvedValue([{ userId: 'classmate', role: 'member', joinedAt: '', displayName: 'x' }]);

    await renderWith([
      makeItem({ id: '1', name: 'Public Dress' }),
      makeItem({ id: '2', name: 'Classmate Jacket', owner_id: 'classmate' }),
    ]);
    await settle();

    // No tap on the pill — it should already be filtered to campus members on arrival.
    expect(shown('Classmate Jacket')).toBe(true);
    expect(shown('Public Dress')).toBe(false);
  });
});

describe('Explore size filter (multi-select items)', () => {
  it('matches an item if any one of its sizes is selected, not just an exact single match', async () => {
    // size_label is an array since 016_multi_select_item_fields.sql — an item listed in
    // multiple sizes should show up under a filter for any one of them, not require every
    // size on the item to be selected.
    await renderWith([
      makeItem({ id: '1', name: 'Two Size Dress', size_label: ['S', 'M'] }),
      makeItem({ id: '2', name: 'Large Only Coat', size_label: ['L'] }),
    ]);

    await act(async () => { fireEvent.press(screen.getByText('SIZE')); });
    await act(async () => { fireEvent.press(screen.getByText('M')); });

    expect(shown('Two Size Dress')).toBe(true);
    expect(shown('Large Only Coat')).toBe(false);
  });
});
