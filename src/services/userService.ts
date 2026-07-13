import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  let { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url, university, bio, items_listed, rentals_completed, rating')
    .eq('id', userId)
    .single();

  // Fall back if the `username` column doesn't exist yet (migration not applied)
  if (error?.message?.includes('username')) {
    ({ data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating')
      .eq('id', userId)
      .single());
  }

  if (error) throw new Error(error.message);
  return data as UserProfile;
}

// email is required so upsert can INSERT a fresh row if one doesn't exist yet
// (e.g. if the signup trigger failed to create the public.users row)
export async function updateUserProfile(
  userId: string,
  email: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'avatar_url' | 'university'>>,
): Promise<void> {
  const payload = {
    id: userId,
    email,
    display_name: updates.display_name ?? 'New User',
    ...updates,
  };

  console.log('[updateUserProfile] payload:', JSON.stringify(payload));

  let { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select('id, display_name, bio, university, avatar_url');

  console.log('[updateUserProfile] result:', JSON.stringify(data), 'error:', JSON.stringify(error));

  // Fall back without username if the column doesn't exist yet
  if (error?.message?.includes('username')) {
    const { username, ...payloadWithout } = payload;
    ({ data, error } = await supabase
      .from('users')
      .upsert(payloadWithout, { onConflict: 'id' })
      .select('id, display_name, bio, university, avatar_url'));
    console.log('[updateUserProfile] fallback result:', JSON.stringify(data), 'error:', JSON.stringify(error));
  }

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`Profile save returned 0 rows — RLS may be blocking the write (userId: ${userId})`);
}
