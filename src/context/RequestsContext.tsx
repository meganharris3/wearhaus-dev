import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

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

const INITIAL_REQUESTS: Request[] = [
  {
    id: 'req_1', type: 'borrow_request', status: 'pending', read: false,
    borrowerName: 'Jade T.', itemName: 'Ribbed Cami Mini Dress',
    days: 2, dateRange: 'Jun 30 – Jul 2', createdAt: '2m ago',
  },
  {
    id: 'req_2', type: 'borrow_request', status: 'pending', read: false,
    borrowerName: 'Priya M.', itemName: 'Plaid Micro Mini Skirt',
    days: 3, dateRange: 'Jul 1 – Jul 4', createdAt: '1h ago',
  },
  {
    id: 'req_3', type: 'borrow_request', status: 'pending', read: false,
    borrowerName: 'Sophie R.', itemName: 'Lace Corset Top',
    days: 1, dateRange: 'Jun 30', createdAt: '3h ago',
  },
  {
    id: 'req_4', type: 'borrow_accepted', status: 'accepted', read: true,
    borrowerName: 'Ava L.', itemName: 'Satin Slip Mini Skirt',
    dueBack: 'Jul 3', dateRange: null, createdAt: 'Yesterday',
  },
  {
    id: 'req_5', type: 'friend_request', status: 'pending', read: false,
    borrowerName: 'Chloe B.', itemName: '',
    dateRange: null, createdAt: '5m ago',
  },
  {
    id: 'req_6', type: 'friend_accepted', status: 'accepted', read: true,
    borrowerName: 'Maya Chen', itemName: '',
    dateRange: null, createdAt: '2h ago',
  },
  {
    id: 'req_7', type: 'return_reminder', status: 'pending', read: false,
    borrowerName: 'You', itemName: 'Mesh Cut-Out Mini Dress',
    dueBack: 'Tomorrow', dateRange: null, createdAt: '10m ago',
  },
];

interface RequestsContextValue {
  requests: Request[];
  pendingCount: number;
  addRequest: (req: Omit<Request, 'id' | 'createdAt' | 'read' | 'status'>) => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
}

const RequestsContext = createContext<RequestsContextValue | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<Request[]>(INITIAL_REQUESTS);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  );

  const addRequest = useCallback(
    (req: Omit<Request, 'id' | 'createdAt' | 'read' | 'status'>) => {
      const newReq: Request = {
        ...req,
        id: `req_${Date.now()}`,
        status: 'pending',
        read: false,
        createdAt: 'Just now',
      };
      setRequests((prev) => [newReq, ...prev]);
    },
    [],
  );

  const acceptRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: 'accepted', read: true } : r),
    );
  }, []);

  const declineRequest = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: 'declined', read: true } : r),
    );
  }, []);

  return (
    <RequestsContext.Provider value={{ requests, pendingCount, addRequest, acceptRequest, declineRequest }}>
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider');
  return ctx;
}
