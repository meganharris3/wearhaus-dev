/**
 * Unit tests for src/services/boardService.ts
 */

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'limit', 'insert', 'delete', 'update'];
  methods.forEach((m) => { chain[m] = jest.fn().mockReturnValue(chain); });
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

import {
  fetchMyBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  addItemsToBoard,
  removeItemFromBoard,
  moveItemToBoard,
} from '../../services/boardService';

beforeEach(() => { jest.clearAllMocks(); });

describe('fetchMyBoards', () => {
  it('queries boards by owner, newest first, and maps rows', async () => {
    const chain = makeChain({
      data: [{
        id: 'b1', owner_id: 'u1', name: 'Summer', visibility: 'friends', cover_style: 'stack',
        created_at: '2026-01-01', board_items: [{ item_id: 'i1' }, { item_id: 'i2' }],
      }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await fetchMyBoards('u1');

    expect(mockFrom).toHaveBeenCalledWith('boards');
    expect(chain.eq).toHaveBeenCalledWith('owner_id', 'u1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual([{
      id: 'b1', ownerId: 'u1', name: 'Summer', visibility: 'friends', coverStyle: 'stack',
      createdAt: '2026-01-01', itemIds: ['i1', 'i2'],
    }]);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchMyBoards('u1')).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(fetchMyBoards('u1')).rejects.toThrow('DB error');
  });
});

describe('createBoard', () => {
  it('inserts the board and returns it with no items', async () => {
    const chain = makeChain({
      data: { id: 'b1', owner_id: 'u1', name: 'Summer', visibility: 'private', cover_style: 'mosaic', created_at: '2026-01-01' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await createBoard('u1', 'Summer', 'private', 'mosaic');

    expect(chain.insert).toHaveBeenCalledWith({ owner_id: 'u1', name: 'Summer', visibility: 'private', cover_style: 'mosaic' });
    expect(result.id).toBe('b1');
    expect(result.itemIds).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'RLS violation' } }));
    await expect(createBoard('u1', 'x', 'private', 'mosaic')).rejects.toThrow('RLS violation');
  });
});

describe('updateBoard', () => {
  it('updates only the provided fields, mapping coverStyle to cover_style', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await updateBoard('b1', { name: 'Fall', coverStyle: 'single' });

    expect(chain.update).toHaveBeenCalledWith({ name: 'Fall', cover_style: 'single' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(updateBoard('b1', { name: 'x' })).rejects.toThrow('nope');
  });
});

describe('deleteBoard', () => {
  it('deletes by id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await deleteBoard('b1');

    expect(mockFrom).toHaveBeenCalledWith('boards');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'b1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(deleteBoard('b1')).rejects.toThrow('nope');
  });
});

describe('addItemsToBoard', () => {
  it('bulk inserts one row per item id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await addItemsToBoard('b1', ['i1', 'i2']);

    expect(mockFrom).toHaveBeenCalledWith('board_items');
    expect(chain.insert).toHaveBeenCalledWith([
      { board_id: 'b1', item_id: 'i1' },
      { board_id: 'b1', item_id: 'i2' },
    ]);
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'duplicate key' } }));
    await expect(addItemsToBoard('b1', ['i1'])).rejects.toThrow('duplicate key');
  });
});

describe('removeItemFromBoard', () => {
  it('deletes by board_id and item_id', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await removeItemFromBoard('b1', 'i1');

    expect(chain.eq).toHaveBeenCalledWith('board_id', 'b1');
    expect(chain.eq).toHaveBeenCalledWith('item_id', 'i1');
  });

  it('throws on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
    await expect(removeItemFromBoard('b1', 'i1')).rejects.toThrow('nope');
  });
});

describe('moveItemToBoard', () => {
  it('deletes from the source board then inserts into the destination', async () => {
    const del = makeChain({ data: null, error: null });
    const ins = makeChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(del).mockReturnValueOnce(ins);

    await moveItemToBoard('b1', 'b2', 'i1');

    expect(del.delete).toHaveBeenCalled();
    expect(del.eq).toHaveBeenCalledWith('board_id', 'b1');
    expect(del.eq).toHaveBeenCalledWith('item_id', 'i1');
    expect(ins.insert).toHaveBeenCalledWith({ board_id: 'b2', item_id: 'i1' });
  });

  it('throws if the insert into the destination fails', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: null, error: null }))
      .mockReturnValueOnce(makeChain({ data: null, error: { message: 'insert failed' } }));
    await expect(moveItemToBoard('b1', 'b2', 'i1')).rejects.toThrow('insert failed');
  });
});
