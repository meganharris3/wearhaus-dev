export interface PageOpts {
  limit?: number;
  offset?: number;
}

/**
 * Inclusive [from, to] bounds for PostgREST's `.range()`.
 * A missing or non-positive limit falls back to `defaultLimit`; a negative offset is clamped to 0.
 *
 * Callers must order by a unique tiebreaker (e.g. `id`) — offset paging over
 * rows that tie on the sort key can repeat or skip rows between pages.
 */
export function pageRange(opts: PageOpts, defaultLimit: number): [number, number] {
  const limit = opts.limit && opts.limit >= 1 ? Math.floor(opts.limit) : defaultLimit;
  const offset = opts.offset && opts.offset > 0 ? Math.floor(opts.offset) : 0;
  return [offset, offset + limit - 1];
}
