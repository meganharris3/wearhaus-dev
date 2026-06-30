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
  markRead: (threadId: string) => void;
  sendMessage: (threadId: string, msg: Omit<ChatMessage, 'id' | 'threadId'>) => void;
  updateRequestStatus: (
    threadId: string,
    messageId: string,
    status: BorrowRequestPayload['status'],
  ) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const INITIAL_THREADS: Thread[] = [
  {
    id: 't1',
    otherUser: { id: 'u10', name: 'Priya Patel', handle: 'priyap', initials: 'PP', avatarColor: '#F0EDE0' },
    item: {
      id: 'i1',
      owner_id: 'me',
      name: 'Silk Slip Dress',
      size_label: 'S',
      price_per_day: 1400,
      status: 'available',
      location_label: '0.3 mi · NYU',
      category: 'dress',
    },
    status: 'pending_request',
    unread: true,
    lastMessage: 'Sent a borrow request',
    lastMessageTime: '2m ago',
    messages: [
      {
        id: 'm1',
        threadId: 't1',
        type: 'system',
        senderId: 'system',
        text: 'Priya Patel sent a borrow request',
        timestamp: '2m ago',
      },
      {
        id: 'm2',
        threadId: 't1',
        type: 'borrow_request',
        senderId: 'u10',
        payload: {
          dates: { start: 'Jun 25', end: 'Jun 28' },
          duration: 4,
          pricePerDay: 1400,
          pickup: 'Campus Pickup',
          total: 6776,
          status: 'pending',
        },
        timestamp: '2m ago',
      },
    ],
  },
  {
    id: 't2',
    otherUser: { id: 'u11', name: 'Maya Chen', handle: 'mayac', initials: 'MC', avatarColor: '#FFFFAD' },
    item: {
      id: 'i2',
      owner_id: 'u11',
      name: 'Black Blazer',
      size_label: 'M',
      price_per_day: 500,
      status: 'available',
      location_label: '0.5 mi · NYU',
      category: 'jacket',
    },
    status: 'counter_sent',
    unread: false,
    lastMessage: 'Counter offer sent',
    lastMessageTime: '1h ago',
    messages: [
      {
        id: 'm3',
        threadId: 't2',
        type: 'system',
        senderId: 'system',
        text: 'You sent a borrow request',
        timestamp: '2h ago',
      },
      {
        id: 'm4',
        threadId: 't2',
        type: 'borrow_request',
        senderId: 'me',
        payload: {
          dates: { start: 'Jul 1', end: 'Jul 3' },
          duration: 3,
          pricePerDay: 500,
          pickup: 'Campus Pickup',
          total: 1820,
          status: 'countered',
        },
        timestamp: '2h ago',
      },
      {
        id: 'm5',
        threadId: 't2',
        type: 'counter_offer',
        senderId: 'u11',
        payload: {
          pricePerDay: 400,
          dates: { start: 'Jul 1', end: 'Jul 3' },
          note: 'Happy to do $4/day!',
        },
        timestamp: '1h ago',
      },
    ],
  },
  {
    id: 't3',
    otherUser: { id: 'u12', name: 'Jade Kim', handle: 'jadek', initials: 'JK', avatarColor: '#F0EDE0' },
    item: {
      id: 'i3',
      owner_id: 'u12',
      name: 'Linen Jumpsuit',
      size_label: 'S',
      price_per_day: 900,
      status: 'lent',
      location_label: '1.2 mi · Columbia',
      category: 'other',
    },
    status: 'active_rental',
    unread: false,
    lastMessage: 'Rental confirmed ✓',
    lastMessageTime: 'Jun 20',
    messages: [
      {
        id: 'm6',
        threadId: 't3',
        type: 'system',
        senderId: 'system',
        text: 'You sent a borrow request',
        timestamp: 'Jun 19',
      },
      {
        id: 'm7',
        threadId: 't3',
        type: 'borrow_request',
        senderId: 'me',
        payload: {
          dates: { start: 'Jun 20', end: 'Jun 22' },
          duration: 3,
          pricePerDay: 900,
          pickup: 'Campus Pickup',
          total: 3213,
          status: 'accepted',
        },
        timestamp: 'Jun 19',
      },
      {
        id: 'm8',
        threadId: 't3',
        type: 'confirmed',
        senderId: 'system',
        payload: {
          dates: { start: 'Jun 20', end: 'Jun 22' },
          duration: 3,
          pricePerDay: 900,
          pickup: 'Campus Pickup',
          total: 3213,
          status: 'accepted',
        },
        timestamp: 'Jun 20',
      },
    ],
  },
  {
    id: 't4',
    otherUser: { id: 'u13', name: 'Sofia Torres', handle: 'sofiat', initials: 'ST', avatarColor: '#E2DED0' },
    item: {
      id: 'i4',
      owner_id: 'u13',
      name: 'Floral Midi Dress',
      size_label: 'XS',
      price_per_day: 1200,
      status: 'available',
      location_label: '0.8 mi · NYU',
      category: 'dress',
    },
    status: 'completed',
    unread: false,
    lastMessage: 'Hope you enjoyed it!',
    lastMessageTime: 'Jun 10',
    messages: [
      {
        id: 'm9',
        threadId: 't4',
        type: 'text',
        senderId: 'u13',
        text: 'Hope you enjoyed it!',
        timestamp: 'Jun 10',
      },
    ],
  },
];

// ─── Provider ──────────────────────────────────────────────────────────────────

let nextThreadId = 100;
let nextMessageId = 100;

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);

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
