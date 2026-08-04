import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { useFadeOnFocus } from '../../hooks/useFadeOnFocus';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatar } from '../../services/storageService';
import NotificationBell from '../../components/NotificationBell';
import MessagesIcon from '../../components/MessagesIcon';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useFriends } from '../../context/FriendsContext';
import { useBorrows } from '../../context/BorrowsContext';
import { useMessages } from '../../context/MessagesContext';
import ItemCard from '../../components/ItemCard';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Item } from '../../types';


function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function deriveHandle(name: string): string {
  return `@${name.toLowerCase().replace(/\s+/g, '')}`;
}

// ─── AvatarStack ──────────────────────────────────────────────────────────────



// ─── HausesMiniCard — owner only, 12px radius ─────────────────────────────────

type HausPreview = { id: string; name: string; piece_count: number };

function HausesMiniCard({ hauses }: { hauses: HausPreview[] }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Hauses')}
      style={{
        borderWidth: 1.5, borderColor: '#14120C',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <View style={{ backgroundColor: '#14120C', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Ionicons name="people-outline" size={13} color="#FFFFAD" />
          <Text style={{
            fontFamily: 'Barlow_800ExtraBold', fontSize: 11,
            letterSpacing: 1, textTransform: 'uppercase', color: '#FFFFAD',
          }}>My Hauses</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {hauses.slice(0, 2).map(haus => (
            <View key={haus.id} style={{
              flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
            }}>
              <Text numberOfLines={1} style={{
                fontFamily: 'Barlow_800ExtraBold', fontSize: 10,
                letterSpacing: 0.4, textTransform: 'uppercase', color: '#FDFBF4',
                marginBottom: 2,
              }}>{haus.name}</Text>
              <Text style={{ fontFamily: 'Inter_300Light', fontSize: 10, color: '#908D7A' }}>
                {haus.piece_count} items
              </Text>
            </View>
          ))}
          {hauses.length === 0 && (
            <Text style={{ fontFamily: 'Inter_300Light', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              No hauses yet
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── BorrowsMiniCard — owner only, 12px radius ────────────────────────────────

type BorrowsSummary = { borrowingActive: number; lendingActive: number };

function BorrowsMiniCard({ summary }: { summary: BorrowsSummary }) {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('BorrowsDashboard')}
      style={{
        borderWidth: 1.5, borderColor: '#14120C',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <View style={{
        backgroundColor: '#FFFFAD',
        borderBottomWidth: 1, borderBottomColor: '#C8C820',
        paddingTop: 14, paddingHorizontal: 16, paddingBottom: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Ionicons name="swap-horizontal" size={13} color="#3A3A00" />
          <Text style={{
            fontFamily: 'Barlow_800ExtraBold', fontSize: 11,
            letterSpacing: 0.8, textTransform: 'uppercase', color: '#3A3A00',
          }}>Exchanges</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.06)',
            borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
          }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#3A3A00', opacity: 0.8, marginBottom: 4 }}>Borrowing</Text>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', fontSize: 22, color: '#3A3A00', lineHeight: 24 }}>{summary.borrowingActive}</Text>
            <Text style={{ fontFamily: 'Inter_300Light', fontSize: 10, color: '#5A5A00' }}>active</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: 'rgba(0,0,0,0.06)',
            borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
          }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: '#3A3A00', opacity: 0.8, marginBottom: 4 }}>Lending</Text>
            <Text style={{ fontFamily: 'Barlow_800ExtraBold', fontSize: 22, color: '#3A3A00', lineHeight: 24 }}>{summary.lendingActive}</Text>
            <Text style={{ fontFamily: 'Inter_300Light', fontSize: 10, color: '#5A5A00' }}>active</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Boards (saved for future rollout — not currently shown) ──────────────────
/*
const BOARD_THUMB_COLORS = ['#E8E4D4', '#E0DCD0', '#D8D4C8', '#E4DDD4'];

function BoardMosaicCover({ items, coverStyle }: { items: (Item | null)[]; coverStyle: CoverStyle }) {
  if (coverStyle === 'single') {
    return (
      <View style={{ height: 110 }}>
        {items[0]?.photo_url
          ? <Image source={{ uri: items[0].photo_url }} style={{ width: '100%', height: 110 }} resizeMode="cover" />
          : <View style={{ flex: 1, backgroundColor: BOARD_THUMB_COLORS[0], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shirt-outline" size={24} color="#14120C" style={{ opacity: 0.12 }} />
            </View>
        }
      </View>
    );
  }
  if (coverStyle === 'stack') {
    return (
      <View style={{ height: 110 }}>
        <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#14120C', overflow: 'hidden' }}>
          {items[0]?.photo_url
            ? <Image source={{ uri: items[0].photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ flex: 1, backgroundColor: BOARD_THUMB_COLORS[0], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shirt-outline" size={18} color="#14120C" style={{ opacity: 0.12 }} />
              </View>
          }
        </View>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {items[1]?.photo_url
            ? <Image source={{ uri: items[1].photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ flex: 1, backgroundColor: BOARD_THUMB_COLORS[1], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shirt-outline" size={18} color="#14120C" style={{ opacity: 0.12 }} />
              </View>
          }
        </View>
      </View>
    );
  }
  const slots: (Item | null)[] = [...items.slice(0, 4)];
  while (slots.length < 4) slots.push(null);
  return (
    <View style={{ height: 110, flexDirection: 'row', flexWrap: 'wrap' }}>
      {slots.map((item, idx) => (
        <View key={idx} style={{
          width: '50%', height: '50%', overflow: 'hidden',
          backgroundColor: BOARD_THUMB_COLORS[idx % 4],
          borderRightWidth: idx % 2 === 0 ? 0.5 : 0,
          borderBottomWidth: idx < 2 ? 0.5 : 0,
          borderColor: '#14120C',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {item?.photo_url
            ? <Image source={{ uri: item.photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <Ionicons name="shirt-outline" size={16} color="#14120C" style={{ opacity: 0.12 }} />
          }
        </View>
      ))}
    </View>
  );
}

function BoardCard({ board, allItems }: { board: Board; allItems: Item[] }) {
  const boardItems = board.itemIds.map((id) => allItems.find((i) => i.id === id) ?? null);
  const visLabel = { public: 'Public', friends: 'Friends', private: 'Private' }[board.visibility];
  return (
    <View style={{ borderWidth: 1.5, borderColor: '#14120C', borderRadius: 2, overflow: 'hidden' }}>
      <BoardMosaicCover items={boardItems} coverStyle={board.coverStyle} />
      <View style={{ padding: 8, borderTopWidth: 0.5, borderTopColor: '#E2DED0' }}>
        <Text numberOfLines={1} style={{
          fontFamily: 'Barlow_800ExtraBold', fontSize: 11,
          letterSpacing: 0.4, textTransform: 'uppercase', color: '#14120C', marginBottom: 2,
        }}>{board.name}</Text>
        <Text style={{ fontFamily: 'Inter_300Light', fontSize: 9, color: '#7A7762' }}>
          {board.itemIds.length} items · {visLabel}
        </Text>
      </View>
    </View>
  );
}

function BoardsGrid({ boards, allItems, onBoardPress, onCreatePress }: {
  boards: Board[];
  allItems: Item[];
  onBoardPress: (b: Board) => void;
  onCreatePress?: () => void;
}) {
  const flat: (Board | 'new')[] = onCreatePress ? [...boards, 'new'] : [...boards];
  const rows: (Board | 'new')[][] = [];
  for (let i = 0; i < flat.length; i += 2) rows.push(flat.slice(i, i + 2));

  if (flat.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_300Light', fontSize: 13, color: '#7A7762' }}>No boards yet</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, gap: 10 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((cell) =>
            cell === 'new' ? (
              <TouchableOpacity
                key="new"
                onPress={onCreatePress}
                style={{
                  width: '47%', height: 155,
                  borderWidth: 1.5, borderColor: '#E2DED0',
                  borderStyle: 'dashed', borderRadius: 2,
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Ionicons name="add" size={22} color="#E2DED0" />
                <Text style={{
                  fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
                  letterSpacing: 1.2, textTransform: 'uppercase', color: '#7A7762',
                }}>New Board</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity key={(cell as Board).id} onPress={() => onBoardPress(cell as Board)} style={{ width: '47%' }}>
                <BoardCard board={cell as Board} allItems={allItems} />
              </TouchableOpacity>
            ),
          )}
        </View>
      ))}
    </View>
  );
}
*/

// ─── Closet tab filtering ─────────────────────────────────────────────────────



// ─── VisibilityLegend ─────────────────────────────────────────────────────────

const VIS_LEGEND = [
  { key: 'public',  icon: 'globe-outline'  as const, bg: '#14120C', iconColor: '#FDFBF4', label: 'Public'  },
  { key: 'friends', icon: 'people-outline' as const, bg: '#FFFFAD', iconColor: '#3A3A00', label: 'Friends' },
  { key: 'hauses',  icon: 'home-outline'   as const, bg: '#F0EDE0', iconColor: '#7A7762', label: 'Hauses'  },
];

function VisibilityLegend() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      {VIS_LEGEND.map(l => (
        <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 14, height: 14, borderRadius: 2, backgroundColor: l.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={l.icon} size={8} color={l.iconColor} />
          </View>
          <Text style={{ fontFamily: 'Inter_300Light', fontSize: 9, color: '#7A7762' }}>{l.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── ClosetHeader ─────────────────────────────────────────────────────────────

function ClosetHeader({ title, count }: {
  title: string;
  count: number;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
      borderBottomWidth: 1.5, borderBottomColor: '#14120C',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
        <Text style={{
          fontFamily: 'Barlow_800ExtraBold', fontSize: 20,
          letterSpacing: 0.9, textTransform: 'uppercase', color: '#14120C',
        }}>{title}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: '#7A7762' }}>
          {count} items
        </Text>
      </View>
    </View>
  );
}

// ─── ClosetGallery ────────────────────────────────────────────────────────────

function ClosetGallery({ items, onItemPress, onItemEdit, onItemDelete }: {
  items: Item[];
  onItemPress: (item: Item) => void;
  onItemEdit?: (item: Item) => void;
  onItemDelete?: (item: Item) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Inter_300Light', fontSize: 13, color: '#7A7762' }}>No items yet</Text>
      </View>
    );
  }
  const rows: Item[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 10 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onPress={() => onItemPress(item)}
              onEdit={onItemEdit ? () => onItemEdit(item) : undefined}
              onDelete={onItemDelete ? () => onItemDelete(item) : undefined}
            />
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

// ─── SettingsButton ───────────────────────────────────────────────────────────

function SettingsButton({ onLogOut, onFriends }: { onLogOut: () => void; onFriends: () => void }) {
  const [open, setOpen] = useState(false);

  const menuItems = [
    { icon: 'person-outline'        as const, label: 'Edit Profile',       danger: false, onPress: () => Alert.alert('Edit Profile', 'Coming soon') },
    { icon: 'notifications-outline' as const, label: 'Notifications',      danger: false, onPress: () => Alert.alert('Notifications', 'Coming soon') },
    { icon: 'card-outline'          as const, label: 'Payment Methods',    danger: false, onPress: () => Alert.alert('Payment Methods', 'Coming soon') },
{ icon: 'people-outline'        as const, label: 'Friends',            danger: false, onPress: onFriends },
    { icon: 'lock-closed-outline'   as const, label: 'Privacy',            danger: false, onPress: () => Alert.alert('Privacy', 'Coming soon') },
    { icon: 'log-out-outline'       as const, label: 'Log Out',            danger: true,  onPress: onLogOut },
  ];

  return (
    <View style={{ position: 'relative', zIndex: 999 }}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={{
          width: 38, height: 38,
          borderWidth: 2, borderColor: '#FFFFFF',
          borderRadius: 2,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -200, left: -300, right: -50, bottom: -600,
              zIndex: 998,
            }}
            onPress={() => setOpen(false)}
          />
          <View style={{
            position: 'absolute', top: 44, right: 0,
            backgroundColor: '#FDFBF4',
            borderWidth: 1.5, borderColor: '#14120C',
            borderRadius: 2, width: 190,
            zIndex: 999, overflow: 'hidden',
          }}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => { setOpen(false); item.onPress(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 14, paddingVertical: 11,
                  borderBottomWidth: i < menuItems.length - 1 ? 0.5 : 0,
                  borderBottomColor: '#E2DED0',
                }}
              >
                <Ionicons name={item.icon} size={15} color={item.danger ? '#C0392B' : '#7A7762'} />
                <Text style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 13,
                  color: item.danger ? '#C0392B' : '#14120C',
                }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── UserProfileCore — shared between own-profile and visitor ─────────────────

function UserProfileCore({ isOwnProfile, userId }: { isOwnProfile: boolean; userId?: string }) {
  const navigation = useNavigation<any>();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { items, deleteItem } = useCloset();
  const { hauses } = useHauses();
  const { friends } = useFriends();
  const { borrowStats, lendStats } = useBorrows();
  const { findThreadByUser } = useMessages();
  const fadeOpacity = useFadeOnFocus();

  // Own profile data
  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? 'Mia Chen';
  const handle      = profile?.username ? `@${profile.username}` : deriveHandle(displayName);
  const avatarUrl   = profile?.avatar_url ?? null;
  const rating      = profile?.rating ?? 4.9;

  // Visitor data (look up from friends list, fall back to stubs)
  const visitedFriend      = !isOwnProfile ? friends.find(f => f.id === userId) : null;
  const visitorName        = visitedFriend?.name        ?? 'Wearhaus User';
  const visitorHandle      = visitedFriend?.handle      ?? '@user';
  const visitorInitials    = visitedFriend?.initials    ?? 'WU';
  const visitorAvatarColor = visitedFriend?.avatarColor ?? '#E2DED0';

  // Hero data (resolved to the right source)
  const heroName    = isOwnProfile ? displayName : visitorName;
  const heroHandle  = isOwnProfile ? handle      : visitorHandle;
  const heroRating = isOwnProfile ? rating      : 4.8;
  const heroItems  = isOwnProfile ? items.length : 8;

  // Own-profile edit state
  const [isEditing,     setIsEditing]     = useState(false);
  const [nameInput,     setNameInput]     = useState(displayName);
  const [usernameInput, setUsernameInput] = useState(handle.replace(/^@/, ''));
  const [locationInput, setLocationInput] = useState(profile?.university ?? '');
  const [bioInput,      setBioInput]      = useState(profile?.bio ?? '');
  const [localAvatar,   setLocalAvatar]   = useState<string | null>(null);
  const [isSaving,      setIsSaving]      = useState(false);


  useEffect(() => {
    if (isEditing || !profile) return;
    setLocationInput(profile.university ?? '');
    setBioInput(profile.bio ?? '');
    setNameInput(profile.display_name ?? '');
    setUsernameInput(profile.username ?? deriveHandle(profile.display_name ?? '').replace(/^@/, ''));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalAvatar(result.assets[0].uri);
    }
  }

  async function handleSave() {
    console.log('[ProfileScreen] handleSave called, nameInput:', JSON.stringify(nameInput));
    if (!nameInput.trim()) {
      Alert.alert('Name required', 'Display name cannot be empty.');
      return;
    }
    setIsSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (localAvatar && user?.id) {
        newAvatarUrl = await uploadAvatar(localAvatar, user.id);
      }
      await updateProfile({
        display_name: nameInput.trim(),
        username: usernameInput.trim().replace(/^@/, '').replace(/\s+/g, '_').toLowerCase(),
        university: locationInput.trim(),
        bio: bioInput.trim(),
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      });
      setIsEditing(false);
      setLocalAvatar(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ProfileScreen] save error:', err);
      Alert.alert('Save failed', msg);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setNameInput(displayName);
    setUsernameInput(handle.replace(/^@/, ''));
    setLocationInput(profile?.university ?? '');
    setBioInput(profile?.bio ?? '');
    setLocalAvatar(null);
    setIsEditing(false);
  }

  async function handleLogOut() {
    try { await signOut(); } catch { /* no-op */ }
  }

  function handleMessage() {
    if (!userId) return;
    const existing = findThreadByUser(userId);
    if (existing) {
      navigation.navigate('ChatThread', { threadId: existing.id });
    } else {
      navigation.navigate('ChatThread', {
        pendingOtherUser: {
          id:          userId,
          name:        visitorName,
          handle:      visitorHandle.replace(/^@/, ''),
          initials:    visitorInitials,
          avatarColor: visitorAvatarColor,
        },
      });
    }
  }

  const ratingNum = Number(heroRating);
  const borrowsSummary: BorrowsSummary = {
    borrowingActive: borrowStats.active,
    lendingActive:   lendStats.active,
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
    <View style={{ flex: 1, backgroundColor: '#14120C' }}>
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#14120C' }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Hero (dark) ────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#14120C', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 0, zIndex: 10 }}>

          {/* Top row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, zIndex: 100 }}>
            {isOwnProfile ? (
              isEditing ? (
                <TouchableOpacity onPress={handleCancel} style={heroIconBtn}>
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )
            ) : (
              <TouchableOpacity onPress={() => navigation.goBack()} style={heroIconBtn}>
                <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}

            {isOwnProfile && (
              isEditing ? (
                <TouchableOpacity onPress={() => { console.log('[ProfileScreen] Save tapped, isSaving:', isSaving); handleSave(); }} disabled={isSaving} style={{
                  paddingHorizontal: 14, paddingVertical: 6,
                  backgroundColor: '#FFFFAD', borderRadius: 2,
                }}>
                  <Text style={{
                    fontFamily: 'Barlow_800ExtraBold', fontSize: 10,
                    letterSpacing: 1.2, textTransform: 'uppercase', color: '#3A3A00',
                  }}>{isSaving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MessagesIcon color="#FFFFFF" />
                  <NotificationBell color="#FFFFFF" />
                  <SettingsButton onLogOut={handleLogOut} onFriends={() => navigation.navigate('Friends')} />
                </View>
              )
            )}
          </View>

          {/* Avatar + identity — horizontal row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingBottom: 12 }}>

            {/* Avatar */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                onPress={isOwnProfile && isEditing ? pickAvatar : undefined}
                activeOpacity={isOwnProfile && isEditing ? 0.7 : 1}
              >
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  borderWidth: 2.5,
                  borderColor: isOwnProfile ? '#FFFFAD' : visitorAvatarColor,
                  backgroundColor: '#2A2820',
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {isOwnProfile && (localAvatar ?? avatarUrl) ? (
                    <Image
                      source={{ uri: (localAvatar ?? avatarUrl)! }}
                      style={{ width: 64, height: 64, borderRadius: 32 }}
                    />
                  ) : (
                    <Text style={{
                      fontFamily: 'Barlow_800ExtraBold',
                      fontSize: 20,
                      color: isOwnProfile ? '#FFFFAD' : visitorAvatarColor,
                      letterSpacing: 0.6,
                    }}>
                      {isOwnProfile ? getInitials(nameInput || displayName) : visitorInitials}
                    </Text>
                  )}
                  {isOwnProfile && isEditing && (
                    <View style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {isOwnProfile && (
                <TouchableOpacity
                  onPress={() => setIsEditing((e) => !e)}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: '#FFFFAD',
                    borderWidth: 2, borderColor: '#14120C',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name={isEditing ? 'close' : 'pencil'} size={12} color="#3A3A00" />
                </TouchableOpacity>
              )}
            </View>

            {/* Name / handle / badges column */}
            <View style={{ flex: 1, paddingTop: 2 }}>

              {/* Name */}
              {isOwnProfile && isEditing ? (
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Display name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCorrect={false}
                  style={{
                    fontFamily: 'Barlow_800ExtraBold',
                    fontSize: 18, letterSpacing: 0.8,
                    textTransform: 'uppercase', color: '#FDFBF4',
                    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)',
                    paddingVertical: 2, marginBottom: 6,
                  }}
                />
              ) : (
                <Text style={{
                  fontFamily: 'Barlow_800ExtraBold',
                  fontSize: 20, letterSpacing: 0.8,
                  textTransform: 'uppercase', color: '#FDFBF4',
                  lineHeight: 22, marginBottom: 3,
                }}>{heroName}</Text>
              )}

              {/* Handle */}
              {isOwnProfile && isEditing ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,173,0.3)',
                  paddingVertical: 2, marginBottom: 8,
                }}>
                  <Text style={{ fontFamily: 'Inter_300Light', fontSize: 12, color: '#FFFFAD', letterSpacing: 0.5 }}>@</Text>
                  <TextInput
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    placeholder="username"
                    placeholderTextColor="rgba(255,255,173,0.3)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      fontFamily: 'Inter_300Light',
                      fontSize: 12, color: '#FFFFAD', letterSpacing: 0.5,
                      paddingHorizontal: 2, flex: 1,
                    }}
                  />
                </View>
              ) : (
                <Text style={{
                  fontFamily: 'Inter_300Light',
                  fontSize: 12,
                  color: isOwnProfile ? '#FFFFAD' : '#E2DED0',
                  letterSpacing: 0.5, marginBottom: 6,
                }}>{heroHandle}</Text>
              )}


              {/* Location */}
              {isOwnProfile && (
                isEditing ? (
                  <TextInput
                    value={locationInput}
                    onChangeText={setLocationInput}
                    placeholder="Add your location"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                      fontFamily: 'Inter_300Light',
                      fontSize: 12, color: '#FDFBF4',
                      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
                      paddingVertical: 2, marginBottom: 8,
                    }}
                  />
                ) : locationInput ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.5)" />
                    <Text style={{ fontFamily: 'Inter_300Light', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {locationInput}
                    </Text>
                  </View>
                ) : null
              )}

              {/* Campus */}
              {!isEditing && isOwnProfile && profile?.campus_verified && profile?.campus_name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                  <Ionicons name="school-outline" size={11} color="#FFFFAD" />
                  <Text style={{ fontFamily: 'Inter_300Light', fontSize: 11, color: '#FFFFAD', letterSpacing: 0.3 }}>
                    {profile.campus_name}
                  </Text>
                </View>
              )}

              {/* Stars + friends stat */}
              {!isEditing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Text key={i} style={{
                        fontSize: 12,
                        color: i <= Math.round(ratingNum) ? '#FFFFAD' : 'rgba(255,255,255,0.15)',
                      }}>★</Text>
                    ))}
                  </View>
                  {isOwnProfile ? (
                    <TouchableOpacity onPress={() => navigation.navigate('Friends')} hitSlop={6}>
                      <Text style={{ fontFamily: 'Inter_300Light', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FDFBF4' }}>{friends.length}</Text>
                        {' friends'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ fontFamily: 'Inter_300Light', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FDFBF4' }}>{heroRating}</Text>
                      {' rating'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Bio — full width below the row */}
          {isOwnProfile && (
            <>
              {isEditing ? (
                <TextInput
                  value={bioInput}
                  onChangeText={setBioInput}
                  placeholder="Add a bio…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  maxLength={120}
                  style={{
                    fontFamily: 'Inter_300Light',
                    fontSize: 13, color: '#FDFBF4',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    paddingVertical: 8, paddingHorizontal: 10,
                    marginBottom: 16, minHeight: 52,
                  }}
                />
              ) : bioInput ? (
                <Text style={{
                  fontFamily: 'Inter_300Light',
                  fontSize: 13, color: 'rgba(255,255,255,0.75)',
                  marginBottom: 16, lineHeight: 19,
                }}>{bioInput}</Text>
              ) : null}
            </>
          )}

        </View>

        {/* ── Profile body (ivory) ──────────────────────────────────── */}
        <View style={{ backgroundColor: '#FDFBF4', paddingTop: 16 }}>

          {/* Owner section — Hauses + Borrows mini cards */}
          {isOwnProfile && (
            <View style={{ paddingHorizontal: 16, flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              <HausesMiniCard hauses={hauses} />
              <BorrowsMiniCard summary={borrowsSummary} />
            </View>
          )}

          {/* Closet header */}
          <ClosetHeader
            title={isOwnProfile ? 'My Closet' : 'Closet'}
            count={heroItems}
          />

          {/* Closet gallery */}
          <ClosetGallery
            items={isOwnProfile ? items : []}
            onItemPress={(item) => navigation.navigate('ItemDetail', { item })}
            onItemEdit={isOwnProfile ? (item) => navigation.navigate('AddItem', { item }) : undefined}
            onItemDelete={isOwnProfile ? (item) => {
              Alert.alert(
                'Remove from closet',
                `Delete "${item.name}"? This can't be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
                ],
              );
            } : undefined}
          />

          {/* Visibility legend — own profile only */}
          {isOwnProfile && <VisibilityLegend />}

          {/* Message CTA — visitor only */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleMessage}
              style={{
                marginHorizontal: 16, marginTop: 20, marginBottom: 14,
                backgroundColor: '#14120C', borderRadius: 2, padding: 11,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontFamily: 'Barlow_800ExtraBold', fontSize: 11,
                letterSpacing: 1, textTransform: 'uppercase', color: '#FDFBF4',
              }}>Message {heroName.split(' ')[0]}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Floating ADD button — own profile only, matches HomeScreen FAB exactly */}
      {isOwnProfile && (
        <Pressable
          onPress={() => navigation.navigate('AddItem')}
          hitSlop={4}
          style={{
            position: 'absolute', bottom: 24, right: 20,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingVertical: 12, paddingHorizontal: 18,
            backgroundColor: '#FFFFAD',
            borderWidth: 1.5, borderColor: '#14120C',
            borderRadius: 28,
            shadowColor: '#14120C',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <MaterialCommunityIcons name="hanger" size={20} color="#3A3A00" />
          <Text style={{
            fontFamily: 'Barlow_800ExtraBold', fontSize: 12,
            letterSpacing: 1, color: '#3A3A00',
          }}>ADD</Text>
        </Pressable>
      )}
    </SafeAreaView>
    </View>
    </Animated.View>
  );
}

const heroIconBtn = {
  width: 32, height: 32,
  borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  borderRadius: 2 as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

// ─── Tab export — own profile (no params) ─────────────────────────────────────

export default function ProfileScreen() {
  return <UserProfileCore isOwnProfile />;
}

// ─── Stack export — visitor profile (userId param) ────────────────────────────

export function UserProfileScreen({ route }: NativeStackScreenProps<AppStackParamList, 'FriendProfile'>) {
  return <UserProfileCore isOwnProfile={false} userId={route.params.userId} />;
}
