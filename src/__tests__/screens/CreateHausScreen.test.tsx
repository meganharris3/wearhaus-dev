/**
 * Tests for CreateHausScreen's "Add Members" step (Step2) — previously a pure mockup: a
 * free-text input that built a fake local Member object, never persisted, with the real Haus
 * only ever getting the creator as a member. This covers the real behavior: picking from the
 * actual friends list and sending real invites once the Haus exists.
 *
 * Covers:
 * - friends are listed and toggle-selectable (not a free-text "add" anymore)
 * - the search box filters the friends list by name
 * - finishing the flow creates the Haus, then invites exactly the selected friends — using the
 *   real server-assigned haus id, not the optimistic local one
 * - no invite call at all when nobody was selected
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

const mockAddHaus = jest.fn();
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ addHaus: mockAddHaus }),
}));
jest.mock('../../context/ClosetContext', () => ({
  useCloset: () => ({ items: [] }),
}));
let mockFriends: Array<{ id: string; name: string; handle: string; initials: string }> = [];
jest.mock('../../context/FriendsContext', () => ({
  useFriends: () => ({ friends: mockFriends }),
}));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, profile: { display_name: 'Me' } }),
}));

const mockInviteMembersToHaus = jest.fn().mockResolvedValue(undefined);
jest.mock('../../services/hausService', () => ({
  inviteMembersToHaus: (...args: unknown[]) => mockInviteMembersToHaus(...args),
}));

import CreateHausScreen from '../../screens/hauses/CreateHausScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockFriends = [
    { id: 'f1', name: 'Jordan Lee', handle: '@jordan', initials: 'JL' },
    { id: 'f2', name: 'Alex Kim', handle: '@alexkim', initials: 'AK' },
  ];
  mockAddHaus.mockResolvedValue({ id: 'real-haus-id', name: 'My Haus', member_count: 1, piece_count: 0 });
});

async function goToStep2() {
  render(<CreateHausScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Alpha Phi Closet'), 'My Haus');
  await act(async () => { fireEvent.press(screen.getByText('NEXT')); });
}

async function finishFlow() {
  // Step2 -> Step3 -> Step4
  await act(async () => { fireEvent.press(screen.getByText('NEXT')); });
  await act(async () => { fireEvent.press(screen.getByText('NEXT')); });
  await act(async () => { fireEvent.press(screen.getByText('GO TO HAUS')); });
}

describe('CreateHausScreen friend picker', () => {
  it('lists real friends instead of a free-text add box', async () => {
    await goToStep2();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(screen.getByText('@jordan')).toBeTruthy();
    expect(screen.getByText('Alex Kim')).toBeTruthy();
  });

  it('filters the friends list by the search box', async () => {
    await goToStep2();
    fireEvent.changeText(screen.getByPlaceholderText('Search friends…'), 'jordan');
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(screen.queryByText('Alex Kim')).toBeNull();
  });

  it('shows a hint instead of a list when the user has no friends yet', async () => {
    mockFriends = [];
    await goToStep2();
    expect(screen.getByText(/Add some friends first/)).toBeTruthy();
  });
});

describe('CreateHausScreen finishing the flow', () => {
  it('invites exactly the selected friends, using the real server-assigned haus id', async () => {
    await goToStep2();
    await act(async () => { fireEvent.press(screen.getByText('Jordan Lee')); });

    await finishFlow();

    expect(mockAddHaus).toHaveBeenCalled();
    expect(mockInviteMembersToHaus).toHaveBeenCalledWith('real-haus-id', 'me', ['f1']);
  });

  it('invites every friend selected, in the order they were picked', async () => {
    await goToStep2();
    await act(async () => { fireEvent.press(screen.getByText('Jordan Lee')); });
    await act(async () => { fireEvent.press(screen.getByText('Alex Kim')); });

    await finishFlow();

    expect(mockInviteMembersToHaus).toHaveBeenCalledWith('real-haus-id', 'me', ['f1', 'f2']);
  });

  it('does not call inviteMembersToHaus at all when nobody was selected', async () => {
    await goToStep2();
    await finishFlow();

    expect(mockAddHaus).toHaveBeenCalled();
    expect(mockInviteMembersToHaus).not.toHaveBeenCalled();
  });

  it('deselecting a friend before finishing leaves them out of the invite', async () => {
    await goToStep2();
    await act(async () => { fireEvent.press(screen.getByText('Jordan Lee')); });
    await act(async () => { fireEvent.press(screen.getByText('Alex Kim')); });
    await act(async () => { fireEvent.press(screen.getByText('Jordan Lee')); }); // deselect

    await finishFlow();

    expect(mockInviteMembersToHaus).toHaveBeenCalledWith('real-haus-id', 'me', ['f2']);
  });
});
