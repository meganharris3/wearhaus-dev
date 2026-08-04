import type { Item, Friend, Haus } from '../types';

interface CurrentUser {
  id: string;
  friends: Friend[];
  hauses: Haus[];
}

/**
 * Returns only the items the current user is allowed to see.
 * - Own items: always visible
 * - public: always visible
 * - friends: visible only if item owner is in the user's friends list
 * - hauses: visible only if item shares at least one Haus with the user
 */
export function getVisibleItems(items: Item[], currentUser: CurrentUser): Item[] {
  const friendIds = new Set(currentUser.friends.map((f) => f.id));
  const hausIds = new Set(currentUser.hauses.map((h) => h.id));

  return items.filter((item) => {
    if (item.owner_id === currentUser.id || item.owner_id === 'me') return true;

    const vis = item.visibility ?? 'public';

    if (vis === 'public') return true;

    if (vis === 'friends') {
      return item.owner?.id ? friendIds.has(item.owner.id) : false;
    }

    if (vis === 'hauses') {
      return item.owner?.id ? hausIds.has(item.owner.id) : false;
    }

    if (vis === 'private') {
      return false;
    }

    return false;
  });
}
