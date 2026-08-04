import React, { createContext, useContext, useState } from 'react';
import type {
  Thread,
  ChatMessage,
  Item,
  ThreadParticipant,
  BorrowRequestPayload,
} from '../types';

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface MessagesContextValue {
  threads: Thread[];
  unreadCount: number;
  getThread: (id: string) => Thread | undefined;
  createThread: (params: {
    item: Item;
    otherUser: ThreadParticipant;
    payload: BorrowRequestPayload;
  }) => Thread;
  findThreadByUser: (userId: string) => Thread | undefined;
  createDirectThread: (otherUser: ThreadParticipant, item?: Item) => Thread;
  markRead: (threadId: string) => void;
  sendMessage: (threadId: string, msg: Omit<ChatMessage, 'id' | 'threadId'>) => void;
  updateRequestStatus: (
    threadId: string,
    messageId: string,
    status: BorrowRequestPayload['status'],
  ) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

let nextThreadId = 100;
let nextMessageId = 100;

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);

  const unreadCount = threads.filter((t) => t.unread).length;

  function getThread(id: string): Thread | undefined {
    return threads.find((t) => t.id === id);
  }

  function createThread(params: {
    item: Item;
    otherUser: ThreadParticipant;
    payload: BorrowRequestPayload;
  }): Thread {
    const threadId = `t${++nextThreadId}`;
    const newThread: Thread = {
      id: threadId,
      otherUser: params.otherUser,
      item: params.item,
      status: 'pending_request',
      unread: false,
      lastMessage: 'Sent a borrow request',
      lastMessageTime: 'Just now',
      messages: [
        {
          id: `m${++nextMessageId}`,
          threadId,
          type: 'system',
          senderId: 'system',
          text: 'You sent a borrow request',
          timestamp: 'Just now',
        },
        {
          id: `m${++nextMessageId}`,
          threadId,
          type: 'borrow_request',
          senderId: 'me',
          payload: params.payload,
          timestamp: 'Just now',
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    return newThread;
  }

  function findThreadByUser(userId: string): Thread | undefined {
    return threads.find((t) => t.otherUser.id === userId);
  }

  function createDirectThread(otherUser: ThreadParticipant, item?: Item): Thread {
    const threadId = `t${++nextThreadId}`;
    const newThread: Thread = {
      id: threadId,
      otherUser,
      item,
      status: 'direct',
      unread: false,
      lastMessage: '',
      lastMessageTime: 'Just now',
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    return newThread;
  }

  function markRead(threadId: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread: false } : t)),
    );
  }

  function sendMessage(threadId: string, msg: Omit<ChatMessage, 'id' | 'threadId'>) {
    const newMsg: ChatMessage = {
      id: `m${++nextMessageId}`,
      threadId,
      ...msg,
    };
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: [...t.messages, newMsg],
          lastMessage: msg.text ?? 'Sent an offer',
          lastMessageTime: 'Just now',
        };
      }),
    );
  }

  function updateRequestStatus(
    threadId: string,
    messageId: string,
    status: BorrowRequestPayload['status'],
  ) {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== messageId || m.type !== 'borrow_request') return m;
            return {
              ...m,
              payload: { ...(m.payload as BorrowRequestPayload), status },
            };
          }),
        };
      }),
    );
  }

  return (
    <MessagesContext.Provider
      value={{
        threads,
        unreadCount,
        getThread,
        createThread,
        findThreadByUser,
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
