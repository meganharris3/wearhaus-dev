import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export interface DevCredentials {
  email: string;
  password: string;
}

type DevEnv = Partial<Record<'EXPO_PUBLIC_DEV_EMAIL' | 'EXPO_PUBLIC_DEV_PASSWORD', string>>;

function readDevEnv(): DevEnv {
  // Dev builds only, so a password can never be baked into a production bundle. These must stay
  // static `process.env.EXPO_PUBLIC_*` member accesses — that is the only form Expo inlines.
  if (!__DEV__) return {};
  return {
    EXPO_PUBLIC_DEV_EMAIL: process.env.EXPO_PUBLIC_DEV_EMAIL,
    EXPO_PUBLIC_DEV_PASSWORD: process.env.EXPO_PUBLIC_DEV_PASSWORD,
  };
}

/** Credentials for the dev auto-sign-in, from EXPO_PUBLIC_DEV_EMAIL / EXPO_PUBLIC_DEV_PASSWORD, or null. */
export function getDevCredentials(env: DevEnv = readDevEnv()): DevCredentials | null {
  const email = env.EXPO_PUBLIC_DEV_EMAIL?.trim();
  const password = env.EXPO_PUBLIC_DEV_PASSWORD;
  return email && password ? { email, password } : null;
}

/**
 * While the login screens are bypassed in development, there is no session — so nothing that
 * needs a signed-in user (profile edits, boards, messages, ...) can work. This signs in behind
 * the scenes with a dev account so the bypass still yields a real session.
 *
 * Tries once per app load: a wrong password must not loop, and an existing session (restored
 * from storage) means there is nothing to do.
 */
export function useDevAutoSignIn({
  enabled,
  loading,
  hasSession,
  signIn,
  credentials = getDevCredentials(),
}: {
  enabled: boolean;
  loading: boolean;
  hasSession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  credentials?: DevCredentials | null;
}): void {
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || loading || hasSession || !credentials || attempted.current) return;
    attempted.current = true;

    signIn(credentials.email, credentials.password).then(({ error }) => {
      if (error) {
        Alert.alert(
          'Dev auto sign-in failed',
          `${error}\n\nCheck EXPO_PUBLIC_DEV_EMAIL and EXPO_PUBLIC_DEV_PASSWORD in .env.local, then restart the dev server.`,
        );
      }
    });
  }, [enabled, loading, hasSession, credentials, signIn]);
}
