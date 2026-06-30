import { supabase } from '../lib/supabase';
import type { Item } from '../types';

const ITEM_SELECT = `
  id, owner_id, name, photo_url, photo_urls, category, size_label,
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

export async function updateItem(
  id: string,
  updates: Partial<Pick<Item, 'name' | 'description' | 'photo_url' | 'photo_urls' | 'category' | 'size_label' | 'price_per_day' | 'status' | 'location_label'>>,
): Promise<Item> {
  let { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select(ITEM_SELECT)
    .single();

  if (error?.message?.includes('photo_urls')) {
    const { photo_urls, ...updatesWithout } = updates;
    ({ data, error } = await supabase
      .from('items')
      .update(updatesWithout)
      .eq('id', id)
      .select(ITEM_SELECT)
      .single());
  }

  if (error) throw new Error(error.message);
  return data as unknown as Item;
}

export async function insertItem(
  item: Pick<Item, 'name' | 'description' | 'photo_url' | 'photo_urls' | 'category' | 'size_label' | 'price_per_day' | 'status' | 'location_label'>,
  userId: string,
): Promise<Item> {
  const base = {
    name:           item.name,
    description:    item.description ?? null,
    photo_url:      item.photo_url ?? null,
    category:       item.category,
    size_label:     item.size_label,
    price_per_day:  item.price_per_day,
    status:         item.status,
    location_label: item.location_label,
    owner_id:       userId,
  };

  // Try with photo_urls array first; fall back if the column doesn't exist yet
  let { data, error } = await supabase
    .from('items')
    .insert({ ...base, photo_urls: item.photo_urls ?? [] })
    .select(ITEM_SELECT)
    .single();

  if (error?.message?.includes('photo_urls')) {
    ({ data, error } = await supabase
      .from('items')
      .insert(base)
      .select(ITEM_SELECT)
      .single());
  }

  if (error) throw new Error(error.message);
  return data as unknown as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw new Error(error.message);
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
