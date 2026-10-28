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
  it('reads the URL and anon key from EXPO_PUBLIC_SUPABASE_* env vars, not a hardcoded project', async () => {
    // Regression test: src/lib/supabase.ts hardcoded a literal project URL + anon key directly
    // in source (since the initial redesign commit), silently ignoring EXPO_PUBLIC_SUPABASE_URL /
    // EXPO_PUBLIC_SUPABASE_ANON_KEY even though .env.* files set them and Expo's CLI loads and
    // exports them — confirmed live: switching .env.local to a different Supabase project had
    // zero effect on the running app, which kept hitting the old project regardless.
    require('../../lib/supabase');

    const [calledUrl, calledKey] = mockCreateClient.mock.calls[0];
    expect(calledUrl).not.toBe('https://pdjqasshilipyujnsrkw.supabase.co');
    expect(calledKey).not.toMatch(/^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSI/);
    expect(calledUrl).toBe(process.env.EXPO_PUBLIC_SUPABASE_URL);
    expect(calledKey).toBe(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  });

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
