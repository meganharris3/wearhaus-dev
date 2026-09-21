import { supabase } from '../lib/supabase';
import type { BorrowRecord, LendRecord } from '../context/BorrowsContext';
import { pageRange, type PageOpts } from './pagination';

// ── color derivation ──────────────────────────────────────────────────────────
// Derives a stable muted palette color from any UUID, used as avatar/thumb
// placeholder until real photos are available.

const THUMB_PALETTE = ['#E8E4D4', '#E0DCD0', '#D8D4C8', '#E4DDD4', '#E2DED0', '#EAE7DC'];

function stableColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return THUMB_PALETTE[Math.abs(hash) % THUMB_PALETTE.length];
}

function initials(displayName: string): string {
  return displayName.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

// ── query shape ───────────────────────────────────────────────────────────────

const RENTAL_SELECT = `
  id, item_id, status, price_per_day, start_date, end_date,
  thread_id, rating, rating_comment, pickup_method, accepted_at,
  borrower_id, lender_id,
  item:items(id, name, size_label, condition),
  borrower:users!rentals_borrower_id_fkey(id, display_name),
  lender:users!rentals_lender_id_fkey(id, display_name)
`;

type RentalRow = {
  id: string;
  item_id: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  price_per_day: number;
  start_date: string;
  end_date: string;
  thread_id: string | null;
  rating: number | null;
  rating_comment: string | null;
  pickup_method: string | null;
  accepted_at: string | null;
  borrower_id: string;
  lender_id: string;
  item: { id: string; name: string; size_label: string | null; condition: string | null } | null;
  borrower: { id: string; display_name: string } | null;
  lender:   { id: string; display_name: string } | null;
};

// ── mapping ───────────────────────────────────────────────────────────────────

function rowToBorrowRecord(row: RentalRow): BorrowRecord {
  const item   = row.item;
  const lender = row.lender;
  return {
    id:                 row.id,
    itemId:             row.item_id,
    itemName:           item?.name ?? 'Unknown item',
    itemThumbColor:     stableColor(row.item_id),
    lenderId:           row.lender_id,
    lenderName:         lender?.display_name ?? 'Unknown',
    lenderAvatarColor:  stableColor(row.lender_id),
    status:             row.status as BorrowRecord['status'],
    pricePerDay:        row.price_per_day,
    startDate:          row.start_date,
    endDate:            row.end_date,
    threadId:           row.thread_id ?? row.id,
    rating:             row.rating ?? null,
    ratingComment:      row.rating_comment ?? undefined,
    itemSize:           item?.size_label ?? undefined,
    itemCondition:      item?.condition ?? undefined,
    pickupMethod:       row.pickup_method ?? undefined,
    acceptedAt:         row.accepted_at ?? undefined,
  };
}

function rowToLendRecord(row: RentalRow): LendRecord {
  const item     = row.item;
  const borrower = row.borrower;
  const name     = borrower?.display_name ?? 'Unknown';
  return {
    id:                  row.id,
    itemId:              row.item_id,
    itemName:            item?.name ?? 'Unknown item',
    itemThumbColor:      stableColor(row.item_id),
    borrowerId:          row.borrower_id,
    borrowerName:        name,
    borrowerInitials:    initials(name),
    borrowerAvatarColor: stableColor(row.borrower_id),
    status:              row.status as LendRecord['status'],
    pricePerDay:         row.price_per_day,
    startDate:           row.start_date,
    endDate:             row.end_date,
    threadId:            row.thread_id ?? row.id,
    itemSize:            item?.size_label ?? undefined,
    itemCondition:       item?.condition ?? undefined,
    pickupMethod:        row.pickup_method ?? undefined,
    acceptedAt:          row.accepted_at ?? undefined,
  };
}

// ── public API ────────────────────────────────────────────────────────────────

// Rentals are consumed as a whole history (BorrowsContext), so the default is
// PostgREST's own 1000-row cap made explicit rather than a feed-sized page.
export async function fetchMyRentals(
  userId: string,
  opts: PageOpts = {},
): Promise<{ borrows: BorrowRecord[]; lends: LendRecord[] }> {
  const [from, to] = pageRange(opts, 1000);
  const { data, error } = await supabase
    .from('rentals')
    .select(RENTAL_SELECT)
    .or(`borrower_id.eq.${userId},lender_id.eq.${userId}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RentalRow[];
  const borrows: BorrowRecord[] = [];
  const lends: LendRecord[]     = [];

  for (const row of rows) {
    if (row.borrower_id === userId) borrows.push(rowToBorrowRecord(row));
    if (row.lender_id   === userId) lends.push(rowToLendRecord(row));
  }

  return { borrows, lends };
}

export async function updateRentalStatus(
  id: string,
  status: 'upcoming' | 'active' | 'completed',
): Promise<void> {
  const { error } = await supabase
    .from('rentals')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function cancelRental(id: string): Promise<void> {
  const { error } = await supabase
    .from('rentals')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function rateRental(
  id: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const { error } = await supabase
    .from('rentals')
    .update({ rating, rating_comment: comment ?? null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createRental(payload: {
  itemId: string;
  borrowerId: string;
  lenderId: string;
  pricePerDay: number;
  startDate: string;
  endDate: string;
  pickupMethod?: string;
  threadId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('rentals')
    .insert({
      item_id:       payload.itemId,
      borrower_id:   payload.borrowerId,
      lender_id:     payload.lenderId,
      price_per_day: payload.pricePerDay,
      start_date:    payload.startDate,
      end_date:      payload.endDate,
      pickup_method: payload.pickupMethod ?? null,
      thread_id:     payload.threadId ?? null,
      status:        'upcoming',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}
