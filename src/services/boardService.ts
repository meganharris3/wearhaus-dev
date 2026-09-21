import { supabase } from '../lib/supabase';
import type { Board, CoverStyle, VisibilityMode } from '../types';

export async function fetchMyBoards(userId: string): Promise<Board[]> {
  const { data, error } = await supabase
    .from('boards')
    .select('id, owner_id, name, visibility, cover_style, created_at, board_items(item_id)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id:          row.id,
    ownerId:     row.owner_id,
    name:        row.name,
    visibility:  row.visibility as VisibilityMode,
    coverStyle:  row.cover_style as CoverStyle,
    createdAt:   row.created_at,
    itemIds:     (row.board_items ?? []).map((bi: any) => bi.item_id),
  }));
}

export async function createBoard(
  userId: string, name: string, visibility: VisibilityMode, coverStyle: CoverStyle,
): Promise<Board> {
  const { data, error } = await supabase
    .from('boards')
    .insert({ owner_id: userId, name, visibility, cover_style: coverStyle })
    .select('id, owner_id, name, visibility, cover_style, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, ownerId: data.owner_id, name: data.name,
    visibility: data.visibility, coverStyle: data.cover_style,
    createdAt: data.created_at, itemIds: [],
  };
}

export async function updateBoard(boardId: string, updates: Partial<Pick<Board, 'name' | 'visibility' | 'coverStyle'>>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.visibility !== undefined) payload.visibility = updates.visibility;
  if (updates.coverStyle !== undefined) payload.cover_style = updates.coverStyle;

  const { error } = await supabase.from('boards').update(payload).eq('id', boardId);
  if (error) throw new Error(error.message);
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  if (error) throw new Error(error.message);
}

export async function addItemsToBoard(boardId: string, itemIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('board_items')
    .insert(itemIds.map(itemId => ({ board_id: boardId, item_id: itemId })));
  if (error) throw new Error(error.message);
}

export async function removeItemFromBoard(boardId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('board_items')
    .delete()
    .eq('board_id', boardId)
    .eq('item_id', itemId);
  if (error) throw new Error(error.message);
}

export async function moveItemToBoard(fromBoardId: string, toBoardId: string, itemId: string): Promise<void> {
  await removeItemFromBoard(fromBoardId, itemId);
  const { error } = await supabase
    .from('board_items')
    .insert({ board_id: toBoardId, item_id: itemId });
  if (error) throw new Error(error.message);
}
