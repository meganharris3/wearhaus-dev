/**
 * Tests for ItemDetailScreen's tappable owner name — the "Listed by {name}" line and the
 * lender card at the bottom should both navigate to that person's profile, except when
 * viewing your own item (nothing useful to navigate to).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

let mockCurrentUserId: string | undefined = 'me';
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockCurrentUserId ? { id: mockCurrentUserId } : null }),
}));

jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({
    isFavorited: () => false,
    toggleFavorite: jest.fn(),
    favoriteCount: () => 0,
    getComments: () => [],
    loadComments: jest.fn().mockResolvedValue(undefined),
    addComment: jest.fn(),
  }),
}));
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ findThreadByUser: () => undefined }),
}));

import ItemDetailScreen from '../../screens/item/ItemDetailScreen';
import type { Item } from '../../types';

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  owner_id: 'u1',
  name: 'Silk Slip Dress',
  category: ['dress'],
  size_label: ['S'],
  price_per_day: 800,
  status: 'available',
  location_label: '0.3 mi · NYU',
  owner: { id: 'u1', display_name: 'Maya Chen' },
  ...overrides,
});

function renderScreen(item: Item) {
  return render(<ItemDetailScreen route={{ key: 'k', name: 'ItemDetail', params: { item } }} navigation={{} as never} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUserId = 'me';
});

describe('ItemDetailScreen owner navigation', () => {
  it('tapping "Listed by {name}" navigates to the owner\'s profile', () => {
    renderScreen(makeItem());
    fireEvent.press(screen.getByText('Listed by Maya Chen'));
    expect(mockNavigate).toHaveBeenCalledWith('FriendProfile', { userId: 'u1' });
  });

  it('tapping the lender card navigates to the owner\'s profile', () => {
    renderScreen(makeItem());
    // "Listed by Maya Chen" is one combined text node — only the lender card renders
    // "Maya Chen" as its own exact string.
    fireEvent.press(screen.getByText('Maya Chen'));
    expect(mockNavigate).toHaveBeenCalledWith('FriendProfile', { userId: 'u1' });
  });

  it('does not navigate when viewing your own item', () => {
    renderScreen(makeItem({ owner_id: 'me' }));
    fireEvent.press(screen.getByText(/Listed by/));
    expect(mockNavigate).not.toHaveBeenCalledWith('FriendProfile', expect.anything());
  });
});
