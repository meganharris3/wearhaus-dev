/**
 * Tests for ChatThreadScreen's counter-offer card — ACCEPT used to be a no-op, so a countered
 * request could never become a rental. Accepting now applies the offer's terms to the request
 * (MessagesContext.acceptCounterOffer, which flips it to accepted → rental is created).
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name: string }) => React.createElement(Text, rest, name);
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, profile: { display_name: 'Megan H' } }),
}));

const mockAcceptCounterOffer = jest.fn();
const mockSendMessage = jest.fn();
let mockThread: any;
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({
    getThread: () => mockThread,
    openThread: jest.fn().mockResolvedValue(undefined),
    markRead: jest.fn(),
    sendMessage: mockSendMessage,
    updateRequestStatus: jest.fn(),
    acceptCounterOffer: mockAcceptCounterOffer,
    createDirectThread: jest.fn(),
  }),
}));

let mockBorrows: any[] = [];
let mockLends: any[] = [];
jest.mock('../../context/BorrowsContext', () => ({
  useBorrows: () => ({ borrows: mockBorrows, lends: mockLends }),
}));

import ChatThreadScreen from '../../screens/messages/ChatThreadScreen';

const counter = (overrides: Record<string, unknown> = {}) => ({
  id: 'm2', threadId: 't1', type: 'counter_offer', senderId: 'u2', timestamp: '2026-11-01T01:00:00Z',
  payload: {
    pricePerDay: 800, dates: { start: 'Nov 10', end: 'Nov 10' },
    startDateISO: '2026-11-10', endDateISO: '2026-11-10', ...overrides,
  },
});

const mockNavigate = jest.fn();
function renderScreen() {
  return render(
    <ChatThreadScreen
      route={{ key: 'k', name: 'ChatThread', params: { threadId: 't1' } } as never}
      navigation={{ navigate: mockNavigate, goBack: jest.fn() } as never}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAcceptCounterOffer.mockResolvedValue(undefined);
  mockSendMessage.mockResolvedValue(undefined);
  mockBorrows = [];
  mockLends = [];
  mockThread = {
    id: 't1',
    otherUser: { id: 'u2', name: 'Jordan Lee', handle: '@jordan', initials: 'JL', avatarColor: '#eee' },
    status: 'active', unread: false, lastMessage: '', lastMessageTime: '', messages: [counter()],
  };
});

it("accepting the other person's counter offer applies it", async () => {
  renderScreen();
  await act(async () => { fireEvent.press(screen.getByText('ACCEPT')); });

  expect(mockAcceptCounterOffer).toHaveBeenCalledWith('t1', 'm2');
  expect(mockSendMessage).toHaveBeenCalledWith('t1', { type: 'system', text: 'Offer accepted' });
});

it('hides the actions once the offer is accepted', () => {
  mockThread.messages = [counter({ status: 'accepted' })];
  renderScreen();
  expect(screen.queryByText('ACCEPT')).toBeNull();
  expect(screen.getByText('Offer accepted')).toBeTruthy();
});

describe('accepted borrow request card', () => {
  const iso = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const request = (payload: Record<string, unknown>) => ({
    id: 'm1', threadId: 't1', type: 'borrow_request', senderId: 'me', timestamp: '2026-11-01T00:00:00Z',
    payload: {
      lenderId: 'u2', lenderFirstName: 'Jordan', borrowerId: 'me', borrowerFirstName: 'Megan',
      item: { name: 'Denim Jacket', size: 'M', condition: 'Good', thumbColor: '#ddd', photo: null },
      startDate: 'Nov 3', endDate: 'Nov 5', startDateISO: iso(0), endDateISO: iso(2),
      itemId: 'i1', days: 3, pricePerDay: 10, pickupMethod: 'Pickup', total: 32.1, status: 'accepted',
      ...payload,
    },
  });

  it('takes the borrower to their Borrowing dashboard', () => {
    mockThread.messages = [request({})];
    renderScreen();
    fireEvent.press(screen.getByText(/View in Borrowing/));
    expect(mockNavigate).toHaveBeenCalledWith('BorrowsDashboard', { mode: 'borrowing', tab: 'Active' });
  });

  it('takes the lender to their Lending dashboard', () => {
    mockThread.messages = [request({ lenderId: 'me', borrowerId: 'u2' })];
    renderScreen();
    fireEvent.press(screen.getByText(/View in Lending/));
    expect(mockNavigate).toHaveBeenCalledWith('BorrowsDashboard', { mode: 'lending', tab: 'Active' });
  });

  it('opens the Upcoming tab for a rental that has not started yet', () => {
    mockThread.messages = [request({ startDateISO: iso(5), endDateISO: iso(6) })];
    renderScreen();
    fireEvent.press(screen.getByText(/View in Borrowing/));
    expect(mockNavigate).toHaveBeenCalledWith('BorrowsDashboard', { mode: 'borrowing', tab: 'Upcoming' });
  });

  it("tapping the card opens the borrower's exchange for this rental", () => {
    mockThread.messages = [request({})];
    mockBorrows = [{ id: 'rental-9', threadId: 't1', startDate: iso(0) }];
    renderScreen();
    fireEvent.press(screen.getByText('Denim Jacket'));
    expect(mockNavigate).toHaveBeenCalledWith('ExchangeDetail', { exchangeId: 'rental-9', mode: 'borrowing' });
  });

  it("tapping the card opens the lender's exchange for this rental", () => {
    mockThread.messages = [request({ lenderId: 'me', borrowerId: 'u2' })];
    mockLends = [{ id: 'rental-9', threadId: 't1', startDate: iso(0) }];
    renderScreen();
    fireEvent.press(screen.getByText('Denim Jacket'));
    expect(mockNavigate).toHaveBeenCalledWith('ExchangeDetail', { exchangeId: 'rental-9', mode: 'lending' });
  });

  it('has no dashboard link while the request is still pending', () => {
    mockThread.messages = [request({ status: 'pending' })];
    renderScreen();
    expect(screen.queryByText(/View in Borrowing/)).toBeNull();
  });
});
