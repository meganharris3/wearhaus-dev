import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useFriends } from '../../context/FriendsContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Friend, FriendRequest, SuggestedFriend } from '../../types';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({
  initials, color, size = 40,
}: { initials: string; color: string; size?: number }) {
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

// ─── Section header bar ───────────────────────────────────────────────────────
function SectionBar({ label }: { label: string }) {
  return (
    <View style={styles.sectionBar}>
      <Text style={styles.sectionBarText}>{label}</Text>
    </View>
  );
}

// ─── Request row ──────────────────────────────────────────────────────────────
function RequestRow({
  request, onAccept, onDecline,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.unreadDot} />
      <Avatar initials={request.from.initials} color={request.from.avatarColor} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{request.from.name}</Text>
        <Text style={styles.rowMeta}>{request.from.handle} · {request.from.mutual} mutual</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptBtnText}>ACCEPT</Text>
        </Pressable>
        <Pressable onPress={onDecline} style={styles.declineBtn}>
          <Text style={styles.declineBtnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Friend row ───────────────────────────────────────────────────────────────
function FriendRow({
  friend, onPress,
}: { friend: Friend; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Avatar initials={friend.initials} color={friend.avatarColor} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{friend.name}</Text>
        <Text style={styles.rowMeta}>{friend.handle} · {friend.itemsShared} items shared</Text>
      </View>
      <Text style={styles.connectedLabel}>CONNECTED</Text>
    </Pressable>
  );
}

// ─── Suggested row ────────────────────────────────────────────────────────────
function SuggestedRow({
  user, onAdd,
}: { user: SuggestedFriend; onAdd: () => void }) {
  return (
    <View style={styles.row}>
      <Avatar initials={user.initials} color={user.avatarColor} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{user.name}</Text>
        <Text style={styles.rowMeta}>
          {user.handle} · {user.sharedHaus} · {user.mutual} mutual
        </Text>
      </View>
      {user.requestStatus === 'pending' ? (
        <Text style={styles.pendingLabel}>PENDING</Text>
      ) : (
        <Pressable onPress={onAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ ADD</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useState(new Animated.Value(0))[0];

  const show = useCallback((msg: string) => {
    setMessage(msg);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setMessage(null));
  }, [opacity]);

  const Toast = message ? (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  ) : null;

  return { show, Toast };
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { friends, friendRequests, suggestedFriends, acceptRequest, declineRequest, sendRequest } =
    useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const { show: showToast, Toast } = useToast();

  const q = searchQuery.toLowerCase().trim();

  const filteredRequests = useMemo(
    () => friendRequests.filter(
      (r) => !q || r.from.name.toLowerCase().includes(q) || r.from.handle.includes(q),
    ),
    [friendRequests, q],
  );

  const filteredFriends = useMemo(
    () => friends.filter(
      (f) => !q || f.name.toLowerCase().includes(q) || f.handle.includes(q),
    ),
    [friends, q],
  );

  const filteredSuggested = useMemo(
    () => suggestedFriends.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.handle.includes(q),
    ),
    [suggestedFriends, q],
  );

  function handleAccept(requestId: string) {
    const newFriend = acceptRequest(requestId);
    showToast(`Connected with ${newFriend.name}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {Toast}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backLabel}>← PROFILE</Text>
        </Pressable>
        <Text style={styles.screenTitle}>FRIENDS</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={14} color={theme.colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or @username"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Friend Requests ── */}
        {filteredRequests.length > 0 && (
          <>
            <SectionBar label={`FRIEND REQUESTS · ${filteredRequests.length}`} />
            {filteredRequests.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                onAccept={() => handleAccept(req.id)}
                onDecline={() => declineRequest(req.id)}
              />
            ))}
          </>
        )}

        {/* ── Your Friends ── */}
        <SectionBar label={`YOUR FRIENDS · ${filteredFriends.length}`} />
        {filteredFriends.length === 0 ? (
          <Text style={styles.emptyRow}>No friends yet.</Text>
        ) : (
          filteredFriends.map((f) => (
            <FriendRow
              key={f.id}
              friend={f}
              onPress={() => navigation.navigate('FriendProfile', { userId: f.id, name: f.name })}
            />
          ))
        )}

        {/* ── Suggested ── */}
        {filteredSuggested.length > 0 && (
          <>
            <SectionBar label="SUGGESTED · FROM YOUR HAUSES" />
            {filteredSuggested.map((s) => (
              <SuggestedRow
                key={s.id}
                user={s}
                onAdd={() => sendRequest(s.id)}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  backBtn: { width: 70 },
  backLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11, color: theme.colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  screenTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 16, color: theme.colors.ink,
    textTransform: 'uppercase', letterSpacing: 2,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.ink,
    paddingVertical: 9,
  },

  scroll: { paddingBottom: 20 },

  // Section bar
  sectionBar: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ivoryMid,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
  },
  sectionBarText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
  },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: {
    fontFamily: theme.fonts.interSemiBold,
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    gap: 10,
  },
  unreadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#C8C820',
    marginRight: 2,
  },
  rowInfo: { flex: 1 },
  rowName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13, color: theme.colors.ink,
  },
  rowMeta: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11, color: theme.colors.muted,
    marginTop: 1,
  },

  // Request actions
  requestActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  acceptBtn: {
    backgroundColor: '#FFFFAD',
    borderWidth: 1.5,
    borderColor: '#C8C820',
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  acceptBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, color: '#3A3A00',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  declineBtn: {
    width: 28, height: 28,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12, color: theme.colors.muted,
  },

  // Friend connected label
  connectedLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8, color: '#C8C820',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  // Suggested add / pending
  addBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  addBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, color: theme.colors.ink,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  pendingLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8, color: '#7A7762',
    textTransform: 'uppercase', letterSpacing: 1,
  },

  emptyRow: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12, color: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12, color: theme.colors.ivory,
  },
});
