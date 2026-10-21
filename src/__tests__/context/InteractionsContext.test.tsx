/**
 * Tests for InteractionsContext (InteractionsProvider + useInteractions)
 *
 * Covers:
 * - favoritedIds load on mount; isFavorited / favoriteCount reflect them
 * - toggleFavorite is optimistic and rolls back on failure
 * - favoritedItems: full Item rows for the favorited ids, refetched when the
 *   id set changes, and not refetched on every render
 * - comments: lazy load + append
 * - useInteractions throws outside the provider
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../../services/interactionsService', () => ({
  fetchFavoriteItemIds: jest.fn(),
  favoriteItem: jest.fn(),
  unfavoriteItem: jest.fn(),
  fetchComments: jest.fn(),
  addComment: jest.fn(),
}));

jest.mock('../../services/itemService', () => ({
  fetchItemsByIds: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

let mockAuth: () => { user: { id: string } | null } = () => ({ user: { id: 'u1' } });

import * as interactionsService from '../../services/interactionsService';
import * as itemService from '../../services/itemService';
import { InteractionsProvider, useInteractions } from '../../context/InteractionsContext';
import type { Item } from '../../types';

const mockFetchFavoriteItemIds = interactionsService.fetchFavoriteItemIds as jest.Mock;
const mockFavoriteItem = interactionsService.favoriteItem as jest.Mock;
const mockUnfavoriteItem = interactionsService.unfavoriteItem as jest.Mock;
const mockFetchComments = interactionsService.fetchComments as jest.Mock;
const mockAddComment = interactionsService.addComment as jest.Mock;
const mockFetchItemsByIds = itemService.fetchItemsByIds as jest.Mock;

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'i1',
  owner_id: 'owner',
  name: 'Denim Jacket',
  category: 'jacket',
  size_label: 'M',
  price_per_day: 1200,
  status: 'available',
  location_label: 'NYU',
  ...overrides,
});

type Ctx = ReturnType<typeof useInteractions>;
let ctx: Ctx;

function Capture() {
  ctx = useInteractions();
  return <Text testID="favCount">{ctx.favoritedItems.length}</Text>;
}

async function renderProvider() {
  const utils = render(<InteractionsProvider><Capture /></InteractionsProvider>);
  await settle();
  return utils;
}

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = () => ({ user: { id: 'u1' } });
  mockFetchFavoriteItemIds.mockResolvedValue(new Set());
  mockFetchItemsByIds.mockResolvedValue([]);
  mockFavoriteItem.mockResolvedValue(undefined);
  mockUnfavoriteItem.mockResolvedValue(undefined);
  mockFetchComments.mockResolvedValue([]);
  mockAddComment.mockResolvedValue(undefined);
});

describe('loading favorites', () => {
  it('loads favorited ids for the signed-in user on mount', async () => {
    mockFetchFavoriteItemIds.mockResolvedValue(new Set(['i1', 'i2']));
    await renderProvider();

    expect(mockFetchFavoriteItemIds).toHaveBeenCalledWith('u1');
    expect(ctx.isFavorited('i1')).toBe(true);
    expect(ctx.isFavorited('i3')).toBe(false);
  });

  it('does nothing when signed out', async () => {
    mockAuth = () => ({ user: null });
    await renderProvider();

    expect(mockFetchFavoriteItemIds).not.toHaveBeenCalled();
    expect(ctx.isFavorited('i1')).toBe(false);
  });
});

describe('toggleFavorite', () => {
  it('favorites optimistically, then persists', async () => {
    await renderProvider();

    await act(async () => { await ctx.toggleFavorite('i1'); });

    expect(mockFavoriteItem).toHaveBeenCalledWith('u1', 'i1');
    expect(ctx.isFavorited('i1')).toBe(true);
    expect(ctx.favoriteCount('i1')).toBe(1);
  });

  it('unfavorites when already favorited', async () => {
    mockFetchFavoriteItemIds.mockResolvedValue(new Set(['i1']));
    await renderProvider();

    await act(async () => { await ctx.toggleFavorite('i1'); });

    expect(mockUnfavoriteItem).toHaveBeenCalledWith('u1', 'i1');
    expect(ctx.isFavorited('i1')).toBe(false);
  });

  it('rolls back the optimistic update when the write fails', async () => {
    mockFavoriteItem.mockRejectedValue(new Error('RLS violation'));
    await renderProvider();

    await act(async () => { await ctx.toggleFavorite('i1'); });

    expect(ctx.isFavorited('i1')).toBe(false);
  });
});

describe('favoritedItems', () => {
  it('fetches full item rows for the favorited ids', async () => {
    mockFetchFavoriteItemIds.mockResolvedValue(new Set(['i1', 'i2']));
    mockFetchItemsByIds.mockResolvedValue([makeItem({ id: 'i1' }), makeItem({ id: 'i2' })]);

    await renderProvider();

    expect(mockFetchItemsByIds).toHaveBeenCalledWith(expect.arrayContaining(['i1', 'i2']));
    expect(ctx.favoritedItems.map((i) => i.id).sort()).toEqual(['i1', 'i2']);
  });

  it('does not query item rows when there are no favorites', async () => {
    await renderProvider();

    expect(mockFetchItemsByIds).not.toHaveBeenCalled();
    expect(ctx.favoritedItems).toEqual([]);
  });

  it('refetches after a favorite is added', async () => {
    mockFetchItemsByIds.mockResolvedValue([]);
    await renderProvider();
    expect(mockFetchItemsByIds).not.toHaveBeenCalled();

    mockFetchItemsByIds.mockResolvedValue([makeItem({ id: 'i1' })]);
    await act(async () => { await ctx.toggleFavorite('i1'); });

    expect(mockFetchItemsByIds).toHaveBeenCalledWith(['i1']);
    expect(ctx.favoritedItems.map((i) => i.id)).toEqual(['i1']);
  });

  it('does not refetch again on an unrelated re-render', async () => {
    mockFetchFavoriteItemIds.mockResolvedValue(new Set(['i1']));
    mockFetchItemsByIds.mockResolvedValue([makeItem({ id: 'i1' })]);
    const { rerender } = await renderProvider();
    expect(mockFetchItemsByIds).toHaveBeenCalledTimes(1);

    rerender(<InteractionsProvider><Capture /></InteractionsProvider>);
    await settle();

    expect(mockFetchItemsByIds).toHaveBeenCalledTimes(1);
  });
});

describe('comments', () => {
  it('starts with no comments cached for an item', async () => {
    await renderProvider();
    expect(ctx.getComments('i1')).toEqual([]);
  });

  it('loadComments fetches and caches them', async () => {
    mockFetchComments.mockResolvedValue([
      { id: 'c1', itemId: 'i1', authorId: 'u2', authorName: 'Jo', text: 'nice', createdAt: '2026-01-01' },
    ]);
    await renderProvider();

    await act(async () => { await ctx.loadComments('i1'); });

    expect(ctx.getComments('i1')).toHaveLength(1);
  });

  it('addComment appends the real returned row', async () => {
    mockAddComment.mockResolvedValue(
      { id: 'c2', itemId: 'i1', authorId: 'u1', authorName: 'Me', text: 'love it', createdAt: '2026-01-02' },
    );
    await renderProvider();

    await act(async () => { await ctx.addComment('i1', 'love it'); });

    expect(mockAddComment).toHaveBeenCalledWith('i1', 'u1', 'love it');
    expect(ctx.getComments('i1')).toEqual([
      { id: 'c2', itemId: 'i1', authorId: 'u1', authorName: 'Me', text: 'love it', createdAt: '2026-01-02' },
    ]);
  });
});

describe('useInteractions', () => {
  it('throws when used outside InteractionsProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Naked() { useInteractions(); return null; }
    expect(() => render(<Naked />)).toThrow('useInteractions must be used within InteractionsProvider');
    consoleSpy.mockRestore();
  });
});
