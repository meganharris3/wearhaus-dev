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
    const readBackChain = makeReadBackChain(makeProfile());
    mockFrom.mockReturnValueOnce(updateChain).mockReturnValueOnce(readBackChain);

    await updateUserProfile('u1', 'u1@test.com', { bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' }),
    );
  });

  it('can update only avatar_url', async () => {
    const updateChain = makeUpdateChain({ error: null });
    const readBackChain = makeReadBackChain(makeProfile());
    mockFrom.mockReturnValueOnce(updateChain).mockReturnValueOnce(readBackChain);

    await updateUserProfile('u1', 'u1@test.com', { avatar_url: 'https://cdn.test/photo.jpg' });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://cdn.test/photo.jpg' }),
    );
  });
});
