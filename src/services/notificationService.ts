import { supabase } from '../lib/supabase';

export type NotificationKind =
  | 'borrow_request'
  | 'borrow_accepted'
  | 'friend_request'
  | 'friend_accepted'
  | 'haus_invite'
  | 'message'
  | 'system';

export interface NotificationRow {
  id: string;
  type: NotificationKind;
  payload: Record<string, unknown>;
  read: boolean;
  /** An actionable request (friend/borrow) that has already been answered. Set server-side. */
  resolved: boolean;
  createdAt: string;
}

export async function fetchNotifications(userId: string, opts: { limit?: number } = {}): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read, resolved, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 30);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type,
    payload: row.payload ?? {},
    read: row.read,
    resolved: row.resolved,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw new Error(error.message);
}
