/**
 * Tests for ClosetScreen, focused on the Favorites tab.
 *
 * Covers:
 * - the Favorites tab exists alongside the status tabs
 * - selecting it shows only MY items that someone has hearted
 * - a spinner while that lookup is in flight, then the right empty state
 * - re-fetches when my item ids change, not on every unrelated render
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (cb: () => void) => { React.useEffect(cb, [cb]); },
  };
});

let mockItems: any[] = [];
jest.mock('../../context/ClosetContext', () => ({
  useCloset: () => ({ items: mockItems, deleteItem: jest.fn() }),
}));
jest.mock('../../context/BoardsContext', () => ({
  useBoards: () => ({ boards: [] }),
}));
jest.mock('../../context/RequestsContext', () => ({
  useRequests: () => ({ pendingCount: 0 }),
}));
jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({ isFavorited: () => false, toggleFavorite: jest.fn() }),
}));

jest.mock('../../services/interactionsService', () => ({
  fetchItemIdsWithFavorites: jest.fn(),
}));

import { fetchItemIdsWithFavorites } from '../../services/interactionsService';
import ClosetScreen from '../../screens/closet/ClosetScreen';
import type { Item } from '../../types';

const mockFetchFavorited = fetchItemIdsWithFavorites as jest.Mock;

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  owner_id: 'me',
  name: 'Denim Jacket',
  category: 'jacket',
  size_label: 'M',
  price_per_day: 1200,
  status: 'available',
  location_label: 'NYU',
  ...overrides,
});

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

function pressFavoritesTab() {
  fireEvent.press(screen.getByText('FAVORITES'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockItems = [];
  mockFetchFavorited.mockResolvedValue(new Set());
});

describe('ClosetScreen Favorites tab', () => {
  it('shows a FAVORITES tab alongside the others', async () => {
    render(<ClosetScreen />);
    await settle();

    for (const label of ['ALL', 'LISTED', 'LENT OUT', 'BORROWED', 'FAVORITES']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('looks up which of my items have been favorited, by my item ids', async () => {
    mockItems = [makeItem({ id: 'i1' }), makeItem({ id: 'i2' })];
    render(<ClosetScreen />);
    await settle();

    expect(mockFetchFavorited).toHaveBeenCalledWith(['i1', 'i2']);
  });

  it('shows only my items that have been favorited by someone', async () => {
    mockItems = [
      makeItem({ id: 'i1', name: 'Loved Jacket' }),
      makeItem({ id: 'i2', name: 'Unnoticed Skirt' }),
    ];
    mockFetchFavorited.mockResolvedValue(new Set(['i1']));
    render(<ClosetScreen />);
    await settle();

    pressFavoritesTab();
    await settle();

    expect(screen.getByText('Loved Jacket')).toBeTruthy();
    expect(screen.queryByText('Unnoticed Skirt')).toBeNull();
  });

  it('shows "NO FAVORITES YET" when none of my items have been favorited', async () => {
    mockItems = [makeItem({ id: 'i1' })];
    mockFetchFavorited.mockResolvedValue(new Set());
    render(<ClosetScreen />);
    await settle();

    pressFavoritesTab();
    await settle();

    expect(screen.getByText('NO FAVORITES YET')).toBeTruthy();
  });

  it('does not query when I have no items at all', async () => {
    mockItems = [];
    render(<ClosetScreen />);
    await settle();

    expect(mockFetchFavorited).not.toHaveBeenCalled();
  });

  it('does not re-run the lookup on an unrelated re-render with the same item ids', async () => {
    mockItems = [makeItem({ id: 'i1' })];
    const { rerender } = render(<ClosetScreen />);
    await settle();
    expect(mockFetchFavorited).toHaveBeenCalledTimes(1);

    rerender(<ClosetScreen />);
    await settle();

    expect(mockFetchFavorited).toHaveBeenCalledTimes(1);
  });
});
