import { supabase } from '../lib/supabase';

export interface AuthError {
  message: string;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return { error: error ? { message: error.message } : null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? { message: error.message } : null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
