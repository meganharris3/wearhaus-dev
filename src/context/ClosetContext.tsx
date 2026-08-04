import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchMyItems, insertItem, updateItem as updateItemRemote, deleteItem as deleteItemRemote } from '../services/itemService';
import type { Item } from '../types';

const GUEST_KEY = 'closet_items_guest';

function storageKey(userId: string | undefined) {
  return userId ? `closet_items_${userId}` : GUEST_KEY;
}

interface ClosetContextValue {
  items: Item[];
  addItem: (item: Item) => Promise<void>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  isLoading: boolean;
}

const ClosetContext = createContext<ClosetContextValue | null>(null);

export function ClosetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems]       = useState<Item[]>([]);
  const [isLoading, setLoading] = useState(true);

  const key = storageKey(user?.id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (user?.id) {
          // Logged-in users always get their real Supabase items — never seed/cache data.
          // Clear any stale AsyncStorage cache that might contain old mock items.
          await AsyncStorage.removeItem(key).catch(() => {});
          const remote = await fetchMyItems(user.id, 'All').catch(() => null);
          if (!cancelled) setItems(remote ?? []);
        } else {
          const raw = await AsyncStorage.getItem(key);
          if (!cancelled) setItems(raw ? (JSON.parse(raw) as Item[]) : []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [key, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addItem(item: Item) {
    let finalItem = item;

    // Save to Supabase if logged in
    if (user?.id) {
      try {
        const inserted = await insertItem(
          {
            name:            item.name,
            description:     item.description,
            photo_url:       item.photo_url,
            photo_urls:      item.photo_urls,
            category:        item.category,
            size_label:      item.size_label,
            price_per_day:   item.price_per_day,
            list_for_rental: item.list_for_rental,
            max_duration:    item.max_duration,
            pickup_method:   item.pickup_method,
            condition:       item.condition,
            occasion_tags:   item.occasion_tags,
            status:          item.status,
            location_label:  item.location_label,
            visibility:      item.visibility,
            haus_visibility: item.haus_visibility,
          },
          user.id,
        );
        // Use Supabase-returned item for the real UUID, but keep photo_urls from the
        // local item if the DB column doesn't exist yet (insertItem retries without it).
        finalItem = {
          ...inserted,
          photo_urls:      inserted.photo_urls?.length ? inserted.photo_urls : item.photo_urls,
          visibility:      inserted.visibility      ?? item.visibility,
          haus_visibility: inserted.haus_visibility ?? item.haus_visibility,
          list_for_rental: inserted.list_for_rental ?? item.list_for_rental,
          max_duration:    inserted.max_duration    ?? item.max_duration,
          pickup_method:   inserted.pickup_method   ?? item.pickup_method,
          condition:       inserted.condition       ?? item.condition,
          occasion_tags:   inserted.occasion_tags   ?? item.occasion_tags,
        };
      } catch {
        // keep local item; photo URL already set by caller
      }
    }

    const updated = [finalItem, ...items];
    setItems(updated);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // cache write failure is non-fatal
    }
  }

  async function deleteItem(id: string) {
    if (user?.id) {
      await deleteItemRemote(id);
    }
    const newItems = items.filter((i) => i.id !== id);
    setItems(newItems);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newItems));
    } catch {}
  }

  async function updateItem(updated: Item) {
    if (user?.id) {
      try {
        await updateItemRemote(updated.id, {
          name:            updated.name,
          description:     updated.description,
          photo_url:       updated.photo_url,
          photo_urls:      updated.photo_urls,
          category:        updated.category,
          size_label:      updated.size_label,
          price_per_day:   updated.price_per_day,
          list_for_rental: updated.list_for_rental,
          max_duration:    updated.max_duration,
          pickup_method:   updated.pickup_method,
          condition:       updated.condition,
          occasion_tags:   updated.occasion_tags,
          status:          updated.status,
          location_label:  updated.location_label,
          visibility:      updated.visibility,
          haus_visibility: updated.haus_visibility,
        });
      } catch {
        // keep local changes even if remote fails
      }
    }
    const newItems = items.map((i) => (i.id === updated.id ? updated : i));
    setItems(newItems);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(newItems));
    } catch {}
  }

  return (
    <ClosetContext.Provider value={{ items, addItem, updateItem, deleteItem, isLoading }}>
      {children}
    </ClosetContext.Provider>
  );
}

export function useCloset(): ClosetContextValue {
  const ctx = useContext(ClosetContext);
  if (!ctx) throw new Error('useCloset must be used within ClosetProvider');
  return ctx;
}
