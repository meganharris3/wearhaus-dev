/**
 * Tests for AuthContext (AuthProvider + useAuth)
 *
 * Covers:
 * - loading resolves to false (also when getSession rejects)
 * - session, user and profile are populated from getSession
 * - signIn / signUp map service errors to a message string
 * - signOut delegates to authService
 * - onAuthStateChange: SIGNED_IN loads the profile, SIGNED_OUT clears it,
 *   INITIAL_SESSION is ignored (already handled by getSession)
 * - updateProfile / refreshProfile / updateCampus / completeOnboarding
 * - useAuth throws when used outside AuthProvider
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

// ---------------------------------------------------------------------------
// Mocks. The jest.fn()s are created inside the factories (not as outer
// `const mockX = jest.fn()`): babel-jest runs the imports below before those
// consts are initialised, so a factory referencing them would see `undefined`.
// They are read back through the mocked imports further down.
// ---------------------------------------------------------------------------
jest.mock('../../services/authService', () => ({
  getSession: jest.fn(),
  signIn:     jest.fn(),
  signUp:     jest.fn(),
  signOut:    jest.fn(),
}));

jest.mock('../../services/userService', () => ({
  fetchUserProfile:  jest.fn(),
  updateUserProfile: jest.fn(),
}));

// campusService pulls in the campus domain data and a Supabase client; the
// context only delegates to it, so stub it out.
jest.mock('../../services/campusService', () => ({
  updateUserCampus:       jest.fn(),
  markOnboardingComplete: jest.fn(),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
      getSession:        jest.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabase';
import * as authService from '../../services/authService';
import * as userService from '../../services/userService';
import * as campusService from '../../services/campusService';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const mockGetSession        = authService.getSession as jest.Mock;
const mockSignIn            = authService.signIn as jest.Mock;
const mockSignUp            = authService.signUp as jest.Mock;
const mockSignOut           = authService.signOut as jest.Mock;
const mockFetchUserProfile  = userService.fetchUserProfile as jest.Mock;
const mockUpdateUserProfile = userService.updateUserProfile as jest.Mock;
const mockUpdateUserCampus  = campusService.updateUserCampus as jest.Mock;
const mockMarkOnboarding    = campusService.markOnboardingComplete as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockLiveGetSession    = supabase.auth.getSession as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PROFILE = {
  id: 'user-1',
  display_name: 'Maya Chen',
  items_listed: 0,
  rentals_completed: 0,
  rating: 0,
};
const SESSION = { user: { id: 'user-1', email: 'u@test.com' }, access_token: 'tok' };

/** Lets pending promises/timers run inside act() so state updates are applied. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

type Auth = ReturnType<typeof useAuth>;
let auth: Auth;

/** Renders a provider and captures the latest context value into `auth`. */
async function renderProvider() {
  function Capture() {
    auth = useAuth();
    return (
      <>
        <Text testID="loading">{auth.loading ? 'loading' : 'ready'}</Text>
        <Text testID="userId">{auth.user?.id ?? 'none'}</Text>
        <Text testID="profileName">{auth.profile?.display_name ?? 'no-profile'}</Text>
      </>
    );
  }
  const utils = render(<AuthProvider><Capture /></AuthProvider>);
  await settle();
  return utils;
}

const text = (id: string) => screen.getByTestId(id).props.children;

/** The listener AuthProvider registered with supabase.auth.onAuthStateChange. */
const authListener = () => mockOnAuthStateChange.mock.calls[0][0] as (event: string, s: unknown) => Promise<void>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue(null);
  mockFetchUserProfile.mockResolvedValue(null);
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  mockLiveGetSession.mockResolvedValue({ data: { session: null } });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('loading state', () => {
  it('starts with loading=true and transitions to ready after getSession resolves', async () => {
    let resolveSession: (v: null) => void = () => {};
    mockGetSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));

    function Probe() {
      const { loading } = useAuth();
      return <Text testID="loading">{loading ? 'loading' : 'ready'}</Text>;
    }
    render(<AuthProvider><Probe /></AuthProvider>);

    expect(text('loading')).toBe('loading');

    await act(async () => { resolveSession(null); });

    expect(text('loading')).toBe('ready');
  });

  it('becomes ready even when getSession returns null', async () => {
    await renderProvider();
    expect(text('loading')).toBe('ready');
  });

  it('becomes ready with no user when getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('network'));
    await renderProvider();
    expect(text('loading')).toBe('ready');
    expect(text('userId')).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// Session + profile loading
// ---------------------------------------------------------------------------
describe('session initialisation', () => {
  it('populates user when getSession returns a session', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValue(PROFILE);

    await renderProvider();

    expect(text('userId')).toBe('user-1');
  });

  it('loads the profile for the session user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValue(PROFILE);

    await renderProvider();

    expect(mockFetchUserProfile).toHaveBeenCalledWith('user-1');
    expect(text('profileName')).toBe('Maya Chen');
  });

  it('sets userId to "none" and skips the profile fetch when no session exists', async () => {
    await renderProvider();

    expect(text('userId')).toBe('none');
    expect(mockFetchUserProfile).not.toHaveBeenCalled();
  });

  it('keeps the session when the profile fetch fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockRejectedValue(new Error('paused project'));

    await renderProvider();

    expect(text('userId')).toBe('user-1');
    expect(text('profileName')).toBe('no-profile');
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// onAuthStateChange
// ---------------------------------------------------------------------------
describe('auth state changes', () => {
  it('registers a listener and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });

    const { unmount } = await renderProvider();
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('ignores INITIAL_SESSION (already handled by getSession)', async () => {
    await renderProvider();

    await act(async () => { await authListener()('INITIAL_SESSION', SESSION); });

    expect(text('userId')).toBe('none');
    expect(mockFetchUserProfile).not.toHaveBeenCalled();
  });

  it('SIGNED_IN sets the session and loads the profile', async () => {
    mockFetchUserProfile.mockResolvedValue(PROFILE);
    await renderProvider();

    await act(async () => { await authListener()('SIGNED_IN', SESSION); });

    expect(text('userId')).toBe('user-1');
    expect(text('profileName')).toBe('Maya Chen');
  });

  it('SIGNED_OUT clears the session and the profile', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValue(PROFILE);
    await renderProvider();
    expect(text('profileName')).toBe('Maya Chen');

    await act(async () => { await authListener()('SIGNED_OUT', null); });

    expect(text('userId')).toBe('none');
    expect(text('profileName')).toBe('no-profile');
  });
});

// ---------------------------------------------------------------------------
// signIn / signUp / signOut
// ---------------------------------------------------------------------------
describe('signIn', () => {
  it('returns null error on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    await renderProvider();

    let result: unknown;
    await act(async () => { result = await auth.signIn('u@test.com', 'pass'); });

    expect(mockSignIn).toHaveBeenCalledWith('u@test.com', 'pass');
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on failed sign-in', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    await renderProvider();

    let result: unknown;
    await act(async () => { result = await auth.signIn('u@test.com', 'bad'); });

    expect(result).toEqual({ error: 'Invalid credentials' });
  });
});

describe('signUp', () => {
  it('passes the display name through and returns null error on success', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    await renderProvider();

    let result: unknown;
    await act(async () => { result = await auth.signUp('u@test.com', 'pass', 'Maya'); });

    expect(mockSignUp).toHaveBeenCalledWith('u@test.com', 'pass', 'Maya');
    expect(result).toEqual({ error: null });
  });

  it('returns the error message on failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email taken' } });
    await renderProvider();

    let result: unknown;
    await act(async () => { result = await auth.signUp('u@test.com', 'pass', 'Maya'); });

    expect(result).toEqual({ error: 'Email taken' });
  });
});

describe('signOut', () => {
  it('calls the signOut service function', async () => {
    mockSignOut.mockResolvedValue(undefined);
    await renderProvider();

    await act(async () => { await auth.signOut(); });

    expect(mockSignOut).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Profile + onboarding mutations
// ---------------------------------------------------------------------------
describe('updateProfile', () => {
  it('saves for the live session user and replaces the profile', async () => {
    mockLiveGetSession.mockResolvedValue({ data: { session: SESSION } });
    mockUpdateUserProfile.mockResolvedValue({ ...PROFILE, display_name: 'Maya C.' });
    await renderProvider();

    await act(async () => { await auth.updateProfile({ display_name: 'Maya C.' }); });

    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', 'u@test.com', { display_name: 'Maya C.' });
    expect(text('profileName')).toBe('Maya C.');
  });

  it('adopts the live session into state if state was transiently empty', async () => {
    mockLiveGetSession.mockResolvedValue({ data: { session: SESSION } });
    mockUpdateUserProfile.mockResolvedValue(PROFILE);
    await renderProvider();
    expect(text('userId')).toBe('none');

    await act(async () => { await auth.updateProfile({ bio: 'hi' }); });

    expect(text('userId')).toBe('user-1');
  });

  it('rejects with "Not authenticated" when there is no session at all', async () => {
    await renderProvider();

    await expect(auth.updateProfile({ bio: 'hi' })).rejects.toThrow('Not authenticated');
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
});

describe('refreshProfile', () => {
  it('reloads the profile for the current session user', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValueOnce(PROFILE);
    await renderProvider();

    mockFetchUserProfile.mockResolvedValueOnce({ ...PROFILE, display_name: 'Renamed' });
    await act(async () => { await auth.refreshProfile(); });

    expect(text('profileName')).toBe('Renamed');
  });

  it('does nothing when signed out', async () => {
    await renderProvider();

    await act(async () => { await auth.refreshProfile(); });

    expect(mockFetchUserProfile).not.toHaveBeenCalled();
  });
});

describe('onboarding', () => {
  const campus = { id: 'nyu', name: 'NYU' } as any;

  it('updateCampus saves and marks the profile campus-verified', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValue(PROFILE);
    mockLiveGetSession.mockResolvedValue({ data: { session: SESSION } });
    await renderProvider();

    await act(async () => { await auth.updateCampus(campus, 'maya@nyu.edu'); });

    expect(mockUpdateUserCampus).toHaveBeenCalledWith('user-1', campus, 'maya@nyu.edu');
    expect(auth.profile).toMatchObject({
      campus_verified: true, campus_id: 'nyu', campus_name: 'NYU', school_email: 'maya@nyu.edu',
    });
  });

  it('completeOnboarding saves and flags the profile', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchUserProfile.mockResolvedValue(PROFILE);
    mockLiveGetSession.mockResolvedValue({ data: { session: SESSION } });
    await renderProvider();

    await act(async () => { await auth.completeOnboarding(); });

    expect(mockMarkOnboarding).toHaveBeenCalledWith('user-1');
    expect(auth.profile?.onboarding_complete).toBe(true);
  });

  it('completeOnboarding rejects when not authenticated', async () => {
    await renderProvider();

    await expect(auth.completeOnboarding()).rejects.toThrow('Not authenticated');
    expect(mockMarkOnboarding).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useAuth outside provider
// ---------------------------------------------------------------------------
describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress the expected error output from React
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function Naked() {
      useAuth();
      return null;
    }

    expect(() => render(<Naked />)).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });
});
