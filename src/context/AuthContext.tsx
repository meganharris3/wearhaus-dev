import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSession, signIn as _signIn, signOut as _signOut, signUp as _signUp } from '../services/authService';
import { fetchUserProfile, updateUserProfile } from '../services/userService';
import type { UserProfile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'bio'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const p = await fetchUserProfile(userId);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // PH-5: guard INITIAL_SESSION to avoid double loadProfile on cold start
    // H-4: .catch + .finally so loading always resolves even if getSession() rejects
    getSession()
      .then(async (s) => {
        setSession(s);
        if (s?.user) await loadProfile(s.user.id);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'INITIAL_SESSION') return; // already handled by getSession() above
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await _signIn(email, password);
    return { error: error?.message ?? null };
  };

  const handleSignUp = async (email: string, password: string, displayName: string) => {
    const { error } = await _signUp(email, password, displayName);
    return { error: error?.message ?? null };
  };

  const handleUpdateProfile = async (
    updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'bio'>>,
  ) => {
    const userId = session?.user?.id;
    if (!userId) throw new Error('Not authenticated');
    await updateUserProfile(userId, updates);
    setProfile((prev) => prev ? { ...prev, ...updates } : prev);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: _signOut,
      updateProfile: handleUpdateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
