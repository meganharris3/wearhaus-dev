import { applyCounterOffer } from '../../utils/counterOffer';
import type { BorrowRequestPayload } from '../../types';

const request: BorrowRequestPayload = {
  lenderId: 'l1', lenderFirstName: 'Jordan', borrowerId: 'b1', borrowerFirstName: 'Megan',
  item: { name: 'Denim Jacket', size: 'M', condition: 'Good', thumbColor: '#ddd', photo: null },
  startDate: 'Nov 3', endDate: 'Nov 5', startDateISO: '2026-11-03', endDateISO: '2026-11-05',
  itemId: 'i1', days: 3, pricePerDay: 10, pickupMethod: 'Pickup',
  total: 52.1, // 30 + 7% fee + $20 deposit
  status: 'pending',
};

it('applies the countered rate and dates and accepts the request', () => {
  const out = applyCounterOffer(request, {
    pricePerDay: 800,
    dates: { start: 'Nov 10', end: 'Nov 10' },
    startDateISO: '2026-11-10', endDateISO: '2026-11-10',
  });
  expect(out.pricePerDay).toBe(8);
  expect(out.days).toBe(1);
  expect(out.startDate).toBe('Nov 10');
  expect(out.startDateISO).toBe('2026-11-10');
  expect(out.endDateISO).toBe('2026-11-10');
  expect(out.total).toBe(28.56); // 8 + 0.56 fee + 20 deposit
  expect(out.status).toBe('accepted');
});

it('keeps the original dates when the offer only changed the price', () => {
  const out = applyCounterOffer(request, { pricePerDay: 500, dates: { start: '—', end: '—' } });
  expect(out.startDateISO).toBe('2026-11-03');
  expect(out.startDate).toBe('Nov 3');
  expect(out.days).toBe(3);
  expect(out.total).toBe(36.05); // 15 + 1.05 + 20
});

it('counts days across a month boundary', () => {
  const out = applyCounterOffer(request, {
    pricePerDay: 1000, dates: { start: 'Nov 30', end: 'Dec 2' },
    startDateISO: '2026-11-30', endDateISO: '2026-12-02',
  });
  expect(out.days).toBe(3);
});
