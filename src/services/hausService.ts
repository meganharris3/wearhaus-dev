import { supabase } from '../lib/supabase';
import type { Haus } from '../types';

export async function fetchMyHauses(userId: string): Promise<Haus[]> {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select(`haus:hauses(id, name, description, cover_url, member_count, piece_count)`)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data?.map((r: any) => r.haus).filter(Boolean) ?? []) as Haus[];
}

export async function fetchAllHauses(): Promise<Haus[]> {
  const { data, error } = await supabase
    .from('hauses')
    .select('id, name, description, cover_url, member_count, piece_count')
    .order('member_count', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Haus[];
}

export async function createHaus(
  payload: Pick<Haus, 'name' | 'description'>,
  userId: string,
): Promise<Haus> {
  const { data, error } = await supabase
    .from('hauses')
    .insert({ name: payload.name, description: payload.description ?? null, member_count: 1, piece_count: 0 })
    .select('id, name, description, cover_url, member_count, piece_count')
    .single();
  if (error) throw new Error(error.message);

  // Add creator as admin member
  await supabase
    .from('haus_memberships')
    .insert({ haus_id: data.id, user_id: userId, role: 'admin', joined_at: new Date().toISOString() });

  return data as Haus;
}

export async function fetchHausMembers(hausId: string) {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select(`role, joined_at, user:users(id, display_name, avatar_url)`)
    .eq('haus_id', hausId)
    .order('joined_at', { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);
  return data ?? [];
}
