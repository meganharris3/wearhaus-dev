import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Comment } from '../types';

interface InteractionsContextValue {
  isFavorited: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => void;
  favoriteCount: (itemId: string) => number;
  getComments: (itemId: string) => Comment[];
  addComment: (itemId: string, text: string) => void;
}

const InteractionsContext = createContext<InteractionsContextValue | null>(null);

export function InteractionsProvider({ children }: { children: React.ReactNode }) {
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);

  const isFavorited = useCallback((itemId: string) => favoritedIds.has(itemId), [favoritedIds]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const favoriteCount = useCallback((itemId: string) => {
    return favoritedIds.has(itemId) ? 1 : 0;
  }, [favoritedIds]);

  const getComments = useCallback(
    (itemId: string) => comments.filter((c) => c.itemId === itemId),
    [comments],
  );

  const addComment = useCallback((itemId: string, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      itemId,
      authorId: 'me',
      authorName: 'You',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
  }, []);

  return (
    <InteractionsContext.Provider value={{ isFavorited, toggleFavorite, favoriteCount, getComments, addComment }}>
      {children}
    </InteractionsContext.Provider>
  );
}

export function useInteractions() {
  const ctx = useContext(InteractionsContext);
  if (!ctx) throw new Error('useInteractions must be used within InteractionsProvider');
  return ctx;
}
