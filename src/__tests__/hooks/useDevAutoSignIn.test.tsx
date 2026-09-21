import React from 'react';
import { Alert } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { useDevAutoSignIn, getDevCredentials } from '../../hooks/useDevAutoSignIn';

type Props = Parameters<typeof useDevAutoSignIn>[0];

function Harness(props: Props) {
  useDevAutoSignIn(props);
  return null;
}

const CREDS = { email: 'dev@wearhaus.test', password: 'hunter2' };

function setup(overrides: Partial<Props> = {}) {
  const signIn = jest.fn().mockResolvedValue({ error: null });
  const props: Props = {
    enabled: true,
    loading: false,
    hasSession: false,
    signIn,
    credentials: CREDS,
    ...overrides,
  };
  const utils = render(<Harness {...props} />);
  return { signIn, props, ...utils };
}

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

let alertSpy: jest.SpyInstance;
beforeEach(() => { alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => alertSpy.mockRestore());

describe('getDevCredentials', () => {
  it('returns the email and password when both are set', () => {
    expect(getDevCredentials({ EXPO_PUBLIC_DEV_EMAIL: 'a@b.co', EXPO_PUBLIC_DEV_PASSWORD: 'pw' }))
      .toEqual({ email: 'a@b.co', password: 'pw' });
  });

  it('trims the email but leaves the password untouched', () => {
    expect(getDevCredentials({ EXPO_PUBLIC_DEV_EMAIL: '  a@b.co ', EXPO_PUBLIC_DEV_PASSWORD: ' pw ' }))
      .toEqual({ email: 'a@b.co', password: ' pw ' });
  });

  it.each([
    [{ EXPO_PUBLIC_DEV_EMAIL: 'a@b.co' }],
    [{ EXPO_PUBLIC_DEV_PASSWORD: 'pw' }],
    [{ EXPO_PUBLIC_DEV_EMAIL: '   ', EXPO_PUBLIC_DEV_PASSWORD: 'pw' }],
    [{ EXPO_PUBLIC_DEV_EMAIL: 'a@b.co', EXPO_PUBLIC_DEV_PASSWORD: '' }],
    [{}],
  ])('returns null unless both are provided (%j)', (env) => {
    expect(getDevCredentials(env)).toBeNull();
  });
});

describe('useDevAutoSignIn', () => {
  it('signs in with the dev credentials when enabled, loaded and signed out', async () => {
    const { signIn } = setup();
    await flush();
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith('dev@wearhaus.test', 'hunter2');
  });

  it.each([
    ['the bypass is off',         { enabled: false }],
    ['auth is still loading',     { loading: true }],
    ['there is already a session', { hasSession: true }],
    ['no credentials are set',    { credentials: null }],
  ])('does nothing when %s', async (_label, override) => {
    const { signIn } = setup(override as Partial<Props>);
    await flush();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('waits for loading to finish, then signs in once', async () => {
    const { signIn, props, rerender } = setup({ loading: true });
    await flush();
    expect(signIn).not.toHaveBeenCalled();

    rerender(<Harness {...props} loading={false} />);
    await flush();
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('does not sign in again on later renders', async () => {
    const { signIn, props, rerender } = setup();
    await flush();

    rerender(<Harness {...props} />);
    rerender(<Harness {...props} loading={false} />);
    await flush();

    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('does not retry (and so cannot loop) after a failed sign-in', async () => {
    const signIn = jest.fn().mockResolvedValue({ error: 'Invalid login credentials' });
    const { props, rerender } = setup({ signIn });
    await flush();

    rerender(<Harness {...props} />);
    await flush();

    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('tells you why when the sign-in fails', async () => {
    setup({ signIn: jest.fn().mockResolvedValue({ error: 'Invalid login credentials' }) });
    await flush();

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message] = alertSpy.mock.calls[0];
    expect(title).toMatch(/auto sign-in failed/i);
    expect(message).toContain('Invalid login credentials');
    expect(message).toContain('.env.local');
  });

  it('is quiet when the sign-in succeeds', async () => {
    setup();
    await flush();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
