/**
 * Tests for ExchangeDetailScreen's total card — whether it says "You'll Earn" or "Total Due"
 * followed the `mode` route param, so a borrower who reached a rental by any route that passed
 * 'lending' would be told what they'd earn. It now follows which side of the rental they're on.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'k', name: 'ExchangeDetail', params: mockRouteParams }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name: string }) => React.createElement(Text, rest, name);
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});

const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
const borrow = {
  id: 'r1', itemId: 'i1', itemName: 'Denim Jacket', itemThumbColor: '#ddd',
  lenderId: 'l1', lenderName: 'Jordan Lee', lenderAvatarColor: '#eee',
  status: 'upcoming', pricePerDay: 10, startDate: inAWeek, endDate: inAWeek, threadId: 't1', rating: null,
};
const lend = {
  id: 'r2', itemId: 'i2', itemName: 'Silk Scarf', itemThumbColor: '#ddd',
  borrowerId: 'b1', borrowerName: 'Sam Park', borrowerInitials: 'SP', borrowerAvatarColor: '#eee',
  status: 'upcoming', pricePerDay: 5, startDate: inAWeek, endDate: inAWeek, threadId: 't2',
};
jest.mock('../../context/BorrowsContext', () => ({
  ...jest.requireActual('../../context/BorrowsContext'),
  useBorrows: () => ({ borrows: [borrow], lends: [lend], updateBorrowStatus: jest.fn() }),
}));
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ findThreadByUser: jest.fn(), createDirectThread: jest.fn(), sendMessage: jest.fn() }),
}));

import ExchangeDetailScreen from '../../screens/borrows/ExchangeDetailScreen';

it('shows the borrower what they pay', () => {
  mockRouteParams = { exchangeId: 'r1', mode: 'borrowing' };
  render(<ExchangeDetailScreen />);
  expect(screen.getByText(/Total Due/i)).toBeTruthy();
  expect(screen.queryByText(/You'll Earn/i)).toBeNull();
});

it("never shows the borrower \"You'll Earn\", even if opened as 'lending'", () => {
  mockRouteParams = { exchangeId: 'r1', mode: 'lending' };
  render(<ExchangeDetailScreen />);
  expect(screen.getByText('Denim Jacket')).toBeTruthy();
  expect(screen.queryByText(/You'll Earn/i)).toBeNull();
});

it("shows the lender what they'll earn", () => {
  mockRouteParams = { exchangeId: 'r2', mode: 'lending' };
  render(<ExchangeDetailScreen />);
  expect(screen.getByText(/You'll Earn/i)).toBeTruthy();
});
