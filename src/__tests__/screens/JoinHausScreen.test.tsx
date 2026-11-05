/**
 * Tests for JoinHausScreen — where a /join/<code> invite link lands.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockNav = { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), canGoBack: () => true };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ key: 'k', name: 'JoinHaus', params: { code: 'abc123def456' } }),
}));

const mockRefreshHauses = jest.fn().mockResolvedValue(undefined);
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ refreshHauses: mockRefreshHauses }),
}));
const mockConfirm = jest.fn();
jest.mock('../../context/ConfirmationContext', () => ({
  useConfirmation: () => mockConfirm,
}));

const mockPreview = jest.fn();
const mockJoin = jest.fn();
jest.mock('../../services/hausService', () => ({
  fetchHausInvitePreview: (...a: unknown[]) => mockPreview(...a),
  joinHausByInviteCode: (...a: unknown[]) => mockJoin(...a),
}));

import JoinHausScreen from '../../screens/hauses/JoinHausScreen';

const haus = { id: 'h1', name: 'Alpha Phi Closet', description: 'Our closet', member_count: 3, piece_count: 12 };

beforeEach(() => {
  jest.clearAllMocks();
  mockJoin.mockResolvedValue('h1');
});

async function renderScreen() {
  render(<JoinHausScreen />);
  await act(async () => {});
}

it('shows the haus the link is for', async () => {
  mockPreview.mockResolvedValue({ ...haus, is_member: false });
  await renderScreen();

  expect(mockPreview).toHaveBeenCalledWith('abc123def456');
  expect(screen.getByText("YOU'RE INVITED TO")).toBeTruthy();
  expect(screen.getByText('Alpha Phi Closet')).toBeTruthy();
  expect(screen.getByText('3 members · 12 pieces')).toBeTruthy();
});

it('joins, refreshes the haus list, confirms, and opens the haus', async () => {
  mockPreview.mockResolvedValue({ ...haus, is_member: false });
  await renderScreen();

  await act(async () => { fireEvent.press(screen.getByText('JOIN HAUS')); });

  expect(mockJoin).toHaveBeenCalledWith('abc123def456');
  expect(mockRefreshHauses).toHaveBeenCalled();
  expect(mockConfirm).toHaveBeenCalledWith('You joined Alpha Phi Closet');
  expect(mockNav.replace).toHaveBeenCalledWith('HausDetail', { haus: { ...haus, member_count: 4 } });
});

it('stays put with an error if joining fails', async () => {
  mockPreview.mockResolvedValue({ ...haus, is_member: false });
  mockJoin.mockRejectedValue(new Error('nope'));
  await renderScreen();

  await act(async () => { fireEvent.press(screen.getByText('JOIN HAUS')); });

  expect(screen.getByText("Couldn't join this Haus. Try again.")).toBeTruthy();
  expect(screen.getByText('JOIN HAUS')).toBeTruthy();
  expect(mockNav.replace).not.toHaveBeenCalled();
});

it('offers to open the haus instead when already a member', async () => {
  mockPreview.mockResolvedValue({ ...haus, is_member: true });
  await renderScreen();

  expect(screen.queryByText('JOIN HAUS')).toBeNull();
  fireEvent.press(screen.getByText('OPEN HAUS'));
  expect(mockJoin).not.toHaveBeenCalled();
  expect(mockNav.replace).toHaveBeenCalledWith('HausDetail', { haus });
});

it('says so when the code matches no haus', async () => {
  mockPreview.mockResolvedValue(null);
  await renderScreen();

  expect(screen.getByText('INVITE NOT FOUND')).toBeTruthy();
  expect(screen.queryByText('JOIN HAUS')).toBeNull();
});
