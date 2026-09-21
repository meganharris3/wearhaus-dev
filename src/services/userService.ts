import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

type DbError = { message?: string; code?: string; details?: string } | null | undefined;

/**
 * True only for a genuinely missing column (a migration that hasn't been applied):
 * Postgres 42703 (undefined_column), PostgREST PGRST204 (column not in the schema
 * cache), or their messages. Deliberately NOT a substring match on words like
 * "column" or "username" — a unique-violation on users_username_key also
 * contains "username", and mistaking it for a missing column made saves
 * silently drop the username.
 */
function isMissingColumnError(err: DbError): boolean {
  if (!err) return false;
  if (err.code === '42703' || err.code === 'PGRST204') return true;
  return /column .*does not exist|could not find the .* column/i.test(err.message ?? '');
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // Try full column list (requires all migrations applied)
  let { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, university, bio, items_listed, rentals_completed, rating, campus_verified, campus_id, campus_name, school_email, interests, onboarding_complete')
    .eq('id', userId)
    .single();

  // Fall back to base columns if any migration hasn't been applied yet
  if (isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating')
      .eq('id', userId)
      .single());
  }

  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  _email: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'avatar_url' | 'university'>>,
): Promise<UserProfile> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('[userService] update error:', JSON.stringify(error));

    // users.username is UNIQUE. One UPDATE statement is atomic, so nothing was saved.
    if (error.code === '23505' && (error.message ?? '').includes('username')) {
      throw new Error('That username is already taken. Try a different one.');
    }
    // Don't quietly retry without the username: that saved a partial profile and reported success.
    if (isMissingColumnError(error)) {
      throw new Error(
        'Your database is missing a profile column (' + (error.message ?? 'unknown') + '). ' +
        'Apply supabase/migrations/003_add_username.sql, then try again.',
      );
    }
    throw new Error(`${error.message} (code: ${error.code}${error.details ? ', details: ' + error.details : ''})`);
  }

  // Read the row back to return fresh state — and to confirm the write really landed. An UPDATE that
  // matches no rows (row missing, RLS filtering it out, no session) returns NO error, so without this
  // check a failed save looks like success and the old values overwrite the form.
  const saved = await fetchUserProfile(userId);
  if (!saved) throw new Error('Profile saved but could not be read back. Check your Supabase SELECT policy on the users table.');

  const notSaved = (Object.keys(updates) as (keyof typeof updates)[]).filter(
    (key) => updates[key] !== undefined && key in saved && saved[key] !== updates[key],
  );
  if (notSaved.length > 0) {
    throw new Error(
      `Your changes weren't saved (${notSaved.join(', ')} didn't change in the database). ` +
      'Try signing out and back in.',
    );
  }
  return saved;
}
