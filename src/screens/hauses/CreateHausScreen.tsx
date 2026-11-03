import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../theme';
import Chip from '../../components/Chip';
import Toggle from '../../components/Toggle';
import StepProgressBar from '../../components/StepProgressBar';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useFriends } from '../../context/FriendsContext';
import { useAuth } from '../../context/AuthContext';
import { inviteMembersToHaus } from '../../services/hausService';
import type { Item, Friend } from '../../types';
import type { Haus } from '../../types';

const HAUS_TYPES = ['Sorority / Frat', 'Dorm Floor', 'Friend Group', 'Roommates', 'Other'];
const INVITE_LINK = 'wearhaus.app/join/alpha-phi-c';

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}


function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

export default function CreateHausScreen() {
  const navigation = useNavigation();
  const { addHaus } = useHauses();
  const { items: closetItems } = useCloset();
  const { friends } = useFriends();
  const { user, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [hausName, setHausName]       = useState('');
  const [description, setDescription] = useState('');
  const [hausType, setHausType]       = useState<string | null>(null);
  const [isPrivate, setIsPrivate]     = useState(true);

  // Step 2 — selected friends get a real pending invite (haus_invitations), not a
  // direct membership insert: RLS only lets a user insert their own membership row,
  // so they join once they accept it, same as a friend request.
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  function toggleMember(friendId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  }

  // Step 3
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const canGoNext = currentStep === 1 ? hausName.trim().length > 0 : true;

  function handleBack() {
    if (currentStep === 1) {
      navigation.goBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  }

  function handleNext() {
    if (!canGoNext) return;
    setCurrentStep((s) => s + 1);
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(INVITE_LINK);
    showToast('Copied!');
  }

  async function handleGoToHaus() {
    const pickedItems = closetItems.filter((i) => selectedItems.includes(i.id));
    const newHaus: Haus = {
      id: Date.now().toString(),
      name: hausName,
      description,
      // Only the creator is a member at this point — invited friends join once they
      // accept, so they aren't counted yet. The server's own row overrides this anyway.
      member_count: 1,
      piece_count: selectedItems.length,
      items: pickedItems,
    };
    const finalHaus = await addHaus(newHaus);

    if (user?.id && selectedFriendIds.length > 0) {
      try {
        await inviteMembersToHaus(finalHaus.id, user.id, selectedFriendIds);
      } catch {
        // Haus itself is already created — a failed invite batch shouldn't block finishing.
      }
    }

    navigation.goBack();
  }

  const STEP_TITLES = ['New Haus', 'Invite', 'Add Items', 'Your Haus'];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>
            {currentStep === 1 ? '← HAUSES' : '← BACK'}
          </Text>
        </Pressable>

        <Text style={styles.topTitle}>{STEP_TITLES[currentStep - 1].toUpperCase()}</Text>

        {currentStep < 4 ? (
          <Pressable
            onPress={handleNext}
            style={[styles.nextBtn, !canGoNext && styles.nextBtnDisabled]}
            disabled={!canGoNext}
          >
            <Text style={styles.nextBtnText}>NEXT</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      {/* Progress bar */}
      <StepProgressBar currentStep={currentStep} />

      {/* Step content */}
      {currentStep === 1 && (
        <Step1
          hausName={hausName}
          setHausName={setHausName}
          description={description}
          setDescription={setDescription}
          hausType={hausType}
          setHausType={setHausType}
          isPrivate={isPrivate}
          setIsPrivate={setIsPrivate}
        />
      )}
      {currentStep === 2 && (
        <Step2
          friends={friends}
          selectedFriendIds={selectedFriendIds}
          onToggleMember={toggleMember}
          search={memberSearch}
          setSearch={setMemberSearch}
          youName={profile?.display_name ?? 'You'}
          onCopyLink={handleCopyLink}
          inviteLink={INVITE_LINK}
        />
      )}
      {currentStep === 3 && (
        <Step3
          closetItems={closetItems}
          selectedItems={selectedItems}
          onToggleItem={toggleItem}
        />
      )}
      {currentStep === 4 && (
        <Step4
          hausName={hausName}
          youName={profile?.display_name ?? 'You'}
          invitedFriends={friends.filter((f) => selectedFriendIds.includes(f.id))}
          selectedItems={selectedItems}
          onGoToHaus={handleGoToHaus}
          onCopyLink={handleCopyLink}
          inviteLink={INVITE_LINK}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STEP 1 — Name & Type
// ─────────────────────────────────────────────
function Step1({
  hausName, setHausName, description, setDescription,
  hausType, setHausType, isPrivate, setIsPrivate,
}: {
  hausName: string; setHausName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  hausType: string | null; setHausType: (v: string | null) => void;
  isPrivate: boolean; setIsPrivate: (v: boolean) => void;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <SectionHeader label="Haus Details" />

      <FieldLabel label="HAUS NAME *" />
      <TextInput
        style={styles.input}
        value={hausName}
        onChangeText={setHausName}
        placeholder="e.g. Alpha Phi Closet"
        placeholderTextColor={theme.colors.muted}
        autoFocus
      />

      <FieldLabel label="DESCRIPTION" />
      <TextInput
        style={[styles.input, styles.inputMulti]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your Haus…"
        placeholderTextColor={theme.colors.muted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <SectionHeader label="Haus Type" />
      <View style={styles.chipWrap}>
        {HAUS_TYPES.map((t) => (
          <Chip
            key={t}
            label={t}
            selected={hausType === t}
            onPress={() => setHausType(hausType === t ? null : t)}
          />
        ))}
      </View>

      <SectionHeader label="Privacy" />
      <View style={styles.toggleRow}>
        <View style={styles.toggleText}>
          <Text style={styles.toggleLabel}>Private Haus</Text>
          <Text style={styles.toggleSub}>Only invited members can join</Text>
        </View>
        <Toggle value={isPrivate} onToggle={() => setIsPrivate(!isPrivate)} />
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — Invite Members
// ─────────────────────────────────────────────
function Step2({
  friends, selectedFriendIds, onToggleMember, search, setSearch, youName,
  onCopyLink, inviteLink,
}: {
  friends: Friend[]; selectedFriendIds: string[]; onToggleMember: (id: string) => void;
  search: string; setSearch: (v: string) => void; youName: string;
  onCopyLink: () => void; inviteLink: string;
}) {
  const visibleFriends = search.trim()
    ? friends.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : friends;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <SectionHeader label="Add Members" />

      {/* Search row — filters the friends list below, doesn't add arbitrary text */}
      <View style={styles.inviteRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends…"
          placeholderTextColor={theme.colors.muted}
          style={styles.inviteInput}
          returnKeyType="search"
        />
      </View>

      {/* You, always a member — not selectable */}
      <View style={styles.memberRow}>
        <View style={[styles.memberAvatar, styles.memberAvatarSelf]}>
          <Text style={styles.memberInitials}>{initialsOf(youName)}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{youName}</Text>
        </View>
        <View style={styles.youBadge}>
          <Text style={styles.youBadgeText}>YOU</Text>
        </View>
      </View>

      {/* Friends list — tap to invite. Selected ones get a pending haus_invitations row
          once the Haus is actually created (friends.length === 0 shows a hint instead). */}
      {friends.length === 0 ? (
        <Text style={styles.noFriendsText}>
          Add some friends first — you'll be able to invite them to Hauses from here.
        </Text>
      ) : (
        visibleFriends.map((f) => {
          const selected = selectedFriendIds.includes(f.id);
          return (
            <Pressable key={f.id} onPress={() => onToggleMember(f.id)} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitials}>{f.initials}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{f.name}</Text>
                <Text style={styles.memberHandle}>{f.handle}</Text>
              </View>
              <View style={[styles.memberSelectDot, selected && styles.memberSelectDotActive]}>
                {selected && <Ionicons name="checkmark" size={12} color={theme.colors.yellowText} />}
              </View>
            </Pressable>
          );
        })
      )}

      <SectionHeader label="Share Invite" />

      {/* Share buttons */}
      <View style={styles.shareRow}>
        {[
          { icon: 'link-outline' as const, label: 'Copy Link', onPress: onCopyLink },
          { icon: 'qr-code-outline' as const, label: 'QR Code', onPress: () => {} },
          { icon: 'share-social-outline' as const, label: 'Story', onPress: () => {} },
        ].map(({ icon, label, onPress }) => (
          <Pressable key={label} style={styles.shareBtn} onPress={onPress}>
            <Ionicons name={icon} size={18} color={theme.colors.ink} />
            <Text style={styles.shareBtnText}>{label.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* Invite link display */}
      <View style={styles.linkRow}>
        <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
        <Pressable onPress={onCopyLink}>
          <Text style={styles.linkCopy}>COPY</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// STEP 3 — Add Items
// ─────────────────────────────────────────────
function Step3({
  closetItems, selectedItems, onToggleItem,
}: {
  closetItems: Item[]; selectedItems: string[]; onToggleItem: (id: string) => void;
}) {
  const renderItem = useCallback(({ item }: { item: Item }) => {
    const selected = selectedItems.includes(item.id);
    return (
      <Pressable onPress={() => onToggleItem(item.id)} style={styles.gridItem}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.gridImg} />
        ) : (
          <View style={[styles.gridImg, { backgroundColor: theme.colors.ivoryMid }]} />
        )}
        {/* Selection indicator */}
        <View style={[styles.selectDot, selected && styles.selectDotActive]}>
          {selected && <Ionicons name="checkmark" size={10} color={theme.colors.yellowText} />}
        </View>
        <Text style={styles.gridItemName} numberOfLines={1}>{item.name}</Text>
      </Pressable>
    );
  }, [selectedItems, onToggleItem]);

  return (
    <View style={{ flex: 1 }}>
      <SectionHeader label="Your Pieces" />
      <FlatList
        data={closetItems}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.gridFooter}>
            <Text style={styles.selectedCount}>
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.gridNote}>You can always add or remove items later.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// STEP 4 — Success
// ─────────────────────────────────────────────
function Step4({
  hausName, youName, invitedFriends, selectedItems, onGoToHaus, onCopyLink, inviteLink,
}: {
  hausName: string; youName: string; invitedFriends: Friend[]; selectedItems: string[];
  onGoToHaus: () => void; onCopyLink: () => void; inviteLink: string;
}) {
  const previewFriends = invitedFriends.slice(0, 3);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, styles.successContent]}
      showsVerticalScrollIndicator={false}
    >
      {/* Checkmark icon */}
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={32} color={theme.colors.yellowText} />
      </View>

      <Text style={styles.successTitle}>
        {hausName || 'Your Haus'}{'\n'}IS LIVE
      </Text>
      <Text style={styles.successSub}>
        {invitedFriends.length > 0
          ? `Invites sent — they'll join once they accept.`
          : 'Your Haus is ready. Invite members and start sharing.'}
      </Text>

      {/* Preview card */}
      <View style={styles.previewCard}>
        <Text style={styles.previewName}>{(hausName || 'Your Haus').toUpperCase()}</Text>
        <Text style={styles.previewMeta}>
          1 member{invitedFriends.length > 0 ? ` · ${invitedFriends.length} invited` : ''} · {selectedItems.length} piece{selectedItems.length !== 1 ? 's' : ''}
        </Text>
        {/* Mini avatar stack — you, then whoever was invited */}
        <View style={styles.previewAvatars}>
          <View style={[styles.previewAvatar, { backgroundColor: theme.colors.yellow }]}>
            <Text style={styles.previewAvatarText}>{initialsOf(youName)}</Text>
          </View>
          {previewFriends.map((f) => (
            <View key={f.id} style={[styles.previewAvatar, { marginLeft: -8 }]}>
              <Text style={styles.previewAvatarText}>{f.initials}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTAs */}
      <Pressable style={styles.goBtn} onPress={onGoToHaus}>
        <Text style={styles.goBtnText}>GO TO HAUS</Text>
      </Pressable>

      <Pressable style={styles.shareGhostBtn} onPress={onCopyLink}>
        <Ionicons name="link-outline" size={14} color={theme.colors.ink} />
        <Text style={styles.shareGhostText}>SHARE INVITE LINK</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ivoryMid,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 14,
  },
  label: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.ink,
    letterSpacing: 1.5,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
  },
  backBtn: {},
  backText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  topTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.ink,
  },
  nextBtn: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.yellowText,
  },

  // Inputs
  fieldLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  input: {
    marginHorizontal: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.ink,
    marginBottom: 16,
  },
  inputMulti: { height: 72, paddingTop: 10, textAlignVertical: 'top' },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    marginBottom: 16,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    marginBottom: 4,
  },
  toggleText: { flex: 1, paddingRight: 16 },
  toggleLabel: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  toggleSub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },

  // Step 2 — invite
  inviteRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  inviteInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.ink,
  },
  inviteAddBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inviteAddText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.ivory,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.ivoryMid,
    gap: 12,
  },
  memberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.ivoryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarSelf: { backgroundColor: theme.colors.yellow },
  memberInitials: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.ink,
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  memberHandle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 1,
  },
  youBadge: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8,
    color: theme.colors.yellowText,
    letterSpacing: 1,
  },
  noFriendsText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    paddingHorizontal: 18,
    paddingVertical: 12,
    lineHeight: 18,
  },
  memberSelectDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSelectDotActive: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  shareRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
  },
  shareBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8,
    color: theme.colors.ink,
    letterSpacing: 0.8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivoryDark,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: theme.colors.muted,
  },
  linkCopy: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.yellowText,
    backgroundColor: theme.colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
    letterSpacing: 0.8,
  },

  // Step 3 — item grid
  gridRow: { gap: 4 },
  gridContent: { paddingHorizontal: 18, gap: 4, paddingBottom: 16 },
  gridItem: { flex: 1 / 3, position: 'relative' },
  gridImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius,
    resizeMode: 'cover',
  },
  selectDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    backgroundColor: 'rgba(253,251,244,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDotActive: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  gridItemName: {
    fontFamily: theme.fonts.interLight,
    fontSize: 9,
    color: theme.colors.muted,
    marginTop: 3,
    textAlign: 'center',
  },
  gridFooter: { paddingTop: 12, alignItems: 'center', gap: 4 },
  selectedCount: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
  },
  gridNote: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
    textAlign: 'center',
  },

  // Step 4 — success
  successContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.yellow,
    borderWidth: 2,
    borderColor: theme.colors.yellowBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 28,
    marginBottom: 10,
  },
  successSub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  previewCard: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    padding: 16,
    backgroundColor: theme.colors.ivoryDark,
    marginBottom: 24,
    gap: 6,
  },
  previewName: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 16,
    color: theme.colors.ink,
    letterSpacing: 1.5,
  },
  previewMeta: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12,
    color: theme.colors.muted,
  },
  previewAvatars: { flexDirection: 'row', marginTop: 4 },
  previewAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.ivoryMid,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.ivory,
  },
  previewAvatarText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.ink,
  },
  goBtn: {
    width: '100%',
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  goBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  shareGhostBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
  },
  shareGhostText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
