import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { theme } from '../theme';
import type { Comment } from '../types';
import { groupCommentsIntoThreads } from '../utils/commentThreads';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentRow({ comment, indented = false }: { comment: Comment; indented?: boolean }) {
  return (
    <View style={[styles.row, indented && styles.rowIndented]}>
      <View style={[styles.avatar, indented && styles.avatarSmall]}>
        <Text style={styles.avatarText}>{getInitials(comment.authorName)}</Text>
      </View>
      <View style={styles.bubble}>
        <View style={styles.bubbleHeader}>
          <Text style={styles.authorName}>{comment.authorName}</Text>
          <Text style={styles.timestamp}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

interface ReplyComposerProps {
  authorName: string;
  onSubmit: (text: string) => Promise<void>;
}

function ReplyComposer({ authorName, onSubmit }: ReplyComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed);
      setText('');
    } catch (e) {
      Alert.alert('Could not post reply', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.replyComposer}>
      <TextInput
        style={styles.replyInput}
        placeholder="Write a reply…"
        placeholderTextColor={theme.colors.muted}
        value={text}
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        editable={!sending}
        autoFocus
      />
      <Pressable onPress={handleSubmit} disabled={!text.trim() || sending} hitSlop={8}>
        <Text style={[styles.replySend, (!text.trim() || sending) && styles.replySendDisabled]}>
          {sending ? '…' : 'Send'}
        </Text>
      </Pressable>
    </View>
  );
}

interface CommentThreadProps {
  /** Flat, oldest-first list for one item, as InteractionsContext.getComments returns it. */
  comments: Comment[];
  /** Called with (parentCommentId, text) when a reply to a top-level comment is submitted. */
  onReply: (parentCommentId: string, text: string) => Promise<void>;
  emptyLabel?: string;
}

export default function CommentThread({ comments, onReply, emptyLabel = 'No comments yet. Be the first!' }: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const threads = groupCommentsIntoThreads(comments);

  if (threads.length === 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  return (
    <View>
      {threads.map(({ comment, replies }) => (
        <View key={comment.id} style={styles.thread}>
          <CommentRow comment={comment} />

          {replies.map((reply) => <CommentRow key={reply.id} comment={reply} indented />)}

          <Pressable
            onPress={() => setReplyingTo((prev) => (prev === comment.id ? null : comment.id))}
            style={styles.replyAction}
            hitSlop={8}
          >
            <Text style={styles.replyActionText}>Reply</Text>
          </Pressable>

          {replyingTo === comment.id && (
            <ReplyComposer
              authorName={comment.authorName}
              onSubmit={async (text) => {
                await onReply(comment.id, text);
                setReplyingTo(null);
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
  },
  thread: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  rowIndented: { marginLeft: 30, marginTop: 8, marginBottom: 0 },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.colors.ivoryDark,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSmall: { width: 24, height: 24, borderRadius: 12 },
  avatarText: { fontFamily: theme.fonts.interSemiBold, fontSize: 10, color: theme.colors.ink },
  bubble: { flex: 1 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 3 },
  authorName: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink },
  timestamp:  { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted },
  commentText: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.ink, lineHeight: 18 },

  replyAction: { marginLeft: 40, marginTop: 2 },
  replyActionText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 11,
    color: theme.colors.muted,
  },
  replyComposer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginLeft: 30, marginTop: 8,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 10, paddingVertical: 7,
    fontFamily: theme.fonts.interRegular,
    fontSize: 12, color: theme.colors.ink,
  },
  replySend: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12, color: theme.colors.ink,
  },
  replySendDisabled: { color: theme.colors.muted },
});
