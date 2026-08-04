import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  fetchFriends,
  fetchFriendRequests,
  fetchSuggestedFriends,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from '../services/friendService';
import type { Friend, FriendRequest, SuggestedFriend } from '../types';

interface FriendsContextValue {
  friends: Friend[];
  friendRequests: FriendRequest[];
  suggestedFriends: SuggestedFriend[];
  isLoading: boolean;
  acceptRequest: (requestId: string) => Promise<Friend>;
  declineRequest: (requestId: string) => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [friends,          setFriends]          = useState<Friend[]>([]);
  const [friendRequests,   setFriendRequests]   = useState<FriendRequest[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>([]);
  const [isLoading,        setIsLoading]        = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setFriends([]);
      setFriendRequests([]);
      setSuggestedFriends([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      fetchFriends(user.id).catch(() => [] as Friend[]),
      fetchFriendRequests(user.id).catch(() => [] as FriendRequest[]),
      fetchSuggestedFriends(user.id).catch(() => [] as SuggestedFriend[]),
    ]).then(([f, r, s]) => {
      if (cancelled) return;
      setFriends(f);
      setFriendRequests(r);
      setSuggestedFriends(s);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const acceptRequest = useCallback(async (requestId: string): Promise<Friend> => {
    const req = friendRequests.find((r) => r.id === requestId)!;
    if (user?.id) await acceptFriendRequest(requestId, user.id).catch(() => {});
    const newFriend: Friend = {
      id:          req.from.id,
      name:        req.from.name,
      handle:      req.from.handle,
      initials:    req.from.initials,
      avatarColor: req.from.avatarColor,
      itemsShared: 0,
    };
    setFriends((prev) => [newFriend, ...prev]);
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    return newFriend;
  }, [friendRequests, user?.id]);

  const declineRequest = useCallback(async (requestId: string) => {
    if (user?.id) await declineFriendRequest(requestId, user.id).catch(() => {});
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, [user?.id]);

  const sendRequest = useCallback(async (toUserId: string) => {
    if (user?.id) await sendFriendRequest(user.id, toUserId).catch(() => {});
    setSuggestedFriends((prev) =>
      prev.map((s) => s.id === toUserId ? { ...s, requestStatus: 'pending' as const } : s),
    );
  }, [user?.id]);

  return (
    <FriendsContext.Provider value={{
      friends, friendRequests, suggestedFriends, isLoading,
      acceptRequest, declineRequest, sendRequest,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within FriendsProvider');
  return ctx;
}
