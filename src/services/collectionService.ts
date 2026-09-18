import { supabase } from '../lib/supabase';
import type { Item } from '../types';

export interface HausCollectionRow {
  id: string;
  hausId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  itemCount: number;
}

export async function fetchCollectionsForHaus(hausId: string): Promise<HausCollectionRow[]> {
  const { data, error } = await supabase
    .from('haus_collections')
    .select('id, haus_id, name, created_by, created_at, haus_collection_items(count)')
    .eq('haus_id', hausId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id:        row.id,
    hausId:    row.haus_id,
    name:      row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    itemCount: row.haus_collection_items?.[0]?.count ?? 0,
  }));
}

export async function fetchCollectionItems(collectionId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('haus_collection_items')
    .select(`item:items(id, owner_id, name, photo_url, category, size_label, price_per_day, status, location_label, owner:users(id, display_name, avatar_url))`)
    .eq('collection_id', collectionId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => row.item).filter(Boolean) as Item[];
}

export async function createCollection(hausId: string, name: string, userId: string): Promise<HausCollectionRow> {
  const { data, error } = await supabase
    .from('haus_collections')
    .insert({ haus_id: hausId, name, created_by: userId })
    .select('id, haus_id, name, created_by, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id, hausId: data.haus_id, name: data.name,
    createdBy: data.created_by, createdAt: data.created_at, itemCount: 0,
  };
}

export async function addItemsToCollection(collectionId: string, itemIds: string[], userId: string): Promise<void> {
  const { error } = await supabase
    .from('haus_collection_items')
    .insert(itemIds.map(itemId => ({ collection_id: collectionId, item_id: itemId, added_by: userId })));

  if (error) throw new Error(error.message);
}

export async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('haus_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('item_id', itemId);

  if (error) throw new Error(error.message);
}
