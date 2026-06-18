/**
 * Tests for AuthContext (AuthProvider + useAuth)
 *
 * Covers:
 * - initial loading state is true, then resolves to false
 * - session and user are populated when getSession returns a session
 * - signIn success propagates null error
 * - signIn failure propagates error message
 * - signOut clears session (delegates to authService)
 * - profile is loaded alongside the session
 * - useAuth throws when used outside AuthProvider
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// ---------------------------------------------------------------------------
// Service mocks — set up before importing AuthProvider
// ---------------------------------------------------------------------------

const mockGetSession       = jest.fn();
const mockSignIn           = jest.fn();
const mockSignUp           = jest.fn();
const mockSignOut          = jest.fn();
const mockFetchUserProfile = jest.fn();
const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

jest.mock('../../services/authService', () => ({
  getSession: mockGetSession,
  signIn:     mockSignIn,
  signUp:     mockSignUp,
  signOut:    mockSignOut,
}));

jest.mock('../../services/userService', () => ({
  fetchUserProfile: mockFetchUserProfile,
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

import { AuthProvider, useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Helper component that reads from context and renders state as text
// ---------------------------------------------------------------------------
function TestConsumer() {
  const { loading, session, user, profile, signIn, signOut } = useAuth();
  return (
    <>
      <Text testID="loading">{loading ? 'loading' : 'ready'}</Text>
      <Text testID="userId">{user?.id ?? 'none'}</Text>
      <Text testID="profileName">{profile?.display_name ?? 'no-profile'}</Text>
    </>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no existing session
  mockGetSession.mockResolvedValue(null);
  mockFetchUserProfile.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
describe('loading state', () => {
  it('starts with loading=true and transitions to ready after getSession resolves', async () => {
    mockGetSession.mockResolvedValue(null);

    renderWithProvider();

    // Immediately after render, loading should be true (async not yet resolved)
    expect(screen.getByTestId('loading').props.children).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('ready');
    });
  });

  it('becomes ready even when getSession returns null', async () => {
    mockGetSession.mockResolvedValue(null);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').props.children).toBe('ready');
    });
  });
});

// ---------------------------------------------------------------------------
// Session + profile loading
// ---------------------------------------------------------------------------
describe('session initialisation', () => {
  it('populates user when getSession returns a session', async () => {
    const fakeSession = { user: { id: 'user-1', email: 'u@test.com' }, access_token: 'tok' };
    mockGetSession.mockResolvedValue(fakeSession);
    mockFetchUserProfile.mockResolvedValue({
      id: 'user-1',
      display_name: 'Maya Chen',
      items_listed: 0,
      rentals_completed: 0,
      rating: 0,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('userId').props.children).toBe('user-1');
    });
  });

  it('loads the profile when a session exists', async () => {
    const fakeSession = { user: { id: 'user-1' }, access_token: 'tok' };
    mockGetSession.mockResolvedValue(fakeSession);
    mockFetchUserProfile.mockResolvedValue({
      id: 'user-1',
      display_name: 'Maya Chen',
      items_listed: 1,
      rentals_completed: 2,
      rating: 4.9,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('profileName').props.children).toBe('Maya Chen');
    });
  });

  it('sets userId to "none" when no session exists', async () => {
    mockGetSession.mockResolvedValue(null);

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('userId').props.children).toBe('none');
    });
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------
describe('signIn', () => {
  function SignInConsumer() {
    const { signIn } = useAuth();
    return (
      <Text
        testID="trigger"
        onPress={() => signIn('u@test.com', 'pass').then((r) => {
          // store result in testID for assertion
          (global as any).__signInResult = r;
        })}
      >
        sign-in
      </Text>
    );
  }

  it('returns null error on successful sign-in', async () => {
    mockGetSession.mockResolvedValue(null);
    mockSignIn.mockResolvedValue({ error: null });

    render(
      <AuthProvider>
        <SignInConsumer />
      </AuthProvider>
    );

    await waitFor(() => screen.getByTestId('trigger'));

    await act(async () => {
      screen.getByTestId('trigger').props.onPress();
    });

    await waitFor(() => {
      expect((global as any).__signInResult).toEqual({ error: null });
    });
  });

  it('returns error message on failed sign-in', async () => {
    mockGetSession.mockResolvedValue(null);
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });

    render(
      <AuthProvider>
        <SignInConsumer />
      </AuthProvider>
    );

    await waitFor(() => screen.getByTestId('trigger'));

    await act(async () => {
      screen.getByTestId('trigger').props.onPress();
    });

    await waitFor(() => {
      expect((global as any).__signInResult).toEqual({ error: 'Invalid credentials' });
    });
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
describe('signOut', () => {
  it('calls the signOut service function', async () => {
    mockGetSession.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(undefined);

    function SignOutConsumer() {
      const { signOut } = useAuth();
      return <Text testID="so" onPress={() => signOut()}>sign-out</Text>;
    }

    render(
      <AuthProvider>
        <SignOutConsumer />
      </AuthProvider>
    );

    await waitFor(() => screen.getByTestId('so'));

    await act(async () => {
      screen.getByTestId('so').props.onPress();
    });

    expect(mockSignOut).toHaveBeenCalled();
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
