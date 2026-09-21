import { supabase } from '../lib/supabase';
import type { ChatMessage, Item, MessageType, Thread, ThreadStatus } from '../types';

const THREAD_SELECT = `
  id, user_a, user_b, item_id, status, last_message, last_message_at,
  user_a_read_at, user_b_read_at,
  item:items(id, owner_id, name, photo_url, category, size_label, price_per_day, status, location_label),
  a:users!threads_user_a_fkey(id, display_name, username, avatar_url),
  b:users!threads_user_b_fkey(id, display_name, username, avatar_url)
`;

const MESSAGE_SELECT = 'id, thread_id, sender_id, type, text, payload, created_at';

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function toThread(row: any, myId: string): Thread {
  const iAmA = row.user_a === myId;
  const other = iAmA ? row.b : row.a;
  const name = other?.display_name ?? 'User';
  const myReadAt = iAmA ? row.user_a_read_at : row.user_b_read_at;
  return {
    id: row.id,
    otherUser: {
      id: other?.id ?? '',
      name,
      handle: other?.username ?? '',
      initials: initialsOf(name),
      avatarColor: '#E2DED0',
    },
    item: (row.item as Item | null) ?? undefined,
    status: row.status as ThreadStatus,
    unread: !!myReadAt && new Date(row.last_message_at) > new Date(myReadAt),
    lastMessage: row.last_message ?? '',
    lastMessageTime: row.last_message_at,
    messages: [],
  };
}

function toMessage(row: any): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    type: row.type as MessageType,
    senderId: row.sender_id,
    text: row.text ?? undefined,
    payload: row.payload ?? undefined,
    timestamp: row.created_at,
  };
}

export async function fetchThreads(userId: string, opts: { limit?: number } = {}): Promise<Thread[]> {
  const limit = opts.limit ?? 20;
  const { data, error } = await supabase
    .from('threads')
    .select(THREAD_SELECT)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => toThread(row, userId));
}

export async function fetchThread(threadId: string, userId: string): Promise<Thread> {
  const { data, error } = await supabase
    .from('threads')
    .select(THREAD_SELECT)
    .eq('id', threadId)
    .single();

  if (error) throw new Error(error.message);
  return toThread(data, userId);
}

/** Returns messages oldest-first. Pass `before` (an ISO timestamp) to page backwards. */
export async function fetchMessages(
  threadId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<ChatMessage[]> {
  const limit = opts.limit ?? 30;
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.before) query = query.lt('created_at', opts.before);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).reverse().map(toMessage);
}

export async function findOrCreateThread(
  userId: string,
  otherUserId: string,
  itemId?: string,
  status: ThreadStatus = 'direct',
): Promise<string> {
  let find = supabase
    .from('threads')
    .select('id')
    .or(`and(user_a.eq.${userId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${userId})`);
  find = itemId ? find.eq('item_id', itemId) : find.is('item_id', null);

  const { data: existing, error: findError } = await find.maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('threads')
    .insert({ user_a: userId, user_b: otherUserId, item_id: itemId ?? null, status })
    .select('id')
    .single();

  if (createError) throw new Error(createError.message);
  return created.id;
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  message: { text?: string; type?: MessageType; data?: unknown },
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      type: message.type ?? 'text',
      text: message.text ?? null,
      payload: message.data ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return toMessage(data);
}

export async function updateMessagePayload(messageId: string, payload: unknown): Promise<void> {
  const { error } = await supabase.from('messages').update({ payload }).eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function updateThreadStatus(threadId: string, status: ThreadStatus): Promise<void> {
  const { error } = await supabase.from('threads').update({ status }).eq('id', threadId);
  if (error) throw new Error(error.message);
}

export async function markThreadRead(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', { p_thread_id: threadId });
  if (error) throw new Error(error.message);
}
