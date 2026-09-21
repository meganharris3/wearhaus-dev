/**
 * Unit tests for src/services/userService.ts
 */

// See hausService.test.ts for why the mock factory can't reference an
// externally-declared `const mockFrom = jest.fn()` (babel-jest hoisting
// order bug) — create it inline, then read it back via the mocked import.
jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import { fetchUserProfile, updateUserProfile } from '../../services/userService';
import type { UserProfile } from '../../types';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id:                 'u1',
  display_name:       'Maya Chen',
  items_listed:       3,
  rentals_completed:  5,
  rating:             4.8,
  ...overrides,
});

// ---------------------------------------------------------------------------
// fetchUserProfile
// ---------------------------------------------------------------------------
describe('fetchUserProfile', () => {
  it('returns the user profile on success', async () => {
    const profile = makeProfile();
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: profile, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchUserProfile('u1');

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(chain.eq).toHaveBeenCalledWith('id', 'u1');
    expect(result?.display_name).toBe('Maya Chen');
    expect(result?.rating).toBe(4.8);
  });

  it('throws when Supabase returns an error', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } });
    mockFrom.mockReturnValue(chain);

    await expect(fetchUserProfile('missing')).rejects.toThrow('User not found');
  });

  it('selects the expected profile fields', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: makeProfile(), error: null });
    mockFrom.mockReturnValue(chain);

    await fetchUserProfile('u1');

    expect(chain.select).toHaveBeenCalledWith(
      'id, display_name, username, avatar_url, university, bio, items_listed, rentals_completed, rating, campus_verified, campus_id, campus_name, school_email, interests, onboarding_complete'
    );
  });

  it('falls back to the base columns when a newer column is genuinely missing', async () => {
    const full: any = {};
    full.select = jest.fn().mockReturnValue(full);
    full.eq     = jest.fn().mockReturnValue(full);
    full.single = jest.fn().mockResolvedValue({
      data: null, error: { code: '42703', message: 'column users.campus_verified does not exist' },
    });
    const base: any = {};
    base.select = jest.fn().mockReturnValue(base);
    base.eq     = jest.fn().mockReturnValue(base);
    base.single = jest.fn().mockResolvedValue({ data: makeProfile(), error: null });
    mockFrom.mockReturnValueOnce(full).mockReturnValueOnce(base);

    const result = await fetchUserProfile('u1');

    expect(result?.display_name).toBe('Maya Chen');
    expect(base.select).toHaveBeenCalledWith(expect.not.stringContaining('username'));
  });

  it('does not fall back (or hide the error) for an unrelated error that merely mentions a column', async () => {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({
      data: null, error: { code: '42501', message: 'permission denied for column username' },
    });
    mockFrom.mockReturnValue(chain);

    await expect(fetchUserProfile('u1')).rejects.toThrow('permission denied');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// updateUserProfile
// ---------------------------------------------------------------------------
describe('updateUserProfile', () => {
  // Matches the real implementation: supabase.from('users').update(updates).eq('id', userId),
  // then (on success) a separate fetchUserProfile() read-back call:
  // supabase.from('users').select(...).eq('id', userId).single().
  function makeUpdateChain(result: { error: unknown }) {
    const chain: any = {};
    chain.update = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockResolvedValue(result);
    return chain;
  }

  function makeReadBackChain(profile: UserProfile) {
    const chain: any = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: profile, error: null });
    return chain;
  }

  it('resolves with the saved profile on successful update', async () => {
    const updateChain = makeUpdateChain({ error: null });
    const readBackChain = makeReadBackChain(makeProfile({ display_name: 'New Name' }));
    mockFrom.mockReturnValueOnce(updateChain).mockReturnValueOnce(readBackChain);

    const result = await updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name' });

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'New Name' }));
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'u1');
    expect(result.display_name).toBe('New Name');
  });

  it('throws when Supabase returns an error', async () => {
    const updateChain = makeUpdateChain({ error: { message: 'Permission denied', code: '42501' } });
    mockFrom.mockReturnValue(updateChain);

    await expect(updateUserProfile('u1', 'u1@test.com', { bio: 'Hello' })).rejects.toThrow('Permission denied');
  });

  it('passes partial updates correctly', async () => {
    const updateChain = makeUpdateChain({ error: null });
    const readBackChain = makeReadBackChain(makeProfile({ bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' }));
    mockFrom.mockReturnValueOnce(updateChain).mockReturnValueOnce(readBackChain);

    await updateUserProfile('u1', 'u1@test.com', { bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' }),
    );
  });

  it('can update only avatar_url', async () => {
    const updateChain = makeUpdateChain({ error: null });
    const readBackChain = makeReadBackChain(makeProfile({ avatar_url: 'https://cdn.test/photo.jpg' }));
    mockFrom.mockReturnValueOnce(updateChain).mockReturnValueOnce(readBackChain);

    await updateUserProfile('u1', 'u1@test.com', { avatar_url: 'https://cdn.test/photo.jpg' });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://cdn.test/photo.jpg' }),
    );
  });

  // -------------------------------------------------------------------------
  // Regressions: saves that used to "succeed" without saving
  // -------------------------------------------------------------------------
  describe('does not report success when nothing was saved', () => {
    it("throws when the update returns no error but the row didn't change (silent no-op)", async () => {
      // e.g. RLS filters the row out: PostgREST answers with no error and zero rows updated.
      mockFrom
        .mockReturnValueOnce(makeUpdateChain({ error: null }))
        .mockReturnValueOnce(makeReadBackChain(makeProfile({ display_name: 'Old Name' })));

      await expect(updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name' }))
        .rejects.toThrow(/weren't saved/i);
    });

    it('checks every field that was sent, not just the display name', async () => {
      mockFrom
        .mockReturnValueOnce(makeUpdateChain({ error: null }))
        .mockReturnValueOnce(makeReadBackChain(makeProfile({ display_name: 'New Name', username: 'old_handle' })));

      await expect(updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name', username: 'new_handle' }))
        .rejects.toThrow(/weren't saved/i);
    });

    it('succeeds when the read-back matches everything that was sent', async () => {
      mockFrom
        .mockReturnValueOnce(makeUpdateChain({ error: null }))
        .mockReturnValueOnce(makeReadBackChain(
          makeProfile({ display_name: 'New Name', username: 'new_handle', bio: '', university: 'NYU' }),
        ));

      const saved = await updateUserProfile('u1', 'u1@test.com', {
        display_name: 'New Name', username: 'new_handle', bio: '', university: 'NYU',
      });

      expect(saved).toMatchObject({ display_name: 'New Name', username: 'new_handle', university: 'NYU' });
    });
  });

  describe('username errors', () => {
    it('tells the user a taken username is taken — and saves nothing, instead of retrying without it', async () => {
      mockFrom.mockReturnValue(makeUpdateChain({
        error: { code: '23505', message: 'duplicate key value violates unique constraint "users_username_key"' },
      }));

      await expect(updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name', username: 'maya' }))
        .rejects.toThrow(/username.*already taken/i);
      expect(mockFrom).toHaveBeenCalledTimes(1); // no fallback write that drops the username
    });

    it.each([
      ['undefined_column', { code: '42703', message: 'column "username" of relation "users" does not exist' }],
      ['schema cache',     { code: 'PGRST204', message: "Could not find the 'username' column of 'users' in the schema cache" }],
    ])('explains a missing username column (%s) instead of silently dropping the username', async (_name, error) => {
      mockFrom.mockReturnValue(makeUpdateChain({ error }));

      await expect(updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name', username: 'maya' }))
        .rejects.toThrow(/003_add_username/);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('does not mistake an unrelated error that mentions "username" or "column" for a missing column', async () => {
      mockFrom.mockReturnValue(makeUpdateChain({
        error: { code: '23514', message: 'new row violates check constraint "users_username_check" on column "username"' },
      }));

      await expect(updateUserProfile('u1', 'u1@test.com', { username: 'x' }))
        .rejects.toThrow('violates check constraint');
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });
  });
});
