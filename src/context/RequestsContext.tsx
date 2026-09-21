import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from '../services/notificationService';
import { acceptFriendRequest, declineFriendRequest } from '../services/friendService';
import { respondToBorrowRequest } from '../services/messageService';
import { formatMessageTime } from '../utils/dateUtils';

export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type NotificationType =
  | 'borrow_request'
  | 'borrow_accepted'
  | 'friend_request'
  | 'friend_accepted'
  | 'return_reminder'
  | 'review_prompt';

export interface Request {
  id: string;
  type: NotificationType;
  status: RequestStatus;
  read: boolean;
  borrowerName: string;
  itemName: string;
  days?: number;
  dateRange?: string | null;
  dueBack?: string;
  createdAt: string;
  direction?: 'incoming' | 'outgoing';
  ownerName?: string;
  total?: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Maps a notification row to the display shape the screen uses. Returns null for
 * rows with no UI (haus_invite / message / system) and for requests that have
 * already been answered, from here or from the chat thread.
 */
function toRequest(row: NotificationRow): Request | null {
  const base = { id: row.id, read: row.read, createdAt: formatMessageTime(row.createdAt) };
  const p = row.payload;

  switch (row.type) {
    case 'friend_request':
      if (row.resolved) return null;
      return { ...base, type: 'friend_request', status: 'pending', borrowerName: str(p.from_name), itemName: '', dateRange: null };
    case 'friend_accepted':
      return { ...base, type: 'friend_accepted', status: 'accepted', borrowerName: str(p.from_name), itemName: '', dateRange: null };
    case 'borrow_request':
      if (row.resolved) return null;
      return {
        ...base, type: 'borrow_request', status: 'pending',
        borrowerName: str(p.borrower_name), itemName: str(p.item_name),
        days: typeof p.days === 'number' ? p.days : undefined,
        dateRange: str(p.date_range) || null, direction: 'incoming',
      };
    case 'borrow_accepted':
      return {
        ...base, type: 'borrow_accepted', status: 'accepted',
        borrowerName: str(p.from_name), itemName: str(p.item_name),
        dueBack: str(p.due_back) || undefined, dateRange: null, direction: 'outgoing',
      };
    default:
      return null;
  }
}

interface RequestsContextValue {
  requests: Request[];
  pendingCount: number;
  isLoading: boolean;
  refreshRequests: () => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const RequestsContext = createContext<RequestsContextValue | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [isLoading, setLoading] = useState(true);

  const requests = useMemo(
    () => rows.map(toRequest).filter((r): r is Request => r !== null),
    [rows],
  );

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );

  const refreshRequests = useCallback(async () => {
    if (!userId) { setRows([]); return; }
    try {
      setRows(await fetchNotifications(userId));
    } catch (e) {
      console.warn('Failed to load notifications', e);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refreshRequests().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshRequests]);

  const resolveLocally = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: true, resolved: true } : r)));
  }, []);

  const respond = useCallback(async (id: string, status: 'accepted' | 'declined') => {
    if (!userId) throw new Error('Not authenticated');
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    if (row.type === 'friend_request') {
      const friendshipId = str(row.payload.friendship_id);
      if (status === 'accepted') await acceptFriendRequest(friendshipId, userId);
      else await declineFriendRequest(friendshipId, userId);
    } else if (row.type === 'borrow_request') {
      const firstName = (profile?.display_name ?? 'Someone').split(' ')[0];
      await respondToBorrowRequest(
        str(row.payload.message_id), str(row.payload.thread_id), userId, status, firstName,
      );
    } else {
      return;
    }

    resolveLocally(id);
    // The server-side triggers already mark the notification resolved; this only clears the unread dot.
    markNotificationRead(id).catch(() => {});
  }, [userId, profile?.display_name, rows, resolveLocally]);

  const acceptRequest = useCallback((id: string) => respond(id, 'accepted'), [respond]);
  const declineRequest = useCallback((id: string) => respond(id, 'declined'), [respond]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setRows((prev) => prev.map((r) => (r.read ? r : { ...r, read: true })));
  }, [userId]);

  return (
    <RequestsContext.Provider
      value={{ requests, pendingCount, isLoading, refreshRequests, acceptRequest, declineRequest, markAllRead }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider');
  return ctx;
}
