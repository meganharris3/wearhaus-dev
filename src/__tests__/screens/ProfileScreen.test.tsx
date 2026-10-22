/**
 * Tests for the own-profile screen's edit + save flow.
 *
 * Covers:
 * - the pencil enters edit mode and reveals SAVE
 * - SAVE sends the edited name and username to updateProfile
 * - a name-only edit does not resend the username
 * - a failed save shows the error and stays in edit mode
 * - a blank name is rejected before anything is sent
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useFocusEffect: (cb: () => void) => { React.useEffect(cb, [cb]); },
  };
});

// The global setup only mocks Ionicons; this screen also uses MaterialCommunityIcons.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name: string }) => React.createElement(Text, rest, name);
  return { Ionicons: Icon, MaterialCommunityIcons: Icon };
});

const mockUpdateProfile = jest.fn();
let mockProfile: Record<string, unknown> | null = null;
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: mockProfile,
    signOut: jest.fn(),
    updateProfile: mockUpdateProfile,
  }),
}));

jest.mock('../../context/ClosetContext', () => ({
  useCloset: () => ({ items: [], deleteItem: jest.fn() }),
}));
jest.mock('../../context/HausesContext', () => ({
  useHauses: () => ({ hauses: [] }),
}));
jest.mock('../../context/FriendsContext', () => ({
  useFriends: () => ({ friends: [] }),
}));
jest.mock('../../context/BorrowsContext', () => ({
  useBorrows: () => ({ borrowStats: { active: 0 }, lendStats: { active: 0 } }),
}));
jest.mock('../../context/MessagesContext', () => ({
  useMessages: () => ({ findThreadByUser: jest.fn(), unreadCount: 0 }),
}));
jest.mock('../../context/RequestsContext', () => ({
  useRequests: () => ({ pendingCount: 0 }),
}));

let mockFavoritedItems: any[] = [];
jest.mock('../../context/InteractionsContext', () => ({
  useInteractions: () => ({
    favoritedItems: mockFavoritedItems,
    isFavorited: () => false,
    toggleFavorite: jest.fn(),
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../../services/storageService', () => ({ uploadAvatar: jest.fn() }));

jest.mock('../../context/InstallPromptContext', () => ({
  useInstallPrompt: () => ({
    isOpen: false, open: jest.fn(), close: jest.fn(), maybeAutoShow: jest.fn(),
    canNativeInstall: false, promptNativeInstall: jest.fn(),
    showInstallRow: false, snooze: jest.fn(), acknowledge: jest.fn(),
  }),
}));

import ProfileScreen from '../../screens/profile/ProfileScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROFILE = {
  id: 'u1',
  display_name: 'Maya Chen',
  username: 'maya',
  university: 'NYU',
  bio: 'hello',
  items_listed: 0,
  rentals_completed: 0,
  rating: 4.9,
};

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

async function renderEditing() {
  render(<ProfileScreen />);
  await settle();
  fireEvent.press(screen.getByText('pencil'));
  await settle();
}

const nameInput = () => screen.getByPlaceholderText('Display name');
const usernameInput = () => screen.getByPlaceholderText('username');

async function pressSave() {
  await act(async () => { fireEvent.press(screen.getByText('Save')); });
  await settle();
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = { ...PROFILE };
  mockUpdateProfile.mockResolvedValue(undefined);
  mockFavoritedItems = [];
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => alertSpy.mockRestore());

// ---------------------------------------------------------------------------
describe('ProfileScreen edit mode', () => {
  it('shows the profile name and handle, and no SAVE button until editing', async () => {
    render(<ProfileScreen />);
    await settle();

    expect(screen.getByText('Maya Chen')).toBeTruthy();
    expect(screen.getByText('@maya')).toBeTruthy();
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('enters edit mode from the pencil, with the fields pre-filled and SAVE shown', async () => {
    await renderEditing();

    expect(screen.getByText('Save')).toBeTruthy();
    expect(nameInput().props.value).toBe('Maya Chen');
    expect(usernameInput().props.value).toBe('maya');
  });
});

describe('ProfileScreen save', () => {
  it('sends the edited display name and username to updateProfile', async () => {
    await renderEditing();

    fireEvent.changeText(nameInput(), '  Maya Renamed ');
    fireEvent.changeText(usernameInput(), '@Maya_New');
    await pressSave();

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Maya Renamed', username: 'maya_new' }),
    );
  });

  it('leaves edit mode after a successful save', async () => {
    await renderEditing();

    fireEvent.changeText(nameInput(), 'Maya Renamed');
    await pressSave();

    expect(screen.queryByText('Save')).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does not resend the username when only the name changed', async () => {
    await renderEditing();

    fireEvent.changeText(nameInput(), 'Maya Renamed');
    await pressSave();

    const sent = mockUpdateProfile.mock.calls[0][0];
    expect(sent.display_name).toBe('Maya Renamed');
    expect(sent).not.toHaveProperty('username');
  });

  it('shows the error and stays in edit mode when the save fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('That username is already taken. Try a different one.'));
    await renderEditing();

    fireEvent.changeText(usernameInput(), 'taken');
    await pressSave();

    expect(alertSpy).toHaveBeenCalledWith('Save failed', 'That username is already taken. Try a different one.');
    expect(screen.getByText('Save')).toBeTruthy();
    expect(nameInput().props.value).toBe('Maya Chen');
    expect(usernameInput().props.value).toBe('taken'); // the user's input is kept for another try
  });

  it('rejects a blank display name without sending anything', async () => {
    await renderEditing();

    fireEvent.changeText(nameInput(), '   ');
    await pressSave();

    expect(alertSpy).toHaveBeenCalledWith('Name required', 'Display name cannot be empty.');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('cancelling discards the edits', async () => {
    await renderEditing();

    fireEvent.changeText(nameInput(), 'Something Else');
    // Two icons read 'close' in edit mode (the cancel X in the top-left, then the avatar's edit toggle).
    fireEvent.press(screen.getAllByText('close')[0]);
    await settle();

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.getByText('Maya Chen')).toBeTruthy();
  });
});

describe('ProfileScreen favorites', () => {
  it('shows items I favorited that belong to other people', async () => {
    mockFavoritedItems = [
      { id: 'i1', owner_id: 'u2', name: 'Velvet Blazer', category: 'jacket', size_label: 'M', price_per_day: 1000, status: 'available', location_label: 'NYU' },
    ];
    render(<ProfileScreen />);
    await settle();

    expect(screen.getByText('Velvet Blazer')).toBeTruthy();
  });

  it('excludes my own items from the favorites section', async () => {
    mockFavoritedItems = [
      { id: 'i1', owner_id: 'u1', name: 'My Own Jacket', category: 'jacket', size_label: 'M', price_per_day: 1000, status: 'available', location_label: 'NYU' },
    ];
    render(<ProfileScreen />);
    await settle();

    expect(screen.queryByText('My Own Jacket')).toBeNull();
  });

  it('shows "No favorites yet" when there are none', async () => {
    mockFavoritedItems = [];
    render(<ProfileScreen />);
    await settle();

    expect(screen.getByText('No favorites yet')).toBeTruthy();
  });
});
