import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput, Animated } from 'react-native';
import { useFadeOnFocus } from '../../hooks/useFadeOnFocus';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useMessages } from '../../context/MessagesContext';
import { useFriends } from '../../context/FriendsContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Thread, ThreadStatus, Friend } from '../../types';

const THUMB_COLORS = ['#E8E4D4', '#DDD8CC', '#E0D8C8', '#D8D4C4'];

function getThumbColor(seed: string): string {
  const code = seed.charCodeAt(seed.length - 1);
  return THUMB_COLORS[code % 4];
}

function StatusBadge({ status }: { status: ThreadStatus }) {
  if (status === 'completed' || status === 'direct') return null;

  const configs = {
    pending_request: { label: 'REQUEST', bg: '#FFFFAD', border: '#C8C820', text: '#3A3A00' },
    counter_sent:    { label: 'COUNTER', bg: '#FFFFAD', border: '#C8C820', text: '#3A3A00' },
    active_rental:   { label: 'ACTIVE',  bg: '#14120C', border: '#14120C', text: '#FDFBF4' },
  } as const;

  const cfg = configs[status as keyof typeof configs];
  if (!cfg) return null;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
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

  const thumbSeed = thread.item?.id ?? thread.otherUser.id;

  return (
    <Pressable
      style={[styles.row, thread.unread && styles.rowUnread]}
      onPress={handlePress}
    >
      <View style={[styles.unreadDot, thread.unread ? styles.unreadDotFilled : styles.unreadDotHollow]} />

      <View style={[styles.avatar, { backgroundColor: thread.otherUser.avatarColor }]}>
        <Text style={styles.avatarText}>{thread.otherUser.initials}</Text>
      </View>

      <View style={[styles.thumbnail, { backgroundColor: getThumbColor(thumbSeed) }]} />

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

function ComposeModal({
  visible,
  onClose,
  onSelectFriend,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectFriend: (friend: Friend) => void;
}) {
  const { friends } = useFriends();
  const [query, setQuery] = useState('');

  function handleClose() {
    setQuery('');
    onClose();
  }

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.handle.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.composeSheet} edges={['top']}>
        {/* Header */}
        <View style={styles.composeHeader}>
          <Pressable onPress={handleClose}>
            <Text style={styles.composeCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.composeTitle}>NEW MESSAGE</Text>
          <View style={styles.composeHeaderSpacer} />
        </View>

        {/* Search */}
        <View style={styles.composeSearchRow}>
          <Ionicons name="search-outline" size={14} color={theme.colors.muted} />
          <TextInput
            style={styles.composeSearchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search people…"
            placeholderTextColor={theme.colors.muted}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={14} color={theme.colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Friends list */}
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: friend }) => (
            <Pressable style={styles.composeRow} onPress={() => { setQuery(''); onSelectFriend(friend); }}>
              <View style={[styles.composeAvatar, { backgroundColor: friend.avatarColor }]}>
                <Text style={styles.composeAvatarText}>{friend.initials}</Text>
              </View>
              <View>
                <Text style={styles.composeName}>{friend.name}</Text>
                <Text style={styles.composeHandle}>{friend.handle}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.composeEmpty}>
              <Text style={styles.composeEmptyText}>
                {query ? 'No people found' : 'No friends yet'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const fadeOpacity = useFadeOnFocus();
  const { threads, findThreadByUser } = useMessages();
  const [composeVisible, setComposeVisible] = useState(false);

  function handleSelectFriend(friend: Friend) {
    setComposeVisible(false);
    const existing = findThreadByUser(friend.id);
    if (existing) {
      navigation.navigate('ChatThread', { threadId: existing.id });
    } else {
      navigation.navigate('ChatThread', {
        pendingOtherUser: {
          id:          friend.id,
          name:        friend.name,
          handle:      friend.handle.replace(/^@/, ''),
          initials:    friend.initials,
          avatarColor: friend.avatarColor,
        },
      });
    }
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <Pressable style={styles.pencilBtn} onPress={() => setComposeVisible(true)}>
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

      <ComposeModal
        visible={composeVisible}
        onClose={() => setComposeVisible(false)}
        onSelectFriend={handleSelectFriend}
      />
    </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

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

  // ─── Compose modal ───────────────────────────────────────────────────────────

  composeSheet: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.ink,
  },
  composeTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.ink,
    letterSpacing: 1,
  },
  composeCancel: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 14,
    color: theme.colors.muted,
    width: 60,
  },
  composeHeaderSpacer: {
    width: 60,
  },

  composeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composeSearchInput: {
    flex: 1,
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.ink,
  },

  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  composeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeAvatarText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  composeName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  composeHandle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },

  composeEmpty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  composeEmptyText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
