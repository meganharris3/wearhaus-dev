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
      'id, display_name, avatar_url, university, bio, items_listed, rentals_completed, rating'
    );
  });
});

// ---------------------------------------------------------------------------
// updateUserProfile
// ---------------------------------------------------------------------------
describe('updateUserProfile', () => {
  function makeUpdateChain(result: { error: unknown }) {
    const chain: any = {};
    chain.update = jest.fn().mockReturnValue(chain);
    chain.eq     = jest.fn().mockReturnValue(chain);
    chain.then   = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  }

  it('resolves without error on successful update', async () => {
    const chain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await expect(updateUserProfile('u1', { display_name: 'New Name' })).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(chain.update).toHaveBeenCalledWith({ display_name: 'New Name' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = makeUpdateChain({ error: { message: 'Permission denied' } });
    mockFrom.mockReturnValue(chain);

    await expect(updateUserProfile('u1', { bio: 'Hello' })).rejects.toThrow('Permission denied');
  });

  it('passes partial updates correctly', async () => {
    const chain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const updates = { bio: 'Fashion lover', avatar_url: 'https://img.test/a.png' };
    await updateUserProfile('u1', updates);

    expect(chain.update).toHaveBeenCalledWith(updates);
  });

  it('can update only avatar_url', async () => {
    const chain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValue(chain);

    await updateUserProfile('u1', { avatar_url: 'https://cdn.test/photo.jpg' });

    expect(chain.update).toHaveBeenCalledWith({ avatar_url: 'https://cdn.test/photo.jpg' });
  });
});
