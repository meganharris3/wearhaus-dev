import React, { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchCollectionsForHaus, createCollection as createCollectionRemote,
  addItemsToCollection as addItemsRemote, removeItemFromCollection as removeItemRemote,
  type HausCollectionRow,
} from '../services/collectionService';

export interface HausCollection {
  id: string;
  hausId: string;
  name: string;
  itemIds: string[]; // populated lazily by fetchCollectionItems in the detail screen
  createdBy: string;
  createdAt: string;
  itemCount: number;
}

function toCollection(row: HausCollectionRow): HausCollection {
  return { ...row, itemIds: [] };
}

interface HausCollectionsContextValue {
  collectionsByHaus: Record<string, HausCollection[]>;
  isLoading: boolean;
  loadCollectionsForHaus: (hausId: string) => Promise<void>;
  getCollectionsForHaus: (hausId: string) => HausCollection[];
  getCollectionById: (id: string) => HausCollection | undefined;
  createHausCollection: (hausId: string, name: string) => Promise<HausCollection>;
  addItemsToCollection: (collectionId: string, itemIds: string[]) => Promise<void>;
  removeItemFromCollection: (collectionId: string, itemId: string) => Promise<void>;
}

const HausCollectionsContext = createContext<HausCollectionsContextValue | null>(null);

export function HausCollectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collectionsByHaus, setCollectionsByHaus] = useState<Record<string, HausCollection[]>>({});
  const [isLoading, setLoading] = useState(false);

  const loadCollectionsForHaus = useCallback(async (hausId: string) => {
    setLoading(true);
    try {
      const rows = await fetchCollectionsForHaus(hausId);
      setCollectionsByHaus(prev => ({ ...prev, [hausId]: rows.map(toCollection) }));
    } finally {
      setLoading(false);
    }
  }, []);

  function getCollectionsForHaus(hausId: string): HausCollection[] {
    return collectionsByHaus[hausId] ?? [];
  }

  function getCollectionById(id: string): HausCollection | undefined {
    for (const list of Object.values(collectionsByHaus)) {
      const found = list.find(c => c.id === id);
      if (found) return found;
    }
    return undefined;
  }

  async function createHausCollection(hausId: string, name: string): Promise<HausCollection> {
    if (!user?.id) throw new Error('Not authenticated');
    const row = await createCollectionRemote(hausId, name, user.id);
    const collection = toCollection(row);
    setCollectionsByHaus(prev => ({ ...prev, [hausId]: [collection, ...(prev[hausId] ?? [])] }));
    return collection;
  }

  async function addItemsToCollection(collectionId: string, itemIds: string[]): Promise<void> {
    if (!user?.id) throw new Error('Not authenticated');
    await addItemsRemote(collectionId, itemIds, user.id);
    setCollectionsByHaus(prev => {
      const next = { ...prev };
      for (const hausId of Object.keys(next)) {
        next[hausId] = next[hausId].map(c =>
          c.id === collectionId ? { ...c, itemCount: c.itemCount + itemIds.length } : c,
        );
      }
      return next;
    });
  }

  async function removeItemFromCollection(collectionId: string, itemId: string): Promise<void> {
    await removeItemRemote(collectionId, itemId);
    setCollectionsByHaus(prev => {
      const next = { ...prev };
      for (const hausId of Object.keys(next)) {
        next[hausId] = next[hausId].map(c =>
          c.id === collectionId ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c,
        );
      }
      return next;
    });
  }

  return (
    <HausCollectionsContext.Provider value={{
      collectionsByHaus, isLoading, loadCollectionsForHaus,
      getCollectionsForHaus, getCollectionById,
      createHausCollection, addItemsToCollection, removeItemFromCollection,
    }}>
      {children}
    </HausCollectionsContext.Provider>
  );
}

export function useHausCollections(): HausCollectionsContextValue {
  const ctx = useContext(HausCollectionsContext);
  if (!ctx) throw new Error('useHausCollections must be used within HausCollectionsProvider');
  return ctx;
}
