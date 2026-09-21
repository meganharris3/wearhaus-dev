import { supabase } from '../lib/supabase';
import { pageRange, type PageOpts } from './pagination';
import type { Friend, FriendRequest, SuggestedFriend } from '../types';

export async function fetchFriends(userId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`friend:users!friendships_friend_id_fkey(id, display_name, username, avatar_url)`)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const u = row.friend;
    return {
      id:          u.id,
      name:        u.display_name ?? u.username ?? 'User',
      handle:      u.username ? `@${u.username}` : `@user`,
      initials:    (u.display_name ?? 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      avatarColor: '#E2DED0',
      itemsShared: 0,
      avatar_url:  u.avatar_url ?? undefined,
    } satisfies Friend;
  });
}

export async function fetchFriendRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`id, from_user:users!friendships_user_id_fkey(id, display_name, username, avatar_url)`)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const u = row.from_user;
    return {
      id:     row.id,
      from: {
        id:          u.id,
        name:        u.display_name ?? u.username ?? 'User',
        handle:      u.username ? `@${u.username}` : `@user`,
        initials:    (u.display_name ?? 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
        avatarColor: '#FFFFAD',
        mutual:      0,
      },
      status: 'pending' as const,
    } satisfies FriendRequest;
  });
}

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ user_id: fromUserId, friend_id: toUserId, status: 'pending' });
  if (error) throw new Error(error.message);
}

export async function acceptFriendRequest(requestId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
    .eq('friend_id', userId);
  if (error) throw new Error(error.message);
}

export async function declineFriendRequest(requestId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)
    .eq('friend_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchSuggestedFriends(userId: string, opts: PageOpts = {}): Promise<SuggestedFriend[]> {
  // Users who are NOT already friends or pending — simple fallback: recent users
  const [from, to] = pageRange(opts, 10);
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, username, avatar_url')
    .neq('id', userId)
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to);

  if (error) throw new Error(error.message);

  return (data ?? []).map((u: any) => ({
    id:            u.id,
    name:          u.display_name ?? u.username ?? 'User',
    handle:        u.username ? `@${u.username}` : `@user`,
    initials:      (u.display_name ?? 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
    avatarColor:   '#E2DED0',
    sharedHaus:    '',
    mutual:        0,
    requestStatus: null,
    avatar_url:    u.avatar_url ?? undefined,
  } satisfies SuggestedFriend));
}
