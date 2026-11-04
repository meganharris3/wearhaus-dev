/**
 * Unit tests for the pagination behaviour of borrowService.fetchMyRentals
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'or', 'order', 'limit', 'range'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import { fetchMyRentals } from '../../services/borrowService';

beforeEach(() => { jest.clearAllMocks(); });

const rental = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1', item_id: 'i1', status: 'active', price_per_day: 1200,
  start_date: '2026-01-01', end_date: '2026-01-03',
  thread_id: null, rating: null, rating_comment: null, pickup_method: null, accepted_at: null,
  borrower_id: 'me', lender_id: 'u2',
  item: { id: 'i1', name: 'Denim Jacket', size_label: ['M'], condition: 'Good' },
  borrower: { id: 'me', display_name: 'Me Myself' },
  lender: { id: 'u2', display_name: 'Maya Chen' },
  ...overrides,
});

describe('fetchMyRentals', () => {
  it("defaults to PostgREST's 1000-row cap made explicit, with id as a stable tiebreaker", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyRentals('me');

    expect(mockFrom).toHaveBeenCalledWith('rentals');
    expect(chain.or).toHaveBeenCalledWith('borrower_id.eq.me,lender_id.eq.me');
    expect(chain.neq).toHaveBeenCalledWith('status', 'cancelled');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(chain.order).toHaveBeenCalledWith('id');
    expect(chain.range).toHaveBeenCalledWith(0, 999);
  });

  it('pages with limit and offset', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchMyRentals('me', { limit: 25, offset: 50 });

    expect(chain.range).toHaveBeenCalledWith(50, 74);
  });

  it('splits rows into borrows and lends by the current user', async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [
        rental({ id: 'r1', borrower_id: 'me', lender_id: 'u2' }),
        rental({ id: 'r2', borrower_id: 'u3', lender_id: 'me', borrower: { id: 'u3', display_name: 'Jo Park' } }),
      ],
      error: null,
    }));

    const { borrows, lends } = await fetchMyRentals('me');

    expect(borrows.map((b) => b.id)).toEqual(['r1']);
    expect(borrows[0].lenderName).toBe('Maya Chen');
    expect(lends.map((l) => l.id)).toEqual(['r2']);
    expect(lends[0]).toMatchObject({ borrowerName: 'Jo Park', borrowerInitials: 'JP' });
  });

  it('returns empty lists when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchMyRentals('me')).toEqual({ borrows: [], lends: [] });
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchMyRentals('me')).rejects.toThrow('DB error');
  });

  it('converts the stored price from cents to dollars', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [rental({ price_per_day: 1250 })], error: null }));
    const { borrows } = await fetchMyRentals('me');
    expect(borrows[0].pricePerDay).toBe(12.5);
  });

  it("carries the item's photo, falling back to the first of its photos", async () => {
    mockFrom.mockReturnValue(makeChain({
      data: [
        rental({ id: 'r1', item: { id: 'i1', name: 'A', size_label: null, condition: null, photo_url: 'https://x/a.jpg', photo_urls: [] } }),
        rental({ id: 'r2', item: { id: 'i2', name: 'B', size_label: null, condition: null, photo_url: null, photo_urls: ['https://x/b.jpg'] } }),
        rental({ id: 'r3' }),
      ],
      error: null,
    }));
    const { borrows } = await fetchMyRentals('me');
    expect(borrows.map((b) => b.itemPhoto)).toEqual(['https://x/a.jpg', 'https://x/b.jpg', undefined]);
  });
});

