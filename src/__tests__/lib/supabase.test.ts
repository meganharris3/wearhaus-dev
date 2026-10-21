/**
 * Regression test for src/lib/supabase.ts's client config.
 *
 * detectSessionInUrl must stay on: it's what makes the client read the session out of a
 * confirmation/magic-link/OAuth redirect (e.g. #access_token=...&type=signup on web) instead of
 * silently ignoring it, which is exactly what happened when this was off — Supabase's own
 * redirect worked, the app just never looked at what it was handed. supabase-js only acts on
 * this in an actual browser, so it's a no-op on native regardless.
 */
const mockCreateClient = jest.fn().mockReturnValue({});
jest.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules(); // the module runs createClient() once at import time — force a fresh import per test
});

describe('supabase client config', () => {
  it('enables detectSessionInUrl', async () => {
    require('../../lib/supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ auth: expect.objectContaining({ detectSessionInUrl: true }) }),
    );
  });

  it('persists the session and auto-refreshes it', async () => {
    require('../../lib/supabase');

    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({ persistSession: true, autoRefreshToken: true }),
      }),
    );
  });
});
