import type { BorrowRequestPayload, CounterOfferPayload } from '../types';

const SERVICE_FEE = 0.07; // matches DatePickerScreen

function daysBetweenISO(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
}

/**
 * The borrow request as it stands once a counter offer is accepted: the counter's rate (cents →
 * dollars) and, when it named dates, its dates. Accepting the result is what creates the rental
 * (supabase/migrations/018_rental_on_borrow_accept.sql), so it must carry the real ISO dates.
 * The deposit isn't stored on the request, so it's backed out of the old total and kept as-is.
 */
export function applyCounterOffer(
  request: BorrowRequestPayload,
  counter: CounterOfferPayload,
): BorrowRequestPayload {
  const hasDates = !!counter.startDateISO && !!counter.endDateISO;
  const pricePerDay = counter.pricePerDay / 100;
  const days = hasDates ? daysBetweenISO(counter.startDateISO!, counter.endDateISO!) : request.days;

  const deposit = Math.max(0, request.total - request.pricePerDay * request.days * (1 + SERVICE_FEE));
  const subtotal = pricePerDay * days;
  const total = +(subtotal + subtotal * SERVICE_FEE + deposit).toFixed(2);

  return {
    ...request,
    pricePerDay,
    days,
    total,
    ...(hasDates && {
      startDate: counter.dates.start,
      endDate: counter.dates.end,
      startDateISO: counter.startDateISO,
      endDateISO: counter.endDateISO,
    }),
    status: 'accepted',
  };
}
