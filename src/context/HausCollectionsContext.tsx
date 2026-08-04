import React, { createContext, useContext, useState } from 'react';

export interface HausCollection {
  id: string;
  hausId: string;
  name: string;
  itemIds: string[];
  createdBy: string;
  createdAt: string;
}

// Mock items representing other Haus members' contributions.
// These supplement real ClosetContext items for the demo.
export interface CollectionItem {
  id: string;
  name: string;
  pricePerDay: number;
  photoThumbColor: string;
  ownerId: string;
  ownerName: string;
  ownerInitials: string;
  ownerAvatarColor: string;
  status: 'available' | 'lent' | 'wash';
}

export const MOCK_HAUS_ITEMS: CollectionItem[] = [
  { id: 'mock_1', name: 'Silk Midi Dress',      pricePerDay: 18, photoThumbColor: '#E8E4D4', ownerId: 'user_sophie', ownerName: 'Sophie R',  ownerInitials: 'SR', ownerAvatarColor: '#E2DED0', status: 'available' },
  { id: 'mock_2', name: 'Blazer Cream',          pricePerDay: 14, photoThumbColor: '#DDD8CC', ownerId: 'user_sophie', ownerName: 'Sophie R',  ownerInitials: 'SR', ownerAvatarColor: '#E2DED0', status: 'available' },
  { id: 'mock_3', name: 'Linen Trousers',        pricePerDay: 10, photoThumbColor: '#D8D4C8', ownerId: 'user_jade',   ownerName: 'Jade T',    ownerInitials: 'JT', ownerAvatarColor: '#C8C820', status: 'available' },
  { id: 'mock_4', name: 'Wrap Skirt',            pricePerDay: 9,  photoThumbColor: '#E4E0D0', ownerId: 'user_jade',   ownerName: 'Jade T',    ownerInitials: 'JT', ownerAvatarColor: '#C8C820', status: 'lent'      },
  { id: 'mock_5', name: 'Knit Cardigan',         pricePerDay: 12, photoThumbColor: '#E0DCD0', ownerId: 'user_alex',   ownerName: 'Alex L',    ownerInitials: 'AL', ownerAvatarColor: '#FFFFAD', status: 'available' },
  { id: 'mock_6', name: 'Mini Pleated Skirt',    pricePerDay: 8,  photoThumbColor: '#D4D0C4', ownerId: 'user_alex',   ownerName: 'Alex L',    ownerInitials: 'AL', ownerAvatarColor: '#FFFFAD', status: 'available' },
  { id: 'mock_7', name: 'Satin Blouse',          pricePerDay: 11, photoThumbColor: '#E8DDD0', ownerId: 'user_mia',    ownerName: 'Mia Chen',  ownerInitials: 'MC', ownerAvatarColor: '#FFFFAD', status: 'available' },
  { id: 'mock_8', name: 'Wide Leg Jeans',        pricePerDay: 13, photoThumbColor: '#C8C4B8', ownerId: 'user_mia',    ownerName: 'Mia Chen',  ownerInitials: 'MC', ownerAvatarColor: '#FFFFAD', status: 'available' },
  { id: 'mock_9', name: 'Floral Sundress',       pricePerDay: 15, photoThumbColor: '#E0E4D8', ownerId: 'user_sophie', ownerName: 'Sophie R',  ownerInitials: 'SR', ownerAvatarColor: '#E2DED0', status: 'available' },
];

interface HausCollectionsContextValue {
  collections: HausCollection[];
  getCollectionsForHaus: (hausId: string) => HausCollection[];
  getCollectionById: (id: string) => HausCollection | undefined;
  addCollection: (c: HausCollection) => void;
  updateCollectionItems: (collectionId: string, itemIds: string[]) => void;
}

const HausCollectionsContext = createContext<HausCollectionsContextValue | null>(null);

export function HausCollectionsProvider({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<HausCollection[]>([]);

  function getCollectionsForHaus(hausId: string): HausCollection[] {
    return collections.filter(c => c.hausId === hausId);
  }

  function getCollectionById(id: string): HausCollection | undefined {
    return collections.find(c => c.id === id);
  }

  function addCollection(c: HausCollection) {
    setCollections(prev => [c, ...prev]);
  }

  function updateCollectionItems(collectionId: string, itemIds: string[]) {
    setCollections(prev =>
      prev.map(c => c.id === collectionId ? { ...c, itemIds } : c),
    );
  }

  return (
    <HausCollectionsContext.Provider value={{
      collections,
      getCollectionsForHaus,
      getCollectionById,
      addCollection,
      updateCollectionItems,
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
