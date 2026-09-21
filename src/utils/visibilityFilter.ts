import type { Item, Friend, Haus } from '../types';

interface CurrentUser {
  id: string;
  friends: Friend[];
  hauses: Haus[];
}

/**
 * Returns only the items the current user is allowed to see.
 * - Own items: always visible
 * - public (or unset): always visible
 * - friends: visible only if the item's owner is in the user's friends list
 * - hauses: visible only if the item is shared (haus_visibility[hausId] === true)
 *   to at least one Haus the user belongs to
 * - private (and anything unrecognised): hidden from everyone but the owner
 *
 * Note this is a client-side filter over rows the API already returned; it
 * does not stop a client from querying items directly.
 */
export function getVisibleItems(items: Item[], currentUser: CurrentUser): Item[] {
  const friendIds = new Set(currentUser.friends.map((f) => f.id));
  const myHausIds = currentUser.hauses.map((h) => h.id);

  return items.filter((item) => {
    if (item.owner_id === currentUser.id || item.owner_id === 'me') return true;

    const vis = item.visibility ?? 'public';

    switch (vis) {
      case 'public':
        return true;
      case 'friends':
        // owner_id is always present; the joined `owner` object may not be.
        return friendIds.has(item.owner_id);
      case 'hauses':
        return myHausIds.some((hausId) => item.haus_visibility?.[hausId] === true);
      default:
        return false; // 'private' or unrecognised
    }
  });
}
