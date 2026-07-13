import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchMyHauses, createHaus as createHausRemote, leaveHaus as leaveHausRemote, updateHaus as updateHausRemote } from '../services/hausService';
import type { Haus } from '../types';

const SEED_HAUSES: Haus[] = [
  { id: '1', name: 'NYU Village Collective', member_count: 2, piece_count: 5, description: 'Lower Manhattan students.' },
  { id: '2', name: 'Uptown Closet',          member_count: 1, piece_count: 3, description: 'Columbia and Barnard students.' },
];

function storageKey(userId: string | undefined) {
  return userId ? `hauses_${userId}` : 'hauses_guest';
}

interface HausesContextValue {
  hauses: Haus[];
  addHaus: (haus: Haus) => Promise<void>;
  leaveHaus: (hausId: string) => Promise<void>;
  renameHaus: (hausId: string, name: string) => Promise<void>;
  isLoading: boolean;
}

const HausesContext = createContext<HausesContextValue | null>(null);

export function HausesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hauses, setHauses]     = useState<Haus[]>([]);
  const [isLoading, setLoading] = useState(true);

  const key = storageKey(user?.id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Prefer Supabase if logged in
        if (user?.id) {
          const remote = await fetchMyHauses(user.id).catch(() => null);
          if (!cancelled && remote && remote.length > 0) {
            setHauses(remote);
            await AsyncStorage.setItem(key, JSON.stringify(remote)).catch(() => {});
            return;
          }
        }
        // Fall back to AsyncStorage cache
        const raw = await AsyncStorage.getItem(key);
        if (!cancelled) setHauses(raw ? (JSON.parse(raw) as Haus[]) : [...SEED_HAUSES]);
      } catch {
        if (!cancelled) setHauses([...SEED_HAUSES]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [key, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addHaus(haus: Haus) {
    let finalHaus = haus;

    // Save to Supabase if logged in
    if (user?.id) {
      try {
        finalHaus = await createHausRemote(
          { name: haus.name, description: haus.description },
          user.id,
        );
      } catch {
        // keep local haus
      }
    }

    const updated = [finalHaus, ...hauses];
    setHauses(updated);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // non-fatal
    }
  }

  async function renameHaus(hausId: string, name: string) {
    if (user?.id) {
      try { await updateHausRemote(hausId, { name }); } catch { /* keep local update */ }
    }
    const updated = hauses.map((h) => h.id === hausId ? { ...h, name } : h);
    setHauses(updated);
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
  }

  async function leaveHaus(hausId: string) {
    if (user?.id) {
      try { await leaveHausRemote(hausId, user.id); } catch { /* continue with local removal */ }
    }
    const updated = hauses.filter((h) => h.id !== hausId);
    setHauses(updated);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch {}
  }

  return (
    <HausesContext.Provider value={{ hauses, addHaus, leaveHaus, renameHaus, isLoading }}>
      {children}
    </HausesContext.Provider>
  );
}

export function useHauses() {
  const ctx = useContext(HausesContext);
  if (!ctx) throw new Error('useHauses must be used within HausesProvider');
  return ctx;
}
