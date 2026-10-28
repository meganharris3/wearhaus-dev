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
  it('returns null error and no confirmation flags when a session is created immediately (confirm email OFF)', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: { access_token: 'tok' } },
      error: null,
    });

    const result = await signUp('user@test.com', 'secret', 'Test User');

    expect(mockSignUp).toHaveBeenCalledWith({
      email:    'user@test.com',
      password: 'secret',
      options:  { data: { display_name: 'Test User' } },
    });
    expect(result).toEqual({ error: null, needsEmailConfirmation: false, mayAlreadyHaveAccount: false });
  });

  it('flags needsEmailConfirmation when signUp succeeds with a user but no session (confirm email ON)', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: null },
      error: null,
    });

    const result = await signUp('user@test.com', 'secret', 'Test User');

    expect(result).toEqual({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: false });
  });

  it('flags mayAlreadyHaveAccount when Supabase returns an obfuscated user (empty identities) for an existing confirmed account', async () => {
    // Supabase's own anti-enumeration behaviour: signUp() "succeeds" (no error) for an email
    // that already has a confirmed account, returning a fake user with identities: [].
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', identities: [] }, session: null },
      error: null,
    });

    const result = await signUp('existing@test.com', 'secret', 'Test User');

    expect(result).toEqual({ error: null, needsEmailConfirmation: true, mayAlreadyHaveAccount: true });
  });

  it('does not flag mayAlreadyHaveAccount when identities is simply absent from the response', async () => {
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'u1' }, session: null }, error: null });

    const result = await signUp('user@test.com', 'secret', 'Test User');

    expect(result.mayAlreadyHaveAccount).toBe(false);
  });

  it('returns error message when Supabase returns an error, with both flags false', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Email already registered' },
    });

    const result = await signUp('existing@test.com', 'secret', 'Test User');

    expect(result).toEqual({
      error: { message: 'Email already registered' },
      needsEmailConfirmation: false,
      mayAlreadyHaveAccount: false,
    });
  });

  it('replaces the "{}" message @supabase/auth-js produces for a collapsed 5xx error with something readable', async () => {
    // auth-js's handleError() treats any 5xx (including a real "Error sending confirmation
    // email" failure) as a retryable infra error and discards the parsed response body,
    // building the message from JSON.stringify(rawResponse) instead — which serializes to the
    // literal string "{}" since Response has no enumerable own properties. Confirmed against
    // the real SDK: a live signUp() hitting a 500 came back with error.message === '{}'.
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: '{}' },
    });

    const result = await signUp('user@test.com', 'secret', 'Test User');

    expect(result.error?.message).not.toBe('{}');
    expect(result.error?.message).toBeTruthy();
  });

  it('passes displayName in options.data', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: { access_token: 'tok' } },
      error: null,
    });

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

  it('replaces a collapsed "{}" 5xx message with something readable', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: '{}' } });

    const result = await signIn('user@test.com', 'secret');

    expect(result.error?.message).not.toBe('{}');
    expect(result.error?.message).toBeTruthy();
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
