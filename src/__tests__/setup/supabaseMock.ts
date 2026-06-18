/**
 * Reusable Supabase mock factory.
 *
 * Each service test imports `mockSupabase` and configures the return
 * values it needs before calling service functions.
 *
 * Usage:
 *   jest.mock('../../lib/supabase', () => ({ supabase: mockSupabase }));
 *   mockSupabase.from.mockReturnValue(chainReturning({ data: [...], error: null }));
 */

/** Build a chainable query mock whose terminal awaited call resolves to `result`. */
export function buildQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};

  const terminal = jest.fn().mockResolvedValue(result);
  const methods = [
    'select', 'eq', 'ilike', 'order', 'limit', 'lte', 'single', 'update', 'insert',
  ];

  // Each method returns the same chain so calls can be arbitrarily chained.
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });

  // `single()` should resolve, so overwrite it to be awaitable
  chain.single = jest.fn().mockResolvedValue(result);

  // Make the chain itself awaitable (for patterns like `await supabase.from(...).select(...)`)
  // We achieve this by making the last method in a real chain call be the one that resolves.
  // For our tests we make `eq`, `order`, and `limit` also return a then-able when awaited
  // so that `const { data } = await chain` works.
  (chain as any).then = (resolve: (v: unknown) => void) => resolve(result);
  (chain as any)[Symbol.iterator] = undefined;

  return chain;
}

export const mockSupabase = {
  from: jest.fn(),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
};
