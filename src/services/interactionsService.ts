import { supabase } from '../lib/supabase';
import type { Comment } from '../types';

const COMMENT_SELECT = 'id, item_id, author_id, text, created_at, author:users(display_name)';

function toComment(row: any): Comment {
  return {
    id: row.id,
    itemId: row.item_id,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? 'User',
    text: row.text,
    createdAt: row.created_at,
  };
}

export async function fetchFavoriteItemIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('item_favorites').select('item_id').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r: any) => r.item_id));
}

export async function favoriteItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('item_favorites').insert({ user_id: userId, item_id: itemId });
  if (error) throw new Error(error.message);
}

export async function unfavoriteItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('item_favorites').delete().eq('user_id', userId).eq('item_id', itemId);
  if (error) throw new Error(error.message);
}

/** Returns the latest comments oldest-first, ready to display top to bottom. */
export async function fetchComments(itemId: string, opts: { limit?: number } = {}): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('item_comments')
    .select(COMMENT_SELECT)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) throw new Error(error.message);
  return (data ?? []).reverse().map(toComment);
}

export async function addComment(itemId: string, authorId: string, text: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({ item_id: itemId, author_id: authorId, text })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return toComment(data);
}
