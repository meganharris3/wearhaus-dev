import type { UserProfile } from '../types';

export type ProfileUpdates = Partial<
  Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'avatar_url' | 'university'>
>;

/** '  @Maya Chen ' -> 'maya_chen'. Returns '' for blank input. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase();
}

/** The handle the profile screen suggests when a profile has no username: 'Maya Chen' -> 'mayachen'. */
export function deriveUsername(displayName: string): string {
  return displayName.toLowerCase().replace(/\s+/g, '');
}

/**
 * Turns the profile edit form into the update to send.
 *
 * The username is only included when the user actually changed it (and didn't
 * blank it). The screen pre-fills a suggested handle for profiles that have no
 * username; sending that back on every save would silently claim a handle the
 * user never chose, and `users.username` is UNIQUE — so a collision would fail
 * an edit that only touched the display name.
 */
export function buildProfileUpdates(form: {
  profile: UserProfile | null;
  name: string;
  username: string;
  location: string;
  bio: string;
  /** Avatar URL to send (existing or newly uploaded); omitted when there is none. */
  avatarUrl?: string | null;
}): ProfileUpdates {
  const nextUsername = normalizeUsername(form.username);
  const prefilledUsername = normalizeUsername(
    form.profile?.username ?? deriveUsername(form.profile?.display_name ?? ''),
  );

  return {
    display_name: form.name.trim(),
    university: form.location.trim(),
    bio: form.bio.trim(),
    ...(nextUsername && nextUsername !== prefilledUsername ? { username: nextUsername } : {}),
    ...(form.avatarUrl ? { avatar_url: form.avatarUrl } : {}),
  };
}
