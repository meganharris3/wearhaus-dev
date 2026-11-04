/**
 * Tests for BorrowsDashboardScreen — rentals loaded once at app start and the dashboard never
 * re-fetched, so a request accepted after launch (which now creates its rental server-side,
 * see supabase/migrations/018_rental_on_borrow_accept.sql) wouldn't show up until a reload.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useFocusEffect: (cb: () => void) => { React.useEffect(cb, [cb]); },
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name: string }) => React.createElement(Text, rest, name);
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});

const mockRefresh = jest.fn();
let mockBorrows: any[] = [];
let mockLends: any[] = [];
jest.mock('../../context/BorrowsContext', () => ({
  ...jest.requireActual('../../context/BorrowsContext'),
  useBorrows: () => ({
    borrows: mockBorrows, lends: mockLends,
    updateBorrowStatus: jest.fn(), cancelBorrow: jest.fn(), refresh: mockRefresh,
  }),
}));
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ findThreadByUser: jest.fn(), createDirectThread: jest.fn(), sendMessage: jest.fn() }),
}));

import BorrowsDashboardScreen from '../../screens/borrows/BorrowsDashboardScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockBorrows = [];
  mockLends = [];
});

it('re-fetches rentals when the dashboard is opened', () => {
  render(<BorrowsDashboardScreen />);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

it('shows an accepted upcoming borrow under the Upcoming tab', () => {
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  mockBorrows = [{
    id: 'r1', itemId: 'i1', itemName: 'Denim Jacket', itemThumbColor: '#ddd',
    lenderId: 'l1', lenderName: 'Jordan Lee', lenderAvatarColor: '#eee',
    status: 'upcoming', pricePerDay: 1000, startDate: inAWeek, endDate: inAWeek,
    threadId: 't1', rating: null,
  }];
  render(<BorrowsDashboardScreen />);

  fireEvent.press(screen.getByText(/upcoming/i));
  expect(screen.getAllByText(/Denim Jacket/i).length).toBeGreaterThan(0);
});

it('shows the price and item photo on an upcoming borrow', () => {
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  mockBorrows = [{
    id: 'r1', itemId: 'i1', itemName: 'Denim Jacket', itemThumbColor: '#ddd',
    itemPhoto: 'https://x/jacket.jpg',
    lenderId: 'l1', lenderName: 'Jordan Lee', lenderAvatarColor: '#eee',
    status: 'upcoming', pricePerDay: 8.5, startDate: inAWeek, endDate: inAWeek,
    threadId: 't1', rating: null,
  }];
  render(<BorrowsDashboardScreen />);
  fireEvent.press(screen.getByText(/upcoming/i));

  expect(screen.getByText('$8.50/day')).toBeTruthy();
  expect(screen.getByTestId('item-photo').props.source).toEqual({ uri: 'https://x/jacket.jpg' });
});
