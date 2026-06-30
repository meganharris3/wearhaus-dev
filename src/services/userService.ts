import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'avatar_url'>>,
): Promise<void> {
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw new Error(error.message);
}
