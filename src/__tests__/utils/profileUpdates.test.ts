import { buildProfileUpdates, normalizeUsername, deriveUsername } from '../../utils/profileUpdates';
import type { UserProfile } from '../../types';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  display_name: 'Maya Chen',
  username: 'maya',
  items_listed: 0,
  rentals_completed: 0,
  rating: 0,
  ...overrides,
});

const form = (overrides: Partial<Parameters<typeof buildProfileUpdates>[0]> = {}) => ({
  profile: profile(),
  name: 'Maya Chen',
  username: 'maya',
  location: '',
  bio: '',
  ...overrides,
});

describe('normalizeUsername', () => {
  it('strips a leading @, turns spaces into underscores and lowercases', () => {
    expect(normalizeUsername('  @Maya Chen  ')).toBe('maya_chen');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeUsername('   ')).toBe('');
    expect(normalizeUsername('@')).toBe('');
  });
});

describe('deriveUsername', () => {
  it('lowercases and removes whitespace, matching the handle the profile screen pre-fills', () => {
    expect(deriveUsername('Maya Chen')).toBe('mayachen');
  });
});

describe('buildProfileUpdates', () => {
  it('always sends the trimmed display name, location and bio', () => {
    const updates = buildProfileUpdates(form({ name: '  Maya C.  ', location: ' NYU ', bio: ' hi ' }));
    expect(updates).toMatchObject({ display_name: 'Maya C.', university: 'NYU', bio: 'hi' });
  });

  describe('username', () => {
    it('is left out of a name-only edit when the username is unchanged', () => {
      const updates = buildProfileUpdates(form({ name: 'Maya C.' }));
      expect(updates).not.toHaveProperty('username');
    });

    it('is sent, normalised, when the user changed it', () => {
      const updates = buildProfileUpdates(form({ username: '  @Maya_New  ' }));
      expect(updates.username).toBe('maya_new');
    });

    it('is left out when the user cleared the field (never blank a username)', () => {
      expect(buildProfileUpdates(form({ username: '   ' }))).not.toHaveProperty('username');
      expect(buildProfileUpdates(form({ username: '@' }))).not.toHaveProperty('username');
    });

    it('does not claim the auto-suggested handle when the profile has no username yet', () => {
      // The screen pre-fills "mayachen" from the display name. Leaving it untouched must not
      // silently claim that handle (it may belong to someone else, which would fail the save).
      const noUsername = profile({ username: undefined });
      const updates = buildProfileUpdates(form({ profile: noUsername, username: 'mayachen', name: 'Maya C.' }));
      expect(updates).not.toHaveProperty('username');
    });

    it('is sent when a profile with no username picks one on purpose', () => {
      const noUsername = profile({ username: undefined });
      const updates = buildProfileUpdates(form({ profile: noUsername, username: 'maya_c' }));
      expect(updates.username).toBe('maya_c');
    });

    it('is sent when the profile has not loaded yet but the user typed one', () => {
      const updates = buildProfileUpdates(form({ profile: null, username: 'maya' }));
      expect(updates.username).toBe('maya');
    });
  });

  describe('avatar', () => {
    it('is included only when there is a new one', () => {
      expect(buildProfileUpdates(form())).not.toHaveProperty('avatar_url');
      expect(buildProfileUpdates(form({ avatarUrl: null }))).not.toHaveProperty('avatar_url');
      expect(buildProfileUpdates(form({ avatarUrl: 'https://cdn/a.png' })).avatar_url).toBe('https://cdn/a.png');
    });
  });
});
