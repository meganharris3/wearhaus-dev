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
    .insert({ name: payload.name, description: payload.description ?? null })
    .select('id, name, description, cover_url, member_count, piece_count')
    .single();
  if (error) throw new Error(error.message);

  // Add creator as admin member — the trg_haus_member_count trigger
  // increments member_count from its column default (0) to 1 here.
  const { error: memberError } = await supabase
    .from('haus_memberships')
    .insert({ haus_id: data.id, user_id: userId, role: 'admin', joined_at: new Date().toISOString() });
  if (memberError) throw new Error(memberError.message);

  return data as Haus;
}

export async function updateHaus(
  hausId: string,
  updates: Partial<Pick<Haus, 'name' | 'description'>>,
): Promise<void> {
  const { error } = await supabase.from('hauses').update(updates).eq('id', hausId);
  if (error) throw new Error(error.message);
}

export async function leaveHaus(hausId: string, userId: string): Promise<void> {
  // trg_haus_member_count decrements member_count automatically on delete.
  const { error } = await supabase
    .from('haus_memberships')
    .delete()
    .eq('haus_id', hausId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchMembershipRole(hausId: string, userId: string): Promise<'member' | 'admin' | null> {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select('role')
    .eq('haus_id', hausId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role ?? null;
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
