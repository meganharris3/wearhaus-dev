import { supabase } from '../lib/supabase';
import { pageRange, type PageOpts } from './pagination';
import type { Haus } from '../types';

export async function fetchMyHauses(userId: string): Promise<Haus[]> {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select(`haus:hauses(id, name, description, cover_url, member_count, piece_count)`)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data?.map((r: any) => r.haus).filter(Boolean) ?? []) as Haus[];
}

/** The system-owned campus closet haus for a given campus, or null if it hasn't been created yet
 *  (joinCampusCloset in campusService.ts creates it lazily, on a user's first campus join). */
export async function fetchCampusHaus(campusId: string): Promise<Haus | null> {
  const { data, error } = await supabase
    .from('hauses')
    .select('id, name, description, cover_url, member_count, piece_count')
    .eq('campus_id', campusId)
    .eq('haus_type', 'campus')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Haus | null) ?? null;
}

export async function fetchAllHauses(opts: PageOpts = {}): Promise<Haus[]> {
  const [from, to] = pageRange(opts, 50);
  const { data, error } = await supabase
    .from('hauses')
    .select('id, name, description, cover_url, member_count, piece_count')
    .order('member_count', { ascending: false })
    .order('id')
    .range(from, to);
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

/**
 * Invites each of inviteeIds to hausId, as pending haus_invitations rows — not a direct
 * membership insert. haus_memberships only allows a user to insert their own row
 * (002_security_fixes.sql), so the invitee has to accept it themselves (acceptHausInvite);
 * this just creates the pending invites a trg_notify_haus_invite turns into notifications.
 * Silently skips anyone already invited/a member (the table's unique(haus_id, invitee_id)
 * constraint) rather than failing the whole batch over one duplicate.
 */
export async function inviteMembersToHaus(
  hausId: string,
  inviterId: string,
  inviteeIds: string[],
): Promise<void> {
  if (inviteeIds.length === 0) return;
  const { error } = await supabase
    .from('haus_invitations')
    .upsert(
      inviteeIds.map((inviteeId) => ({ haus_id: hausId, inviter_id: inviterId, invitee_id: inviteeId })),
      { onConflict: 'haus_id,invitee_id', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function acceptHausInvite(invitationId: string, hausId: string, userId: string): Promise<void> {
  const { error: inviteError } = await supabase
    .from('haus_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
    .eq('invitee_id', userId);
  if (inviteError) throw new Error(inviteError.message);

  const { error: memberError } = await supabase
    .from('haus_memberships')
    .insert({ haus_id: hausId, user_id: userId, role: 'member' });
  if (memberError) throw new Error(memberError.message);
}

export async function declineHausInvite(invitationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('haus_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('invitee_id', userId);
  if (error) throw new Error(error.message);
}

/** The code in this haus's /join/<code> invite link (019_haus_invite_links.sql), or null if
 *  it has none. Only members can read it. */
export async function fetchHausInviteCode(hausId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('haus_invite_links')
    .select('code')
    .eq('haus_id', hausId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.code ?? null;
}

export type HausInvitePreview = Haus & { is_member: boolean };

/** The haus behind an invite code, for the join screen — null if the code doesn't exist. */
export async function fetchHausInvitePreview(code: string): Promise<HausInvitePreview | null> {
  const { data, error } = await supabase.rpc('haus_invite_preview', { p_code: code });
  if (error) throw new Error(error.message);
  return ((data as HausInvitePreview[] | null) ?? [])[0] ?? null;
}

/** Joins the signed-in user to the haus behind an invite code; returns the haus id. */
export async function joinHausByInviteCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_haus_by_invite_code', { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
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

export interface HausMemberRow {
  userId: string;
  role: 'member' | 'admin';
  joinedAt: string;
  displayName: string;
  avatarUrl?: string;
}

export async function fetchAllHausMembers(hausId: string): Promise<HausMemberRow[]> {
  const { data, error } = await supabase
    .from('haus_memberships')
    .select(`user_id, role, joined_at, user:users(id, display_name, avatar_url)`)
    .eq('haus_id', hausId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    userId:      row.user_id,
    role:        row.role,
    joinedAt:    row.joined_at,
    displayName: row.user?.display_name ?? 'Member',
    avatarUrl:   row.user?.avatar_url ?? undefined,
  }));
}
