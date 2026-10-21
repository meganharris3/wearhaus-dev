import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchFavoriteItemIds,
  favoriteItem,
  unfavoriteItem,
  fetchComments,
  addComment as addCommentRemote,
} from '../services/interactionsService';
import { fetchItemsByIds } from '../services/itemService';
import type { Comment, Item } from '../types';

interface InteractionsContextValue {
  isFavorited: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => Promise<void>;
  favoriteCount: (itemId: string) => number;
  /** Full Item rows for everything the signed-in user has favorited. */
  favoritedItems: Item[];
  favoritedItemsLoading: boolean;
  getComments: (itemId: string) => Comment[];
  /** Fetches the latest comments for an item into the cache (call when its detail opens). */
  loadComments: (itemId: string) => Promise<void>;
  addComment: (itemId: string, text: string) => Promise<void>;
}

const InteractionsContext = createContext<InteractionsContextValue | null>(null);

export function InteractionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [commentsByItem, setCommentsByItem] = useState<Record<string, Comment[]>>({});
  const [favoritedItems, setFavoritedItems] = useState<Item[]>([]);
  const [favoritedItemsLoading, setFavoritedItemsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setFavoritedIds(new Set()); return; }
    fetchFavoriteItemIds(userId)
      .then((ids) => { if (!cancelled) setFavoritedIds(ids); })
      .catch((e) => console.warn('Failed to load favorites', e));
    return () => { cancelled = true; };
  }, [userId]);

  // A Set gets a new identity on every toggle even when its contents are unchanged, so key the
  // refetch on the sorted, joined ids instead — otherwise every favorite/unfavorite would
  // re-fetch the full item list even when nothing about the id set actually changed.
  const favoritedIdsKey = useMemo(() => Array.from(favoritedIds).sort().join(','), [favoritedIds]);

  useEffect(() => {
    let cancelled = false;
    const ids = favoritedIdsKey ? favoritedIdsKey.split(',') : [];
    if (ids.length === 0) { setFavoritedItems([]); return; }
    setFavoritedItemsLoading(true);
    fetchItemsByIds(ids)
      .then((items) => { if (!cancelled) setFavoritedItems(items); })
      .catch((e) => console.warn('Failed to load favorited items', e))
      .finally(() => { if (!cancelled) setFavoritedItemsLoading(false); });
    return () => { cancelled = true; };
  }, [favoritedIdsKey]);

  const isFavorited = useCallback((itemId: string) => favoritedIds.has(itemId), [favoritedIds]);

  const setFavorited = useCallback((itemId: string, on: boolean) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!userId) return;
    const willFavorite = !favoritedIds.has(itemId);
    setFavorited(itemId, willFavorite); // optimistic
    try {
      if (willFavorite) await favoriteItem(userId, itemId);
      else await unfavoriteItem(userId, itemId);
    } catch (e) {
      setFavorited(itemId, !willFavorite); // roll back
      console.warn('Failed to update favorite', e);
    }
  }, [userId, favoritedIds, setFavorited]);

  const favoriteCount = useCallback((itemId: string) => {
    return favoritedIds.has(itemId) ? 1 : 0;
  }, [favoritedIds]);

  const getComments = useCallback(
    (itemId: string) => commentsByItem[itemId] ?? [],
    [commentsByItem],
  );

  const loadComments = useCallback(async (itemId: string) => {
    const comments = await fetchComments(itemId);
    setCommentsByItem((prev) => ({ ...prev, [itemId]: comments }));
  }, []);

  const addComment = useCallback(async (itemId: string, text: string) => {
    const trimmed = text.trim();
    if (!userId || !trimmed) return;
    const created = await addCommentRemote(itemId, userId, trimmed);
    setCommentsByItem((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), created] }));
  }, [userId]);

  return (
    <InteractionsContext.Provider value={{
      isFavorited, toggleFavorite, favoriteCount,
      favoritedItems, favoritedItemsLoading,
      getComments, loadComments, addComment,
    }}>
      {children}
    </InteractionsContext.Provider>
  );
}

export function useInteractions() {
  const ctx = useContext(InteractionsContext);
  if (!ctx) throw new Error('useInteractions must be used within InteractionsProvider');
  return ctx;
}
