/**
 * Unit tests for src/services/authService.ts
 *
 * All Supabase SDK calls are mocked so no network is required.
 */

// See hausService.test.ts for why the mock factory can't reference
// externally-declared `const mockX = jest.fn()` variables (babel-jest
// hoisting order bug) — create them inline, then read them back via the
// mocked import.
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp:             jest.fn(),
      signInWithPassword: jest.fn(),
      signOut:            jest.fn(),
      getSession:         jest.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabase';
const mockSignUp             = supabase.auth.signUp as jest.Mock;
const mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
const mockSignOut            = supabase.auth.signOut as jest.Mock;
const mockGetSession         = supabase.auth.getSession as jest.Mock;

import { signUp, signIn, signOut, getSession } from '../../services/authService';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------
describe('signUp', () => {
  it('returns null error on success', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const result = await signUp('user@test.com', 'secret', 'Test User');

    expect(mockSignUp).toHaveBeenCalledWith({
      email:    'user@test.com',
      password: 'secret',
      options:  { data: { display_name: 'Test User' } },
    });
    expect(result.error).toBeNull();
  });

  it('returns error message when Supabase returns an error', async () => {
    mockSignUp.mockResolvedValueOnce({ error: { message: 'Email already registered' } });

    const result = await signUp('existing@test.com', 'secret', 'Test User');

    expect(result.error).toEqual({ message: 'Email already registered' });
  });

  it('passes displayName in options.data', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    await signUp('a@b.com', 'pw', 'Jordan');

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { display_name: 'Jordan' } } })
    );
  });
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------
describe('signIn', () => {
  it('returns null error on successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    const result = await signIn('user@test.com', 'secret');

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email:    'user@test.com',
      password: 'secret',
    });
    expect(result.error).toBeNull();
  });

  it('returns error message on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    const result = await signIn('user@test.com', 'wrong');

    expect(result.error).toEqual({ message: 'Invalid login credentials' });
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------
describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    mockSignOut.mockResolvedValueOnce({});

    await signOut();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('resolves without throwing', async () => {
    mockSignOut.mockResolvedValueOnce({});
    await expect(signOut()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------
describe('getSession', () => {
  it('returns the session when one exists', async () => {
    const fakeSession = { user: { id: 'user-1' }, access_token: 'tok' };
    mockGetSession.mockResolvedValueOnce({ data: { session: fakeSession } });

    const session = await getSession();

    expect(session).toBe(fakeSession);
  });

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const session = await getSession();

    expect(session).toBeNull();
  });
});
