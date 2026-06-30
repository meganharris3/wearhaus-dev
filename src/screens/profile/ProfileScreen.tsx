import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  NavigationProp,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatar } from '../../services/storageService';
import NotificationBell from '../../components/NotificationBell';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useFriends } from '../../context/FriendsContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AppTabsParamList } from '../../navigation/AppTabs';

const { width: SCREEN_W } = Dimensions.get('window');
const BODY_PAD = 18;
const CARD_W   = (SCREEN_W - BODY_PAD * 2) / 3;
const QA_W     = (SCREEN_W - BODY_PAD * 2 - 8) / 2;

type ProfileNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Profile'>,
  NavigationProp<AppStackParamList>
>;

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function deriveHandle(name: string): string {
  return `@${name.toLowerCase().replace(/\s+/g, '')}`;
}

// ─── StatusTag ────────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  available: { label: 'Avail.', bg: '#FFFFAD', color: '#3A3A00' },
  lent:      { label: 'Lent',   bg: '#14120C', color: '#FDFBF4' },
  wash:      { label: 'Wash',   bg: '#E2DED0', color: '#14120C' },
  draft:     { label: 'Draft',  bg: '#E2DED0', color: '#7A7762' },
};

function StatusTag({ status, small = false }: { status: string; small?: boolean }) {
  const cfg = TAG_CONFIG[status];
  if (!cfg) return null;
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0,
      backgroundColor: cfg.bg,
      paddingHorizontal: small ? 5 : 8,
      paddingVertical: small ? 2 : 3,
    }}>
      <Text style={{
        fontFamily: 'Barlow_800ExtraBold',
        fontSize: small ? 6 : 8,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: cfg.color,
      }}>{cfg.label}</Text>
    </View>
  );
}

// ─── AvatarStack ──────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#FFFFAD', '#E2DED0', '#DDD8CC', '#C8C820'];
const AVATAR_INITIALS = ['SR', 'AL', 'TK', 'JT'];

function AvatarStack({ count, size = 18 }: { count: number; size?: number }) {
  const slots = Array.from({ length: Math.min(count, 4) }, (_, i) => i);
  return (
    <View style={{ flexDirection: 'row' }}>
      {slots.map((i) => (
        <View key={i} style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
          borderWidth: 1.5, borderColor: '#F0EDE0',
          marginLeft: i === 0 ? 0 : -(size * 0.25),
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: size * 0.35,
            color: '#14120C',
          }}>{AVATAR_INITIALS[i]}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── SectionRow ───────────────────────────────────────────────────────────────

function SectionRow({
  title,
  linkLabel,
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 14,
      paddingBottom: 8,
    }}>
      <Text style={{
        fontFamily: 'Barlow_800ExtraBold',
        fontSize: 11, letterSpacing: 1.6,
        textTransform: 'uppercase', color: '#14120C',
      }}>{title}</Text>
      {linkLabel && onLink && (
        <TouchableOpacity onPress={onLink}>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 10, color: '#7A7762',
            textDecorationLine: 'underline',
          }}>{linkLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── FloatingStatsCard ────────────────────────────────────────────────────────

function FloatingStatsCard({
  items, rentals, friends,
}: {
  items: number;
  rentals: number;
  friends: number;
}) {
  const stats = [
    { value: String(items),   label: 'Items',   color: '#14120C' },
    { value: String(rentals), label: 'Rentals', color: '#14120C' },
    { value: String(friends), label: 'Friends', color: '#14120C' },
  ];
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#FDFBF4',
      borderWidth: 1.5, borderColor: '#14120C',
      borderRadius: 2,
      marginHorizontal: 18,
      transform: [{ translateY: 24 }],
      overflow: 'hidden',
    }}>
      {stats.map((stat, i) => (
        <View key={stat.label} style={{
          flex: 1, alignItems: 'center', paddingVertical: 12,
          borderRightWidth: i < 2 ? 0.5 : 0,
          borderRightColor: '#E2DED0',
        }}>
          <Text style={{
            fontFamily: 'Barlow_800ExtraBold',
            fontSize: 22, letterSpacing: -0.5,
            color: stat.color, lineHeight: 24, marginBottom: 2,
          }}>{stat.value}</Text>
          <Text style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 10, letterSpacing: 1.2,
            textTransform: 'uppercase', color: '#14120C',
          }}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── SettingsButton ───────────────────────────────────────────────────────────

function SettingsButton({
  navigation,
  onLogOut,
}: {
  navigation: ProfileNavProp;
  onLogOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  const items = [
    { icon: 'person-outline'        as const, label: 'Edit Profile',       danger: false, onPress: () => Alert.alert('Edit Profile', 'Coming soon') },
    { icon: 'notifications-outline' as const, label: 'Notifications',      danger: false, onPress: () => Alert.alert('Notifications', 'Coming soon') },
    { icon: 'card-outline'          as const, label: 'Payment Methods',    danger: false, onPress: () => Alert.alert('Payment Methods', 'Coming soon') },
    { icon: 'location-outline'      as const, label: 'Shipping Addresses', danger: false, onPress: () => Alert.alert('Shipping Addresses', 'Coming soon') },
    { icon: 'people-outline'        as const, label: 'Friends',            danger: false, onPress: () => navigation.navigate('Friends') },
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
            {items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => { setOpen(false); item.onPress(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 14, paddingVertical: 11,
                  borderBottomWidth: i < items.length - 1 ? 0.5 : 0,
                  borderBottomColor: '#E2DED0',
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={item.danger ? '#C0392B' : '#7A7762'}
                />
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

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, profile, signOut, updateProfile } = useAuth();
  const { items } = useCloset();
  const { hauses } = useHauses();
  const { friends } = useFriends();

  const displayName = profile?.display_name ?? user?.user_metadata?.display_name ?? 'Mia Chen';
  const handle      = profile?.username ? `@${profile.username}` : deriveHandle(displayName);
  const avatarUrl   = profile?.avatar_url ?? null;
  const rating      = profile?.rating ?? 4.9;
  const rentals     = profile?.rentals_completed ?? 23;
  const activeBorrows = 1;

  const [isEditing,      setIsEditing]      = useState(false);
  const [nameInput,      setNameInput]      = useState(displayName);
  const [usernameInput,  setUsernameInput]  = useState(handle.replace(/^@/, ''));
  const [locationInput,  setLocationInput]  = useState(profile?.university ?? '');
  const [bioInput,       setBioInput]       = useState(profile?.bio ?? '');
  const [localAvatar,    setLocalAvatar]    = useState<string | null>(null);
  const [isSaving,       setIsSaving]       = useState(false);

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
        bio: bioInput.trim(),
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      });
    } catch {
      Alert.alert('Error', 'Could not save changes. Try again.');
    } finally {
      setIsSaving(false);
      setIsEditing(false);
      setLocalAvatar(null);
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

  // ─── RatingRow ──────────────────────────────────────────────────────────────

  const ratingNum = Number(rating);

  // ─── ClosetPreview ──────────────────────────────────────────────────────────

  const previewItems = items.slice(0, 3);

  // ─── QuickActions ───────────────────────────────────────────────────────────

  const quickActions = [
    {
      title: 'Borrows',
      sub: `${activeBorrows} active`,
      iconName: 'shirt-outline'    as const,
      iconBg: '#FFFFAD', iconColor: '#3A3A00',
      onPress: () => navigation.navigate('Requests'),
    },
    {
      title: 'Friends',
      sub: `${friends.length} connected`,
      iconName: 'people-outline'   as const,
      iconBg: '#F0EDE0', iconColor: '#7A7762',
      onPress: () => navigation.navigate('Friends'),
    },
    {
      title: 'Availability',
      sub: 'Manage dates',
      iconName: 'calendar-outline' as const,
      iconBg: '#14120C', iconColor: '#FDFBF4',
      onPress: () => Alert.alert('Availability', 'Select an item from your closet to manage its availability.'),
    },
    {
      title: 'Earnings',
      sub: '$42 this month',
      iconName: 'cash-outline'     as const,
      iconBg: '#F0EDE0', iconColor: '#7A7762',
      onPress: () => Alert.alert('Earnings', 'Coming soon'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#14120C' }}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#14120C' }}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ── ProfileHero ───────────────────────────────────────────────── */}
          <View style={{
            backgroundColor: '#14120C',
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 0,
            zIndex: 10,
          }}>
            {/* Top row: edit toggle left, settings gear right */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
              zIndex: 100,
            }}>
              {/* Left: cancel button (edit mode only) or spacer */}
              {isEditing ? (
                <TouchableOpacity
                  onPress={handleCancel}
                  style={{
                    width: 32, height: 32,
                    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}

              {/* Right: bell + settings (view) or save (edit) */}
              {isEditing ? (
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={isSaving}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6,
                    backgroundColor: '#FFFFAD',
                    borderRadius: 2,
                  }}
                >
                  <Text style={{
                    fontFamily: 'Barlow_800ExtraBold',
                    fontSize: 10, letterSpacing: 1.2,
                    textTransform: 'uppercase', color: '#3A3A00',
                  }}>{isSaving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <NotificationBell color="#FFFFFF" />
                  <SettingsButton navigation={navigation} onLogOut={handleLogOut} />
                </View>
              )}
            </View>

            {/* Avatar + identity */}
            <View style={{ alignItems: 'center' }}>
              {/* Avatar */}
              <View style={{ position: 'relative', marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={isEditing ? pickAvatar : undefined}
                  activeOpacity={isEditing ? 0.7 : 1}
                >
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    borderWidth: 2.5, borderColor: '#FFFFAD',
                    backgroundColor: '#2A2820',
                    alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {(localAvatar ?? avatarUrl)
                      ? <Image
                          source={{ uri: localAvatar ?? avatarUrl! }}
                          style={{ width: 80, height: 80, borderRadius: 40 }}
                        />
                      : <Text style={{
                          fontFamily: 'Barlow_800ExtraBold',
                          fontSize: 24, color: '#FFFFAD', letterSpacing: 0.6,
                        }}>{getInitials(nameInput || displayName)}</Text>
                    }
                    {isEditing && (
                      <View style={{
                        position: 'absolute', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ionicons name="camera" size={22} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsEditing((e) => !e)}
                  style={{
                    position: 'absolute', bottom: -4, right: -4,
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: '#FFFFAD',
                    borderWidth: 2, borderColor: '#14120C',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name={isEditing ? 'close' : 'pencil'} size={14} color="#3A3A00" />
                </TouchableOpacity>
              </View>

              {/* Name */}
              {isEditing ? (
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
                    paddingVertical: 4, paddingHorizontal: 8,
                    minWidth: 180, textAlign: 'center',
                    marginBottom: 6,
                  }}
                />
              ) : (
                <Text style={{
                  fontFamily: 'Barlow_800ExtraBold',
                  fontSize: 20, letterSpacing: 0.8,
                  textTransform: 'uppercase', color: '#FDFBF4',
                  lineHeight: 22, marginBottom: 4,
                }}>{displayName}</Text>
              )}

              {/* Username */}
              {isEditing ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,173,0.3)',
                  paddingVertical: 3, marginBottom: 10,
                }}>
                  <Text style={{
                    fontFamily: 'Inter_300Light',
                    fontSize: 12, color: '#FFFFAD', letterSpacing: 0.5,
                  }}>@</Text>
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
                      paddingHorizontal: 2, minWidth: 120,
                    }}
                  />
                </View>
              ) : (
                <Text style={{
                  fontFamily: 'Inter_300Light',
                  fontSize: 12, color: '#FFFFAD',
                  letterSpacing: 0.5, marginBottom: 10,
                }}>{handle}</Text>
              )}

              {/* Location */}
              {isEditing ? (
                <TextInput
                  value={locationInput}
                  onChangeText={setLocationInput}
                  placeholder="Add your location"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={{
                    fontFamily: 'Inter_300Light',
                    fontSize: 12, color: '#FDFBF4',
                    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)',
                    paddingVertical: 4, paddingHorizontal: 8,
                    minWidth: 160, textAlign: 'center',
                    marginBottom: 10,
                  }}
                />
              ) : locationInput ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                  <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.5)" />
                  <Text style={{
                    fontFamily: 'Inter_300Light',
                    fontSize: 12, color: 'rgba(255,255,255,0.6)',
                  }}>{locationInput}</Text>
                </View>
              ) : null}

              {/* Bio */}
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
                    width: SCREEN_W - 72,
                    textAlign: 'center',
                    marginBottom: 16,
                    minHeight: 52,
                  }}
                />
              ) : bioInput ? (
                <Text style={{
                  fontFamily: 'Inter_300Light',
                  fontSize: 13, color: 'rgba(255,255,255,0.75)',
                  textAlign: 'center',
                  paddingHorizontal: 24,
                  marginBottom: 16,
                  lineHeight: 19,
                }}>{bioInput}</Text>
              ) : (
                <Text style={{
                  fontFamily: 'Inter_300Light',
                  fontSize: 12, color: 'rgba(255,255,255,0.25)',
                  marginBottom: 16,
                }}>Tap ✏ to add a bio</Text>
              )}
            </View>

            <FloatingStatsCard
              items={items.length}
              rentals={rentals}
              friends={friends.length}
            />
          </View>

          {/* ── ProfileBody ───────────────────────────────────────────────── */}
          <View style={{ backgroundColor: '#FDFBF4', paddingTop: 36 }}>
            <View style={{ paddingHorizontal: 18 }}>

              {/* Rating row */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 14,
                borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#E2DED0',
                marginBottom: 16,
              }}>
                <Text style={{
                  fontFamily: 'Barlow_800ExtraBold',
                  fontSize: 28, letterSpacing: -0.8, color: '#14120C',
                }}>{rating}</Text>
                <View>
                  <View style={{ flexDirection: 'row', gap: 2, marginBottom: 3 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Text key={i} style={{
                        fontSize: 13,
                        color: i <= Math.round(ratingNum) ? '#C8C820' : '#E2DED0',
                      }}>★</Text>
                    ))}
                  </View>
                  <Text style={{
                    fontFamily: 'Inter_300Light',
                    fontSize: 10, color: '#7A7762',
                  }}>{rentals} rentals · Trusted Lender</Text>
                </View>
              </View>

              {/* Closet preview */}
              <SectionRow
                title="My Closet"
                linkLabel="View all"
                onLink={() => navigation.navigate('Closet' as any)}
              />
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap',
                borderWidth: 1.5, borderColor: '#14120C',
                borderRadius: 2, overflow: 'hidden',
                marginBottom: 16,
              }}>
                {previewItems.map((item, i) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => navigation.navigate('ItemDetail', { item })}
                    style={{
                      width: CARD_W,
                      borderRightWidth: i % 3 !== 2 ? 1 : 0,
                      borderBottomWidth: 0,
                      borderColor: '#14120C',
                    }}
                  >
                    <View style={{
                      aspectRatio: 1,
                      backgroundColor: '#E4E0D0',
                      alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {item.photo_url
                        ? <Image
                            source={{ uri: item.photo_url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        : <Ionicons
                            name="shirt-outline"
                            size={18}
                            color="#14120C"
                            style={{ opacity: 0.12 }}
                          />
                      }
                      <StatusTag status={item.status} small />
                    </View>
                    <View style={{
                      padding: 5, paddingTop: 4,
                      borderTopWidth: 0.5, borderTopColor: '#E2DED0',
                    }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 9, color: '#14120C',
                        }}
                      >{item.name}</Text>
                      <Text style={{
                        fontFamily: 'Inter_300Light',
                        fontSize: 9, color: '#7A7762',
                      }}>${(item.price_per_day / 100).toFixed(0)}/day</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hauses preview */}
              <SectionRow
                title="Hauses"
                linkLabel="View all"
                onLink={() => navigation.navigate('Hauses' as any)}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {hauses.slice(0, 2).map((haus) => (
                  <TouchableOpacity
                    key={haus.id}
                    onPress={() => navigation.navigate('HausDetail', { haus })}
                    style={{
                      flex: 1,
                      backgroundColor: '#F0EDE0',
                      borderWidth: 1.5, borderColor: '#E2DED0',
                      borderRadius: 2, padding: 10,
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Barlow_800ExtraBold',
                      fontSize: 11, letterSpacing: 0.4,
                      textTransform: 'uppercase', color: '#14120C',
                      marginBottom: 3,
                    }}>{haus.name}</Text>
                    <Text style={{
                      fontFamily: 'Inter_300Light',
                      fontSize: 10, color: '#7A7762', marginBottom: 8,
                    }}>{haus.member_count} members · {haus.piece_count} items</Text>
                    <AvatarStack count={haus.member_count} size={18} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick actions */}
              <SectionRow title="Quick Actions" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.title}
                    onPress={action.onPress}
                    style={{
                      width: QA_W,
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      borderWidth: 1.5, borderColor: '#E2DED0',
                      borderRadius: 2, padding: 11,
                      backgroundColor: '#FDFBF4',
                    }}
                  >
                    <View style={{
                      width: 30, height: 30, borderRadius: 2,
                      backgroundColor: action.iconBg,
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Ionicons name={action.iconName} size={15} color={action.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 11, color: '#14120C', marginBottom: 1,
                      }}>{action.title}</Text>
                      <Text style={{
                        fontFamily: 'Inter_300Light',
                        fontSize: 9, color: '#7A7762',
                      }}>{action.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 24 }} />
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
