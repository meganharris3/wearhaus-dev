import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useMessages } from '../../context/MessagesContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Thread, ThreadStatus } from '../../types';

const THUMB_COLORS = ['#E8E4D4', '#DDD8CC', '#E0D8C8', '#D8D4C4'];

function getThumbColor(itemId: string): string {
  const code = itemId.charCodeAt(itemId.length - 1);
  return THUMB_COLORS[code % 4];
}

function StatusBadge({ status }: { status: ThreadStatus }) {
  if (status === 'completed') return null;

  const configs: Record<Exclude<ThreadStatus, 'completed'>, { label: string; bg: string; border: string; text: string }> = {
    pending_request: { label: 'REQUEST', bg: '#FFFFAD', border: '#C8C820', text: '#3A3A00' },
    counter_sent:    { label: 'COUNTER', bg: '#FFFFAD', border: '#C8C820', text: '#3A3A00' },
    active_rental:   { label: 'ACTIVE',  bg: '#14120C', border: '#14120C', text: '#FDFBF4' },
  };

  const cfg = configs[status];
  return (
    <View style={[
      styles.badge,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
    ]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { markRead } = useMessages();

  function handlePress() {
    markRead(thread.id);
    navigation.navigate('ChatThread', { threadId: thread.id });
  }

  return (
    <Pressable
      style={[styles.row, thread.unread && styles.rowUnread]}
      onPress={handlePress}
    >
      {/* Unread dot */}
      <View style={[styles.unreadDot, thread.unread ? styles.unreadDotFilled : styles.unreadDotHollow]} />

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: thread.otherUser.avatarColor }]}>
        <Text style={styles.avatarText}>{thread.otherUser.initials}</Text>
      </View>

      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: getThumbColor(thread.item.id) }]} />

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.bodyTop}>
          <Text style={styles.name}>{thread.otherUser.name}</Text>
          <View style={styles.bodyTopRight}>
            <StatusBadge status={thread.status} />
            <Text style={styles.time}>{thread.lastMessageTime}</Text>
          </View>
        </View>
        <Text style={styles.preview} numberOfLines={1}>{thread.lastMessage}</Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { threads } = useMessages();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <Pressable style={styles.pencilBtn}>
          <Ionicons name="pencil-outline" size={16} color={theme.colors.ink} />
        </Pressable>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <ThreadRow thread={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.ivory },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.ink,
  },
  headerTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },
  pencilBtn: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    gap: 12,
    backgroundColor: 'transparent',
  },
  rowUnread: {
    backgroundColor: 'rgba(255,255,173,0.12)',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadDotFilled: {
    backgroundColor: '#C8C820',
  },
  unreadDotHollow: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    color: theme.colors.ink,
  },

  thumbnail: {
    width: 32,
    height: 38,
    borderRadius: 2,
  },

  body: { flex: 1 },
  bodyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  bodyTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  time: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
  },
  preview: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
  },

  badge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
