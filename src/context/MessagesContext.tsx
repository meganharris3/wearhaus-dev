import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchThreads,
  fetchThread,
  fetchMessages,
  findOrCreateThread,
  sendMessage as sendMessageRemote,
  updateMessagePayload,
  updateThreadStatus,
  markThreadRead,
} from '../services/messageService';
import type {
  Thread,
  ChatMessage,
  Item,
  MessageType,
  ThreadParticipant,
  BorrowRequestPayload,
  CounterOfferPayload,
} from '../types';

// ─── Context Shape ─────────────────────────────────────────────────────────────

/** What a caller supplies; the sender and timestamp are assigned here / by the DB. */
export interface OutgoingMessage {
  type: MessageType;
  text?: string;
  payload?: BorrowRequestPayload | CounterOfferPayload;
}

interface MessagesContextValue {
  threads: Thread[];
  unreadCount: number;
  isLoading: boolean;
  refreshThreads: () => Promise<void>;
  getThread: (id: string) => Thread | undefined;
  findThreadByUser: (userId: string) => Thread | undefined;
  /** Loads (or reloads) the latest messages for a thread into the cache. */
  openThread: (threadId: string) => Promise<void>;
  createThread: (params: {
    item: Item;
    otherUser: ThreadParticipant;
    payload: BorrowRequestPayload;
  }) => Promise<Thread>;
  createDirectThread: (otherUser: ThreadParticipant, item?: Item) => Promise<Thread>;
  markRead: (threadId: string) => void;
  sendMessage: (threadId: string, msg: OutgoingMessage) => Promise<void>;
  updateRequestStatus: (
    threadId: string,
    messageId: string,
    status: BorrowRequestPayload['status'],
  ) => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

function previewFor(msg: OutgoingMessage): string {
  if (msg.type === 'borrow_request') return 'Sent a borrow request';
  if (msg.type === 'counter_offer') return 'Sent an offer';
  return msg.text ?? '';
}

function sortByRecent(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => b.lastMessageTime.localeCompare(a.lastMessageTime));
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setLoading] = useState(true);

  const unreadCount = threads.filter((t) => t.unread).length;

  const refreshThreads = useCallback(async () => {
    if (!userId) { setThreads([]); return; }
    try {
      const remote = await fetchThreads(userId);
      // Keep any messages already loaded for a thread the refresh returned.
      setThreads((prev) => remote.map((t) => ({
        ...t,
        messages: prev.find((p) => p.id === t.id)?.messages ?? [],
      })));
    } catch (e) {
      console.warn('Failed to load threads', e);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refreshThreads().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshThreads]);

  function getThread(id: string): Thread | undefined {
    return threads.find((t) => t.id === id);
  }

  function findThreadByUser(otherUserId: string): Thread | undefined {
    return threads.find((t) => t.otherUser.id === otherUserId);
  }

  /** Insert-or-replace a thread in the cache, preserving already-loaded messages. */
  function upsertThread(incoming: Thread, messages?: ChatMessage[]) {
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === incoming.id);
      const merged: Thread = { ...incoming, messages: messages ?? existing?.messages ?? [] };
      return sortByRecent(existing ? prev.map((t) => (t.id === merged.id ? merged : t)) : [merged, ...prev]);
    });
  }

  function requireUserId(): string {
    if (!userId) throw new Error('Not authenticated');
    return userId;
  }

  async function openThread(threadId: string) {
    const messages = await fetchMessages(threadId);
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, messages } : t)));
  }

  async function createThread(params: {
    item: Item;
    otherUser: ThreadParticipant;
    payload: BorrowRequestPayload;
  }): Promise<Thread> {
    const me = requireUserId();
    const threadId = await findOrCreateThread(me, params.otherUser.id, params.item.id, 'pending_request');
    // The thread may already exist (e.g. a prior chat about this item) as 'direct'.
    await updateThreadStatus(threadId, 'pending_request');

    const notice = await sendMessageRemote(threadId, me, {
      type: 'system',
      text: `${params.payload.borrowerFirstName} sent a borrow request`,
    });
    const request = await sendMessageRemote(threadId, me, {
      type: 'borrow_request',
      data: params.payload,
    });

    const thread = await fetchThread(threadId, me);
    const existing = threads.find((t) => t.id === threadId);
    const withMessages = { ...thread, messages: [...(existing?.messages ?? []), notice, request] };
    upsertThread(withMessages, withMessages.messages);
    return withMessages;
  }

  async function createDirectThread(otherUser: ThreadParticipant, item?: Item): Promise<Thread> {
    const me = requireUserId();
    const threadId = await findOrCreateThread(me, otherUser.id, item?.id);
    const thread = await fetchThread(threadId, me);
    upsertThread(thread);
    return { ...thread, messages: threads.find((t) => t.id === threadId)?.messages ?? [] };
  }

  function markRead(threadId: string) {
    const target = threads.find((t) => t.id === threadId);
    if (!target?.unread) return;
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: false } : t)));
    markThreadRead(threadId).catch((e) => console.warn('Failed to mark thread read', e));
  }

  async function sendMessage(threadId: string, msg: OutgoingMessage) {
    const me = requireUserId();
    const sent = await sendMessageRemote(threadId, me, {
      type: msg.type,
      text: msg.text,
      data: msg.payload,
    });
    setThreads((prev) => sortByRecent(prev.map((t) => {
      if (t.id !== threadId) return t;
      return {
        ...t,
        messages: [...t.messages, sent],
        lastMessage: previewFor(msg),
        lastMessageTime: sent.timestamp,
      };
    })));
  }

  async function updateRequestStatus(
    threadId: string,
    messageId: string,
    status: BorrowRequestPayload['status'],
  ) {
    const message = threads.find((t) => t.id === threadId)?.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'borrow_request') return;

    const payload = { ...(message.payload as BorrowRequestPayload), status };
    await updateMessagePayload(messageId, payload);
    setThreads((prev) => prev.map((t) => {
      if (t.id !== threadId) return t;
      return { ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, payload } : m)) };
    }));
  }

  return (
    <MessagesContext.Provider
      value={{
        threads,
        unreadCount,
        isLoading,
        refreshThreads,
        getThread,
        findThreadByUser,
        openThread,
        createThread,
        createDirectThread,
        markRead,
        sendMessage,
        updateRequestStatus,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
