/**
 * Unit tests for src/services/userService.ts
 */

const mockFrom = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

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
      'id, display_name, username, avatar_url, university, bio, items_listed, rentals_completed, rating'
    );
  });
});

// ---------------------------------------------------------------------------
// updateUserProfile
// ---------------------------------------------------------------------------
describe('updateUserProfile', () => {
  function makeUpsertChain(result: { error: unknown }) {
    const chain: any = {};
    chain.upsert = jest.fn().mockResolvedValue(result);
    return chain;
  }

  it('resolves without error on successful upsert', async () => {
    const chain = makeUpsertChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await expect(updateUserProfile('u1', 'u1@test.com', { display_name: 'New Name' })).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', email: 'u1@test.com', display_name: 'New Name' }),
      { onConflict: 'id' },
    );
  });

  it('throws when Supabase returns an error', async () => {
    const chain = makeUpsertChain({ error: { message: 'Permission denied' } });
    mockFrom.mockReturnValue(chain);

    await expect(updateUserProfile('u1', 'u1@test.com', { bio: 'Hello' })).rejects.toThrow('Permission denied');
  });

  it('passes partial updates correctly', async () => {
    const chain = makeUpsertChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await updateUserProfile('u1', 'u1@test.com', { bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' }),
      { onConflict: 'id' },
    );
  });

  it('can update only avatar_url', async () => {
    const chain = makeUpsertChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await updateUserProfile('u1', 'u1@test.com', { avatar_url: 'https://cdn.test/photo.jpg' });

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: 'https://cdn.test/photo.jpg' }),
      { onConflict: 'id' },
    );
  });
});
