import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchMyRentals, updateRentalStatus, cancelRental,
} from '../services/borrowService';

// ── date helpers ──────────────────────────────────────────────────────────────

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDays(startDate: string, endDate: string): number {
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

export function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── types ─────────────────────────────────────────────────────────────────────

export type BorrowRecord = {
  id: string;
  itemId: string;
  itemName: string;
  itemThumbColor: string;
  lenderId: string;
  lenderName: string;
  lenderAvatarColor?: string;
  status: 'active' | 'upcoming' | 'completed';
  startDate: string;
  endDate: string;
  pricePerDay: number;
  threadId: string;
  rating?: number | null;
  ratingComment?: string;
  itemSize?: string;
  itemCondition?: string;
  pickupMethod?: string;
  acceptedAt?: string;
};

export type LendRecord = {
  id: string;
  itemId: string;
  itemName: string;
  itemThumbColor: string;
  borrowerId: string;
  borrowerName: string;
  borrowerInitials: string;
  borrowerAvatarColor: string;
  status: 'active' | 'upcoming' | 'completed';
  startDate: string;
  endDate: string;
  pricePerDay: number;
  threadId: string;
  itemSize?: string;
  itemCondition?: string;
  pickupMethod?: string;
  acceptedAt?: string;
};

// ── mock data (dev / Storybook) ───────────────────────────────────────────────
// Exported for tests and demos. Not loaded at runtime when a real user is signed in.

export const mockBorrows: BorrowRecord[] = [
  {
    id: 'b1', itemId: 'item_1', itemName: 'Wrap Midi Coat', itemThumbColor: '#E8E4D4',
    lenderId: 'u_ava', lenderName: 'Ava L.', lenderAvatarColor: '#FFFFAD',
    status: 'active', pricePerDay: 22,
    startDate: '2026-07-10', endDate: '2026-07-25', threadId: 'thread_2', rating: null,
    itemSize: 'S', itemCondition: 'Excellent condition', pickupMethod: 'Campus Exchange', acceptedAt: '2026-07-08',
  },
  {
    id: 'b2', itemId: 'item_2', itemName: 'Oversized Blazer', itemThumbColor: '#E0DCD0',
    lenderId: 'u_sophie', lenderName: 'Sophie R.', lenderAvatarColor: '#E0DCD0',
    status: 'active', pricePerDay: 18,
    startDate: '2026-07-12', endDate: '2026-07-17', threadId: 'thread_3', rating: null,
    itemSize: 'M', itemCondition: 'Good condition', pickupMethod: 'Front door dropoff', acceptedAt: '2026-07-10',
  },
  {
    id: 'b3', itemId: 'item_3', itemName: 'Floral Maxi Skirt', itemThumbColor: '#D8D4C8',
    lenderId: 'u_jade', lenderName: 'Jade T.', lenderAvatarColor: '#D8D4C8',
    status: 'upcoming', pricePerDay: 14,
    startDate: '2026-07-22', endDate: '2026-07-26', threadId: 'thread_4', rating: null,
    itemSize: 'XS', itemCondition: 'Like new', pickupMethod: 'Campus Exchange', acceptedAt: '2026-07-18',
  },
  {
    id: 'b4', itemId: 'item_4', itemName: 'Satin Corset Top', itemThumbColor: '#E8E4D4',
    lenderId: 'u_priya', lenderName: 'Priya M.', lenderAvatarColor: '#D8D4C8',
    status: 'completed', pricePerDay: 16,
    startDate: '2026-07-01', endDate: '2026-07-05', threadId: 'thread_5', rating: 5.0,
    ratingComment: 'Great condition, exactly as described!',
    itemSize: 'S', itemCondition: 'Excellent condition', pickupMethod: 'Dorm lobby', acceptedAt: '2026-06-29',
  },
  {
    id: 'b5', itemId: 'item_5', itemName: 'Rosette Mini Dress', itemThumbColor: '#E0DCD0',
    lenderId: 'u_tara', lenderName: 'Tara K.', lenderAvatarColor: '#E2DED0',
    status: 'completed', pricePerDay: 20,
    startDate: '2026-06-28', endDate: '2026-07-02', threadId: 'thread_6', rating: null,
    itemSize: 'M', itemCondition: 'Good condition', pickupMethod: 'Campus Exchange', acceptedAt: '2026-06-26',
  },
];

export const mockLends: LendRecord[] = [
  {
    id: 'l1', itemId: 'item_6', itemName: 'Silk Slip Dress', itemThumbColor: '#E0DCD0',
    borrowerId: 'u_jade', borrowerName: 'Jade T.', borrowerInitials: 'JT', borrowerAvatarColor: '#FFFFAD',
    status: 'active', startDate: '2026-07-10', endDate: '2026-07-15', pricePerDay: 18, threadId: 'thread_1',
    itemSize: 'S', itemCondition: 'Like new', pickupMethod: 'Campus Exchange', acceptedAt: '2026-07-08',
  },
  {
    id: 'l2', itemId: 'item_7', itemName: 'Oversized Blazer', itemThumbColor: '#D8D4C8',
    borrowerId: 'u_sophie2', borrowerName: 'Sophie R.', borrowerInitials: 'SR', borrowerAvatarColor: '#E0DCD0',
    status: 'active', startDate: '2026-07-08', endDate: '2026-07-17', pricePerDay: 14, threadId: 'thread_7',
    itemSize: 'M', itemCondition: 'Good condition', pickupMethod: 'Front door dropoff', acceptedAt: '2026-07-06',
  },
  {
    id: 'l3', itemId: 'item_8', itemName: 'Wrap Midi Coat', itemThumbColor: '#E4DDD4',
    borrowerId: 'u_priya2', borrowerName: 'Priya M.', borrowerInitials: 'PM', borrowerAvatarColor: '#D8D4C8',
    status: 'upcoming', startDate: '2026-07-22', endDate: '2026-07-26', pricePerDay: 22, threadId: 'thread_8',
    itemSize: 'S', itemCondition: 'Excellent condition', pickupMethod: 'Campus Exchange', acceptedAt: '2026-07-18',
  },
  {
    id: 'l4', itemId: 'item_9', itemName: 'Floral Midi Dress', itemThumbColor: '#E8E4D4',
    borrowerId: 'u_tara2', borrowerName: 'Tara K.', borrowerInitials: 'TK', borrowerAvatarColor: '#FFFFAD',
    status: 'completed', startDate: '2026-07-01', endDate: '2026-07-05', pricePerDay: 16, threadId: 'thread_9',
    itemSize: 'M', itemCondition: 'Good condition', pickupMethod: 'Dorm lobby', acceptedAt: '2026-06-29',
  },
  {
    id: 'l5', itemId: 'item_10', itemName: 'Linen Blazer Set', itemThumbColor: '#E0DCD0',
    borrowerId: 'u_ava2', borrowerName: 'Ava L.', borrowerInitials: 'AL', borrowerAvatarColor: '#E2DED0',
    status: 'completed', startDate: '2026-07-06', endDate: '2026-07-10', pricePerDay: 20, threadId: 'thread_10',
    itemSize: 'S', itemCondition: 'Like new', pickupMethod: 'Campus Exchange', acceptedAt: '2026-07-04',
  },
];

// ── context ───────────────────────────────────────────────────────────────────

type BorrowStats = { active: number; upcoming: number };
type LendStats   = { active: number; monthlyEarnings: number };

interface BorrowsContextValue {
  borrows: BorrowRecord[];
  lends: LendRecord[];
  borrowStats: BorrowStats;
  lendStats: LendStats;
  urgentCount: number;
  loading: boolean;
  refresh: () => void;
  updateBorrowStatus: (id: string, status: BorrowRecord['status']) => void;
  cancelBorrow: (id: string) => void;
}

const BorrowsContext = createContext<BorrowsContextValue | undefined>(undefined);

export function BorrowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [lends, setLends]     = useState<LendRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      // Not signed in — clear any stale data
      setBorrows([]);
      setLends([]);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchMyRentals(user.id);
      setBorrows(result.borrows);
      setLends(result.lends);
    } catch (err) {
      console.error('BorrowsContext: failed to load rentals', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const borrowStats = useMemo<BorrowStats>(() => ({
    active:   borrows.filter(b => b.status === 'active').length,
    upcoming: borrows.filter(b => b.status === 'upcoming').length,
  }), [borrows]);

  const lendStats = useMemo<LendStats>(() => ({
    active: lends.filter(l => l.status === 'active').length,
    monthlyEarnings: lends
      .filter(l => l.status === 'completed' && isThisMonth(l.endDate))
      .reduce((sum, l) => sum + l.pricePerDay * getDays(l.startDate, l.endDate), 0),
  }), [lends]);

  const urgentCount = useMemo(() =>
    [...borrows, ...lends].filter(r => r.status === 'active' && getDaysUntil(r.endDate) <= 1).length,
  [borrows, lends]);

  const updateBorrowStatus = (id: string, status: BorrowRecord['status']) => {
    setBorrows(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    updateRentalStatus(id, status).catch(err =>
      console.error('Failed to update rental status:', err),
    );
  };

  const cancelBorrow = (id: string) => {
    setBorrows(prev => prev.filter(b => b.id !== id));
    cancelRental(id).catch(err =>
      console.error('Failed to cancel rental:', err),
    );
  };

  return (
    <BorrowsContext.Provider value={{
      borrows, lends, borrowStats, lendStats, urgentCount,
      loading, refresh: load,
      updateBorrowStatus, cancelBorrow,
    }}>
      {children}
    </BorrowsContext.Provider>
  );
}

export function useBorrows(): BorrowsContextValue {
  const ctx = useContext(BorrowsContext);
  if (!ctx) throw new Error('useBorrows must be used within BorrowsProvider');
  return ctx;
}
