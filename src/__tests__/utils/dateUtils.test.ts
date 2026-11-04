import { formatMessageTime, toDateStr, parseDate } from '../../utils/dateUtils';

const now = new Date(2026, 8, 21, 15, 30, 0); // Sep 21 2026, 3:30 PM local

describe('formatMessageTime', () => {
  it("says 'Just now' within the last minute", () => {
    expect(formatMessageTime(new Date(2026, 8, 21, 15, 29, 30).toISOString(), now)).toBe('Just now');
  });

  it("treats a timestamp slightly in the future (clock skew) as 'Just now'", () => {
    expect(formatMessageTime(new Date(2026, 8, 21, 15, 30, 20).toISOString(), now)).toBe('Just now');
  });

  it('shows the clock time for earlier today', () => {
    expect(formatMessageTime(new Date(2026, 8, 21, 9, 5).toISOString(), now)).toBe('9:05 AM');
    expect(formatMessageTime(new Date(2026, 8, 21, 0, 10).toISOString(), now)).toBe('12:10 AM');
    expect(formatMessageTime(new Date(2026, 8, 21, 12, 0).toISOString(), now)).toBe('12:00 PM');
  });

  it("says 'Yesterday' for the previous calendar day", () => {
    expect(formatMessageTime(new Date(2026, 8, 20, 23, 59).toISOString(), now)).toBe('Yesterday');
  });

  it('shows the weekday within the last week', () => {
    expect(formatMessageTime(new Date(2026, 8, 18, 12, 0).toISOString(), now)).toBe('Fri');
  });

  it('shows month and day for anything older', () => {
    expect(formatMessageTime(new Date(2026, 7, 4, 12, 0).toISOString(), now)).toBe('Aug 4');
  });

  it('returns an empty string for an unparseable value', () => {
    expect(formatMessageTime('not-a-date', now)).toBe('');
  });
});

describe('toDateStr', () => {
  it('formats a local date as YYYY-MM-DD, zero-padded', () => {
    expect(toDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local calendar day even late in the evening (no UTC shift)', () => {
    expect(toDateStr(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03');
  });

  it('round-trips with parseDate', () => {
    expect(toDateStr(parseDate('2026-12-31'))).toBe('2026-12-31');
  });
});
