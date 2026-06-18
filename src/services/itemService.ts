import { supabase } from '../lib/supabase';
import type { Item } from '../types';

const ITEM_SELECT = `
  id, name, photo_url, category, size_label,
  price_per_day, price_per_week, status, location_label, description, created_at,
  owner:users(id, display_name, avatar_url, rating, university)
`;

export async function fetchFeedItems(category?: string): Promise<Item[]> {
  let query = supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(20);
  if (category && category !== 'All') {
    query = query.ilike('category', `%${category}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Item[];
}

export async function searchItems(params: {
  query?: string;
  size?: string;
  category?: string;
  maxPrice?: number;
}): Promise<Item[]> {
  let q = supabase
    .from('items')
    .select(ITEM_SELECT)
    .order('created_at', { ascending: false })
    .limit(30);
  if (params.query)    q = q.ilike('name', `%${params.query}%`);
  if (params.size)     q = q.eq('size_label', params.size);
  if (params.category) q = q.ilike('category', `%${params.category}%`);
  if (params.maxPrice) q = q.lte('price_per_day', params.maxPrice);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Item[];
}

export async function fetchItemById(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Item;
}

export async function fetchMyItems(userId: string, tab: string): Promise<Item[]> {
  let q = supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (tab === 'Listed')   q = q.eq('status', 'available');
  if (tab === 'Lent Out') q = q.eq('status', 'lent');
  if (tab === 'Wash')     q = q.eq('status', 'wash');
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Item[];
}
