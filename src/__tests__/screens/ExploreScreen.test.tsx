/**
 * Tests for ExploreScreen
 *
 * The screen loads its feed from itemService (fetchFeedItems), runs a debounced
 * server-side search (searchItems), then filters client-side by item visibility
 * and the FRIENDS / HAUSES audience tags.
 *
 * Covers:
 * - masthead subtitle, search bar, filter chips
 * - renders the fetched feed and the results count
 * - hides other users' private items
 * - search calls searchItems with the trimmed query and shows its results
 * - clearing the search returns to the feed
 * - FRIENDS audience tag narrows to friends' items
 * - empty state, and keeping the previous items when a fetch fails
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => { React.useEffect(cb, [cb]); },
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' } }),
}));

let mockFriends: Array<{ id: string }> = [];
jest.mock('../../context/FriendsContext', () => ({
  useFriends: () => ({ friends: mockFriends }),
}));

jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ hauses: [] }),
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

import { fetchFeedItems, searchItems } from '../../services/itemService';
import ExploreScreen from '../../screens/explore/ExploreScreen';
import type { Item } from '../../types';

const mockFetchFeed = fetchFeedItems as jest.Mock;
const mockSearch = searchItems as jest.Mock;

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  owner_id: 'u1',
  name: 'Silk Slip Dress',
  category: 'dress',
  size_label: 'S',
  price_per_day: 800,
  status: 'available',
  location_label: '0.3 mi · NYU',
  visibility: 'public',
  owner: { id: 'u1', display_name: 'Maya Chen' },
  ...overrides,
});

const FEED = [
  makeItem({ id: 'i1', name: 'Silk Slip Dress' }),
  makeItem({ id: 'i2', name: 'Black Blazer', owner_id: 'u2', owner: { id: 'u2', display_name: 'Jo Park' } }),
  makeItem({ id: 'i3', name: 'Velvet Blazer', owner_id: 'u2', owner: { id: 'u2', display_name: 'Jo Park' } }),
];

const SEARCH_PLACEHOLDER = 'Search size, style, occasion…';

function getSearchInput() {
  const { TextInput } = require('react-native');
  return screen.UNSAFE_getAllByType(TextInput).find(
    (i: any) => i.props.placeholder === SEARCH_PLACEHOLDER,
  );
}

/**
 * Lets pending timers and promises run inside act(). The screen fetches inside a
 * setTimeout (0ms for the feed, 350ms debounce for a search) and then sets state
 * after an await, so assertions must wait for that to flush.
 */
async function settle(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

const SEARCH_DEBOUNCE = 400; // > the screen's 350ms debounce

async function renderLoaded() {
  render(<ExploreScreen />);
  await settle();
}

async function search(text: string) {
  fireEvent.changeText(getSearchInput(), text);
  await settle(SEARCH_DEBOUNCE);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFriends = [];
  mockFetchFeed.mockResolvedValue(FEED);
  mockSearch.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
describe('ExploreScreen render', () => {
  it('renders the Masthead with "The Edit" subtitle', async () => {
    await renderLoaded();
    expect(screen.getByText('The Edit')).toBeTruthy();
  });

  it('renders the search bar with the expected placeholder', async () => {
    await renderLoaded();
    expect(getSearchInput()).toBeTruthy();
  });

  it('renders filter chips (Size, Colour, Style, Event, Price)', async () => {
    await renderLoaded();
    for (const chip of ['SIZE', 'COLOUR', 'STYLE', 'EVENT', 'PRICE']) {
      expect(screen.getByText(new RegExp(`^${chip}`))).toBeTruthy();
    }
  });

  it('renders the FRIENDS and HAUSES audience tags', async () => {
    await renderLoaded();
    expect(screen.getByText('FRIENDS')).toBeTruthy();
    expect(screen.getByText('HAUSES')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------
describe('ExploreScreen feed', () => {
  it('loads the feed on mount and shows each item and the count', async () => {
    await renderLoaded();
    expect(mockFetchFeed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Silk Slip Dress')).toBeTruthy();
    expect(screen.getByText('Black Blazer')).toBeTruthy();
    expect(screen.getByText('Velvet Blazer')).toBeTruthy();
  });

  it("hides other users' private items, and the count reflects it", async () => {
    mockFetchFeed.mockResolvedValue([
      ...FEED,
      makeItem({ id: 'i4', name: 'Secret Coat', visibility: 'private', owner_id: 'u3', owner: { id: 'u3', display_name: 'Cy' } }),
    ]);
    await renderLoaded();

    expect(screen.getByText('3 PIECES')).toBeTruthy();
    expect(screen.queryByText('Secret Coat')).toBeNull();
  });

  it('shows my own private items', async () => {
    mockFetchFeed.mockResolvedValue([
      makeItem({ id: 'i5', name: 'My Private Jacket', visibility: 'private', owner_id: 'me', owner: { id: 'me', display_name: 'Me' } }),
    ]);
    await renderLoaded();

    expect(screen.getByText('1 PIECES')).toBeTruthy();
    expect(screen.getByText('My Private Jacket')).toBeTruthy();
  });

  it('shows "NO PIECES FOUND" when the feed is empty', async () => {
    mockFetchFeed.mockResolvedValue([]);
    await renderLoaded();
    expect(screen.getByText('NO PIECES FOUND')).toBeTruthy();
    expect(screen.getByText('0 PIECES')).toBeTruthy();
  });

  it('keeps the previous items when a later fetch fails', async () => {
    await renderLoaded();
    mockSearch.mockRejectedValue(new Error('network'));

    await search('blazer');

    expect(mockSearch).toHaveBeenCalled();
    expect(screen.getByText(`${FEED.length} PIECES`)).toBeTruthy();
    expect(screen.getByText('Silk Slip Dress')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
describe('ExploreScreen search', () => {
  it('searches on the server with the trimmed query and shows its results', async () => {
    await renderLoaded();
    mockSearch.mockResolvedValue([FEED[1], FEED[2]]);

    await search('  blazer ');

    expect(screen.getByText('2 PIECES')).toBeTruthy();
    expect(mockSearch).toHaveBeenCalledWith({ query: 'blazer' });
    expect(screen.getByText('Black Blazer')).toBeTruthy();
    expect(screen.getByText('Velvet Blazer')).toBeTruthy();
    expect(screen.queryByText('Silk Slip Dress')).toBeNull();
  });

  it('shows "NO PIECES FOUND" when the search returns nothing', async () => {
    await renderLoaded();
    mockSearch.mockResolvedValue([]);

    await search('xyznonexistent');

    expect(screen.getByText('NO PIECES FOUND')).toBeTruthy();
  });

  it('returns to the full feed when the query is cleared', async () => {
    await renderLoaded();
    mockSearch.mockResolvedValue([FEED[1]]);
    await search('blazer');
    expect(screen.getByText('1 PIECES')).toBeTruthy();

    await search('');

    expect(screen.getByText(`${FEED.length} PIECES`)).toBeTruthy();
    expect(mockFetchFeed).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Silk Slip Dress')).toBeTruthy();
  });

  it('does not search for a whitespace-only query', async () => {
    await renderLoaded();

    await search('   ');

    expect(mockFetchFeed).toHaveBeenCalledTimes(2);
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Audience filter
// ---------------------------------------------------------------------------
describe('ExploreScreen audience filter', () => {
  it("FRIENDS narrows the list to friends' items, and toggles back off", async () => {
    mockFriends = [{ id: 'u2' }];
    await renderLoaded();

    fireEvent.press(screen.getByText('FRIENDS'));
    await settle();

    expect(screen.getByText('2 PIECES')).toBeTruthy();
    expect(screen.queryByText('Silk Slip Dress')).toBeNull();
    expect(screen.getByText('Black Blazer')).toBeTruthy();

    fireEvent.press(screen.getByText('FRIENDS'));
    await settle();
    expect(screen.getByText('3 PIECES')).toBeTruthy();
  });
});
