import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchMyHauses, createHaus as createHausRemote, leaveHaus as leaveHausRemote, updateHaus as updateHausRemote } from '../services/hausService';
import type { Haus } from '../types';


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
        if (user?.id) {
          await AsyncStorage.removeItem(key).catch(() => {});
          const remote = await fetchMyHauses(user.id).catch(() => null);
          if (!cancelled) setHauses(remote ?? []);
        } else {
          const raw = await AsyncStorage.getItem(key);
          if (!cancelled) setHauses(raw ? (JSON.parse(raw) as Haus[]) : []);
        }
      } catch {
        if (!cancelled) setHauses([]);
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
