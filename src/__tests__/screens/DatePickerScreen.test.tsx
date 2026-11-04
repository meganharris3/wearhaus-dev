/**
 * Tests for DatePickerScreen's borrow request — a 1-day rental is requestable, and the
 * request carries the real dates and item id the rental is later built from (see
 * supabase/migrations/018_rental_on_borrow_accept.sql). The display dates ('Nov 3') have no
 * year, so without these the database can't create the rental when the lender accepts.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { toDateStr } from '../../utils/dateUtils';

const mockCreateThread = jest.fn();
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ createThread: mockCreateThread }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'borrower-1' }, profile: { display_name: 'Megan H' } }),
}));

import DatePickerScreen from '../../screens/item/DatePickerScreen';
import type { Item } from '../../types';

const item: Item = {
  id: 'item-1', owner_id: 'lender-1', name: 'Denim Jacket', category: ['jacket'],
  size_label: ['M'], price_per_day: 1000, status: 'available', location_label: 'NYU',
  owner: { id: 'lender-1', display_name: 'Jordan Lee' },
};

const navigate = jest.fn();
function renderScreen() {
  return render(
    <DatePickerScreen
      route={{ key: 'k', name: 'DatePicker', params: { item } }}
      navigation={{ navigate, goBack: jest.fn() } as never}
    />,
  );
}

const today = new Date();
const todayLabel = String(today.getDate());

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateThread.mockResolvedValue({ id: 'thread-1' });
});

it('lets you request a single day by tapping the same date twice', async () => {
  renderScreen();
  fireEvent.press(screen.getAllByText(todayLabel)[0]);
  fireEvent.press(screen.getAllByText(todayLabel)[0]);

  expect(screen.getByText('1 day · Tap to change')).toBeTruthy();

  await act(async () => { fireEvent.press(screen.getByText('REQUEST')); });

  const payload = mockCreateThread.mock.calls[0][0].payload;
  expect(payload.days).toBe(1);
  expect(payload.startDateISO).toBe(toDateStr(today));
  expect(payload.endDateISO).toBe(toDateStr(today));
  expect(navigate).toHaveBeenCalledWith('ChatThread', { threadId: 'thread-1' });
});

it('includes the item id and real YYYY-MM-DD dates in the request payload', async () => {
  renderScreen();
  fireEvent.press(screen.getAllByText(todayLabel)[0]);
  fireEvent.press(screen.getAllByText(todayLabel)[0]);
  await act(async () => { fireEvent.press(screen.getByText('REQUEST')); });

  const payload = mockCreateThread.mock.calls[0][0].payload;
  expect(payload.itemId).toBe('item-1');
  expect(payload.startDateISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(payload.borrowerId).toBe('borrower-1');
  expect(payload.lenderId).toBe('lender-1');
});
