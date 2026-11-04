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

import ChatThreadScreen from '../../screens/messages/ChatThreadScreen';

const counter = (overrides: Record<string, unknown> = {}) => ({
  id: 'm2', threadId: 't1', type: 'counter_offer', senderId: 'u2', timestamp: '2026-11-01T01:00:00Z',
  payload: {
    pricePerDay: 800, dates: { start: 'Nov 10', end: 'Nov 10' },
    startDateISO: '2026-11-10', endDateISO: '2026-11-10', ...overrides,
  },
});

function renderScreen() {
  return render(
    <ChatThreadScreen
      route={{ key: 'k', name: 'ChatThread', params: { threadId: 't1' } } as never}
      navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAcceptCounterOffer.mockResolvedValue(undefined);
  mockSendMessage.mockResolvedValue(undefined);
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
