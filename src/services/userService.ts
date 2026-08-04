import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

function isMissingColumnError(msg: string | undefined): boolean {
  if (!msg) return false;
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('column') ||
    msg.includes('username') ||
    msg.includes('campus')
  );
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // Try full column list (requires all migrations applied)
  let { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, university, bio, items_listed, rentals_completed, rating, campus_verified, campus_id, campus_name, school_email, interests, onboarding_complete')
    .eq('id', userId)
    .single();

  // Fall back to base columns if any migration hasn't been applied yet
  if (isMissingColumnError(error?.message)) {
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
  let { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) console.error('[userService] update error:', JSON.stringify(error));

  // If a column in the updates doesn't exist yet, retry with only the guaranteed base columns
  if (isMissingColumnError(error?.message)) {
    const { username, ...baseUpdates } = updates;
    ({ error } = await supabase
      .from('users')
      .update(baseUpdates)
      .eq('id', userId));
    if (error) console.error('[userService] fallback update error:', JSON.stringify(error));
  }

  if (error) throw new Error(`${error.message} (code: ${error.code}${error.details ? ', details: ' + error.details : ''})`);

  // Read back the saved row to (a) confirm the write landed and (b) return fresh state.
  // Doing a separate SELECT avoids false-empty results that happen when the table has an
  // UPDATE policy but a restricted SELECT policy on the chained .select('id').
  const saved = await fetchUserProfile(userId);
  if (!saved) throw new Error('Profile saved but could not be read back. Check your Supabase SELECT policy on the users table.');
  return saved;
}
