import { supabase } from '../lib/supabase';

export interface AuthError {
  message: string;
}

/**
 * @supabase/auth-js's handleError() treats any 5xx response (including a genuine
 * "Error sending confirmation email" failure) as a retryable infra error and discards the
 * parsed response body — it builds the message from JSON.stringify(rawResponse) instead,
 * which serializes to the literal string "{}" since a fetch Response has no enumerable own
 * properties. Without this, a real backend failure renders as a bare "{}" in the UI.
 */
export function friendlyAuthErrorMessage(message: string | undefined | null): string {
  if (!message || message === '{}') {
    return 'Something went wrong on our end. Please try again in a moment.';
  }
  return message;
}

export interface SignUpResult {
  error: AuthError | null;
  /**
   * True when the account was created but needs email confirmation before it can sign in
   * (Supabase's "Confirm email" project setting is on, so signUp() returns a user with no
   * session). False whenever there's an error, or when a session came back immediately.
   */
  needsEmailConfirmation: boolean;
  /**
   * True when signUp() "succeeded" (no error) for an email that already has a confirmed
   * account. With both Confirm email and Confirm phone on, Supabase deliberately returns an
   * obfuscated user (identities: []) instead of an error here, to avoid letting signUp reveal
   * which emails are registered. See supabase.auth.signUp()'s own docs for this exact behaviour.
   */
  mayAlreadyHaveAccount: boolean;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return {
    error: error ? { message: friendlyAuthErrorMessage(error.message) } : null,
    needsEmailConfirmation: !error && !data?.session,
    mayAlreadyHaveAccount: !error && Array.isArray(data?.user?.identities) && data.user!.identities!.length === 0,
  };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? { message: friendlyAuthErrorMessage(error.message) } : null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
