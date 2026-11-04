import { useEffect, useMemo, useState } from 'react';
import { fetchUserProfile } from '../services/userService';
import { fetchMyItems } from '../services/itemService';
import { getVisibleItems } from '../utils/visibilityFilter';
import type { Friend, Haus, Item, UserProfile } from '../types';

/**
 * Another user's profile and the closet items the viewer is allowed to see — drafts are
 * never shown, and private/friends/hauses visibility follows the same rules as Explore.
 */
export function useVisitedProfile(
  userId: string | undefined,
  viewer: { id: string; friends: Friend[]; hauses: Haus[] },
) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [isLoading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchUserProfile(userId).catch(() => null),
      fetchMyItems(userId, 'All').catch(() => [] as Item[]),
    ]).then(([p, items]) => {
      if (cancelled) return;
      setProfile(p);
      setAllItems(items);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const items = useMemo(
    () => getVisibleItems(allItems.filter((i) => i.status !== 'draft'), viewer),
    [allItems, viewer.id, viewer.friends, viewer.hauses], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { profile, items, isLoading };
}
