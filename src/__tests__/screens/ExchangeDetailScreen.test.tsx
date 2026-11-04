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

// Dates are inlined: jest hoists these fixtures (they're used in a mock factory) above any
// other const, so a shared date const would still be undefined when they're built.
const borrow = {
  id: 'r1', itemId: 'i1', itemName: 'Denim Jacket', itemThumbColor: '#ddd',
  lenderId: 'l1', lenderName: 'Jordan Lee', lenderAvatarColor: '#eee',
  status: 'upcoming', pricePerDay: 10, startDate: '2099-01-15', endDate: '2099-01-15', threadId: 't1', rating: null,
};
const lend = {
  id: 'r2', itemId: 'i2', itemName: 'Silk Scarf', itemThumbColor: '#ddd',
  borrowerId: 'b1', borrowerName: 'Sam Park', borrowerInitials: 'SP', borrowerAvatarColor: '#eee',
  status: 'upcoming', pricePerDay: 5, startDate: '2099-01-15', endDate: '2099-01-15', threadId: 't2',
  acceptedAt: '2026-11-03T18:20:00.000Z',
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

it('shows the tab footer', () => {
  mockRouteParams = { exchangeId: 'r1', mode: 'borrowing' };
  render(<ExchangeDetailScreen />);
  expect(screen.getByLabelText('Closet')).toBeTruthy();
});

it('shows when the request was accepted (a full timestamp, not a plain date)', () => {
  mockRouteParams = { exchangeId: 'r2', mode: 'lending' };
  render(<ExchangeDetailScreen />);
  expect(screen.queryByText(/Invalid Date/)).toBeNull();
  expect(screen.getByText('Nov 3')).toBeTruthy();
});
