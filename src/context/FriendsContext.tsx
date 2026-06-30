import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Friend, FriendRequest, SuggestedFriend } from '../types';

interface FriendsContextValue {
  friends: Friend[];
  friendRequests: FriendRequest[];
  suggestedFriends: SuggestedFriend[];
  acceptRequest: (requestId: string) => Friend;
  declineRequest: (requestId: string) => void;
  sendRequest: (userId: string) => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

const SEED_FRIENDS: Friend[] = [
  { id: 'u2', name: 'Sophie R.',  handle: '@sophier',   initials: 'SR', avatarColor: '#FFFFAD', itemsShared: 3 },
  { id: 'u3', name: 'Ava L.',     handle: '@aval_nyu',  initials: 'AL', avatarColor: '#E2DED0', itemsShared: 5 },
  { id: 'u4', name: 'Tara K.',    handle: '@tarakay',   initials: 'TK', avatarColor: '#DDD8CC', itemsShared: 1 },
];

const SEED_REQUESTS: FriendRequest[] = [
  {
    id: 'fr1',
    from: { id: 'u5', name: 'Jade Torres', handle: '@jadeee',  initials: 'JT', avatarColor: '#FFFFAD', mutual: 12 },
    status: 'pending',
  },
  {
    id: 'fr2',
    from: { id: 'u6', name: 'Priya M.',    handle: '@priyam',  initials: 'PM', avatarColor: '#E2DED0', mutual: 4  },
    status: 'pending',
  },
];

const SEED_SUGGESTED: SuggestedFriend[] = [
  { id: 'u7', name: 'Nina K.',  handle: '@ninak',  initials: 'NK', avatarColor: '#DDD8CC', sharedHaus: 'Alpha Phi Closet',  mutual: 6, requestStatus: null },
  { id: 'u8', name: 'Rosa S.',  handle: '@rosas',  initials: 'RS', avatarColor: '#E4DDD4', sharedHaus: 'Third Floor Stuy',  mutual: 2, requestStatus: 'pending' },
  { id: 'u9', name: 'Maya L.',  handle: '@mayal',  initials: 'ML', avatarColor: '#D8D4C8', sharedHaus: 'Alpha Phi Closet',  mutual: 8, requestStatus: null },
];

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  const [friends,        setFriends]        = useState<Friend[]>(SEED_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(SEED_REQUESTS);
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>(SEED_SUGGESTED);

  const acceptRequest = useCallback((requestId: string): Friend => {
    const req = friendRequests.find((r) => r.id === requestId)!;
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
  }, [friendRequests]);

  const declineRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const sendRequest = useCallback((userId: string) => {
    setSuggestedFriends((prev) =>
      prev.map((s) => s.id === userId ? { ...s, requestStatus: 'pending' } : s),
    );
  }, []);

  return (
    <FriendsContext.Provider value={{
      friends, friendRequests, suggestedFriends,
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
