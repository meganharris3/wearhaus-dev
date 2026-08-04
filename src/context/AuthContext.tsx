import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSession, signIn as _signIn, signOut as _signOut, signUp as _signUp } from '../services/authService';
import { fetchUserProfile, updateUserProfile } from '../services/userService';
import type { UserProfile } from '../types';
import type { CampusInfo } from '../data/campusDomains';
import { updateUserCampus, markOnboardingComplete } from '../services/campusService';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'bio' | 'university'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCampus: (campusInfo: CampusInfo, schoolEmail: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
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
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Keep the existing profile on transient failure (paused project, network blip)
      // so the screen doesn't revert to fallback defaults.
      // Sign-out clears profile via the onAuthStateChange else-branch below.
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

  // Pull the live session from Supabase storage rather than React state.
  // React state can be transiently null if a TOKEN_REFRESHED or SIGNED_IN
  // event hasn't propagated back into state yet (e.g. BorrowsContext triggers
  // an RLS query that causes a token refresh before the user taps Save).
  const getLiveUserId = async (): Promise<{ userId: string; email: string; liveSession: typeof session }> => {
    const { data: { session: live } } = await supabase.auth.getSession();
    const userId = live?.user?.id ?? session?.user?.id;
    const email  = live?.user?.email ?? session?.user?.email ?? '';
    if (!userId) throw new Error('Not authenticated');
    if (live && !session) setSession(live);
    return { userId, email, liveSession: live };
  };

  const handleUpdateProfile = async (
    updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'avatar_url' | 'bio' | 'university'>>,
  ) => {
    const { userId, email } = await getLiveUserId();
    const saved = await updateUserProfile(userId, email, updates);
    setProfile(saved);
  };

  const handleRefreshProfile = async () => {
    const userId = session?.user?.id ?? (await supabase.auth.getSession()).data.session?.user?.id;
    if (userId) await loadProfile(userId);
  };

  const handleUpdateCampus = async (campusInfo: CampusInfo, schoolEmail: string) => {
    const { userId } = await getLiveUserId();
    await updateUserCampus(userId, campusInfo, schoolEmail);
    setProfile((prev) => prev ? { ...prev, campus_verified: true, campus_id: campusInfo.id, campus_name: campusInfo.name, school_email: schoolEmail } : prev);
  };

  const handleCompleteOnboarding = async () => {
    const { userId } = await getLiveUserId();
    await markOnboardingComplete(userId);
    setProfile((prev) => prev ? { ...prev, onboarding_complete: true } : prev);
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
      refreshProfile: handleRefreshProfile,
      updateCampus: handleUpdateCampus,
      completeOnboarding: handleCompleteOnboarding,
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
