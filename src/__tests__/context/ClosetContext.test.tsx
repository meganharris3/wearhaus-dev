/**
 * Tests for ClosetContext (ClosetProvider + useCloset), focused on addItem.
 *
 * Covers:
 * - a signed-in user's item is replaced with the real Supabase row (real uuid)
 * - a failed Supabase insert REJECTS instead of silently keeping the fake client-side
 *   id/owner (regression: a swallowed insert failure left a phantom item in state —
 *   e.g. a Date.now()-string id — that every later action on it (favoriting, commenting)
 *   would fail against, since it isn't a real row)
 * - on that failure, the phantom item is not added to state
 * - a signed-out (guest) user keeps the local item as-is, with no Supabase call
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('../../services/itemService', () => ({
  fetchMyItems: jest.fn(),
  insertItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

let mockAuth: () => { user: { id: string } | null } = () => ({ user: { id: 'u1' } });

import * as itemService from '../../services/itemService';
import { ClosetProvider, useCloset } from '../../context/ClosetContext';
import type { Item } from '../../types';

const mockFetchMyItems = itemService.fetchMyItems as jest.Mock;
const mockInsertItem = itemService.insertItem as jest.Mock;

const localItem = (overrides: Partial<Item> = {}): Item => ({
  id: '1792615022608', // the bug: a client-side Date.now() string, not a uuid
  owner_id: 'me',
  name: 'Denim Jacket',
  category: 'jacket',
  size_label: 'M',
  price_per_day: 1200,
  status: 'available',
  location_label: 'NYU',
  ...overrides,
});

type Ctx = ReturnType<typeof useCloset>;
let ctx: Ctx;

function Capture() {
  ctx = useCloset();
  return <Text>{ctx.items.length}</Text>;
}

async function renderProvider() {
  const utils = render(<ClosetProvider><Capture /></ClosetProvider>);
  await settle();
  return utils;
}

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = () => ({ user: { id: 'u1' } });
  mockFetchMyItems.mockResolvedValue([]);
});

describe('addItem for a signed-in user', () => {
  it('replaces the local item with the real Supabase row (real id, real owner)', async () => {
    mockInsertItem.mockResolvedValue({ ...localItem(), id: 'real-uuid-1', owner_id: 'u1' });
    await renderProvider();

    await act(async () => { await ctx.addItem(localItem()); });

    expect(ctx.items).toHaveLength(1);
    expect(ctx.items[0].id).toBe('real-uuid-1');
    expect(ctx.items[0].owner_id).toBe('u1');
  });

  it('rejects when the Supabase insert fails, instead of silently keeping the fake item', async () => {
    mockInsertItem.mockRejectedValue(new Error('new row violates row-level security policy'));
    await renderProvider();

    await expect(ctx.addItem(localItem())).rejects.toThrow('new row violates row-level security policy');
  });

  it('does not add the phantom (fake-id) item to state when the insert fails', async () => {
    mockInsertItem.mockRejectedValue(new Error('insert failed'));
    await renderProvider();

    await act(async () => { await ctx.addItem(localItem()).catch(() => {}); });

    expect(ctx.items).toHaveLength(0);
  });
});

describe('addItem for a signed-out (guest) user', () => {
  it('keeps the local item as-is, with no Supabase insert', async () => {
    mockAuth = () => ({ user: null });
    await renderProvider();

    await act(async () => { await ctx.addItem(localItem()); });

    expect(mockInsertItem).not.toHaveBeenCalled();
    expect(ctx.items).toHaveLength(1);
    expect(ctx.items[0].id).toBe('1792615022608');
  });
});
