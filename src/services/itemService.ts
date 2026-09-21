import { supabase } from '../lib/supabase';
import type { Item } from '../types';
import { pageRange, type PageOpts } from './pagination';

const ITEM_SELECT = `
  id, owner_id, name, photo_url, photo_urls, category, size_label,
  price_per_day, price_per_week, list_for_rental, max_duration, pickup_method,
  condition, occasion_tags,
  status, location_label, description, created_at,
  visibility, haus_visibility,
  owner:users(id, display_name, avatar_url, rating, university)
`;

export async function fetchFeedItems(category?: string, opts: PageOpts = {}): Promise<Item[]> {
  const [from, to] = pageRange(opts, 20);
  let query = supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);
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
}, opts: PageOpts = {}): Promise<Item[]> {
  const [from, to] = pageRange(opts, 30);
  let q = supabase
    .from('items')
    .select(ITEM_SELECT)
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);
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
  updates: Partial<Pick<Item, 'name' | 'description' | 'photo_url' | 'photo_urls' | 'category' | 'size_label' | 'price_per_day' | 'list_for_rental' | 'max_duration' | 'pickup_method' | 'condition' | 'occasion_tags' | 'status' | 'location_label' | 'visibility' | 'haus_visibility'>>,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select(ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Item;
}

export async function insertItem(
  item: Pick<Item, 'name' | 'description' | 'photo_url' | 'photo_urls' | 'category' | 'size_label' | 'price_per_day' | 'list_for_rental' | 'max_duration' | 'pickup_method' | 'condition' | 'occasion_tags' | 'status' | 'location_label' | 'visibility' | 'haus_visibility'>,
  userId: string,
): Promise<Item> {
  const base = {
    name:            item.name,
    description:     item.description ?? null,
    photo_url:       item.photo_url ?? null,
    category:        item.category,
    size_label:      item.size_label,
    price_per_day:   item.price_per_day,
    list_for_rental: item.list_for_rental ?? false,
    max_duration:    item.max_duration ?? null,
    pickup_method:   item.pickup_method ?? null,
    condition:       item.condition ?? null,
    occasion_tags:   item.occasion_tags ?? [],
    status:          item.status,
    location_label:  item.location_label,
    visibility:      item.visibility ?? 'public',
    haus_visibility: item.haus_visibility ?? {},
    owner_id:        userId,
  };

  const { data, error } = await supabase
    .from('items')
    .insert({ ...base, photo_urls: item.photo_urls ?? [] })
    .select(ITEM_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const { data, error } = await supabase.from('items').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Item could not be deleted — check Supabase RLS: items table needs a DELETE policy with auth.uid() = owner_id');
}

export async function fetchMyItems(userId: string, tab: string, opts: PageOpts = {}): Promise<Item[]> {
  const [from, to] = pageRange(opts, 50);
  let q = supabase
    .from('items')
    .select(ITEM_SELECT)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);
  if (tab === 'Listed')   q = q.eq('status', 'available');
  if (tab === 'Lent Out') q = q.eq('status', 'lent');
  if (tab === 'Wash')     q = q.eq('status', 'wash');
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Item[];
}
