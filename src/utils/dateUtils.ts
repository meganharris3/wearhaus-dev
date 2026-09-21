import type { AvailabilityRange } from '../types';

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const DAY_HEADERS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/** Parse 'YYYY-MM-DD' without timezone offset issues */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Normalize a Date to midnight local time */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Short display: 'Jun 25' */
export function formatDateShort(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

/** 'Jun 25 – Jun 28' */
export function formatRange(start: Date, end: Date): string {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

/** All dates from start to end, inclusive */
export function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = startOfDay(start);
  const fin = startOfDay(end);
  while (cur <= fin) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** True if date falls inside any range in the array */
export function isDateInRanges(date: Date, ranges: AvailabilityRange[]): boolean {
  const d = startOfDay(date);
  return ranges.some((r) => {
    const s = startOfDay(parseDate(r.start));
    const e = startOfDay(parseDate(r.end));
    return d >= s && d <= e;
  });
}

/** True if ANY date between start and end (inclusive) is in bookedRanges */
export function rangeHasConflict(
  start: Date,
  end: Date,
  bookedRanges: AvailabilityRange[],
): boolean {
  return getDatesInRange(start, end).some((d) => isDateInRanges(d, bookedRanges));
}

/** Find which range contains a given date */
export function findRangeForDate(
  date: Date,
  ranges: AvailabilityRange[],
): AvailabilityRange | undefined {
  const d = startOfDay(date);
  return ranges.find((r) => {
    const s = startOfDay(parseDate(r.start));
    const e = startOfDay(parseDate(r.end));
    return d >= s && d <= e;
  });
}

/** Calendar days between two dates (same day = 1) */
export function diffInDays(start: Date, end: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
}

/** Number of days in a given month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Sunday offset of first day of month */
export function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Add months to a Date (returns a new Date) */
export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chat-style timestamp from an ISO string: 'Just now', '3:05 PM', 'Yesterday', 'Fri', 'Aug 4' */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  if (now.getTime() - d.getTime() < 60_000) return 'Just now';

  const dayDiff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (dayDiff === 0) {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  }
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return WEEKDAY_SHORT[d.getDay()];
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}
