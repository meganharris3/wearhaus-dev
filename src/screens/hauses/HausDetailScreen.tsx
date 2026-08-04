import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  ToastAndroid,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../../theme';
import ItemCard from '../../components/ItemCard';
import Chip from '../../components/Chip';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import {
  useHausCollections, MOCK_HAUS_ITEMS,
  type HausCollection,
} from '../../context/HausCollectionsContext';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';

const INVITE_LINK = 'wearhaus.app/join/';

type ItemFilter = 'all' | 'mine' | 'available';
type Tab = 'items' | 'collections' | 'members';

const FILTERS: { key: ItemFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'mine',      label: 'Your Items' },
  { key: 'available', label: 'Available' },
];

const TABS: { key: Tab; label: string }[] = [
  { key: 'items',       label: 'All Items' },
  { key: 'collections', label: 'Collections' },
  { key: 'members',     label: 'Members' },
];

interface InviteMember {
  id: string;
  name: string;
  handle: string;
  initials: string;
  isYou: boolean;
}

function getInitial(word: string) {
  return word.trim().charAt(0).toUpperCase();
}

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

// ─── HausCollectionCard ───────────────────────────────────────────────────────

function HausCollectionCard({
  collection,
  onPress,
}: {
  collection: HausCollection;
  onPress: () => void;
}) {
  const { items: closetItems } = useCloset();
  const count = collection.itemIds.length;

  // Resolve up to 3 item thumbnails
  const thumbColors = collection.itemIds.slice(0, 3).map(id => {
    const real = closetItems.find(i => i.id === id);
    if (real) return { color: '#E4E0D0', url: real.photo_url };
    const mock = MOCK_HAUS_ITEMS.find(m => m.id === id);
    return { color: mock?.photoThumbColor ?? '#E4E0D0', url: undefined };
  });
  // Pad to 3
  while (thumbColors.length < 3) thumbColors.push({ color: '#EEEAE0', url: undefined });

  return (
    <TouchableOpacity onPress={onPress} style={coll.card} activeOpacity={0.85}>
      <View style={coll.thumbRow}>
        {thumbColors.map((t, i) => (
          <View key={i} style={[coll.thumb, { backgroundColor: t.color }]}>
            {t.url ? (
              <Image source={{ uri: t.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Ionicons name="shirt-outline" size={11} color="#14120C" style={{ opacity: 0.12 }} />
            )}
          </View>
        ))}
      </View>
      <View style={coll.cardBody}>
        <Text numberOfLines={1} style={coll.cardName}>{collection.name}</Text>
        <Text style={coll.cardCount}>{count} item{count !== 1 ? 's' : ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── HausCollectionsGrid ─────────────────────────────────────────────────────

function HausCollectionsGrid({
  hausId,
  collections,
  onCollectionPress,
  onCreatePress,
}: {
  hausId: string;
  collections: HausCollection[];
  onCollectionPress: (c: HausCollection) => void;
  onCreatePress: () => void;
}) {
  // 2-col grid: new-collection dashed card first, then collection cards
  type GridItem =
    | { type: 'new' }
    | { type: 'coll'; collection: HausCollection };

  const allCards: GridItem[] = [
    { type: 'new' },
    ...collections.map(c => ({ type: 'coll' as const, collection: c })),
  ];

  const rows: GridItem[][] = [];
  for (let i = 0; i < allCards.length; i += 2) {
    rows.push(allCards.slice(i, i + 2));
  }

  if (collections.length === 0) {
    return (
      <View style={coll.wrapper}>
        <TouchableOpacity onPress={onCreatePress} style={coll.newCard} activeOpacity={0.85}>
          <Ionicons name="add" size={20} color={theme.colors.muted} />
          <Text style={coll.newCardText}>NEW COLLECTION</Text>
        </TouchableOpacity>
        <View style={coll.emptyWrap}>
          <Text style={coll.emptyText}>Create your first collection to start curating together.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={coll.wrapper}>
      {rows.map((row, ri) => (
        <View key={ri} style={coll.row}>
          {row.map((item, ci) => {
            if (item.type === 'new') {
              return (
                <TouchableOpacity
                  key="new"
                  onPress={onCreatePress}
                  style={coll.newCard}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={20} color={theme.colors.muted} />
                  <Text style={coll.newCardText}>NEW COLLECTION</Text>
                </TouchableOpacity>
              );
            }
            return (
              <HausCollectionCard
                key={item.collection.id}
                collection={item.collection}
                onPress={() => onCollectionPress(item.collection)}
              />
            );
          })}
          {row.length === 1 && <View style={coll.card} />}
        </View>
      ))}
    </View>
  );
}

// ─── HausMembersList ─────────────────────────────────────────────────────────

function HausMembersList({ members }: { members: InviteMember[] }) {
  return (
    <View style={{ paddingTop: 4 }}>
      {members.map(m => (
        <View key={m.id} style={mem.row}>
          <View style={[mem.avatar, m.isYou && mem.avatarSelf]}>
            <Text style={mem.initials}>{m.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mem.name}>{m.name}</Text>
            <Text style={mem.handle}>{m.handle}</Text>
          </View>
          {m.isYou && (
            <View style={mem.youBadge}>
              <Text style={mem.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HausDetailScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'HausDetail'>>();
  const { haus } = route.params;
  const { items: allItems, updateItem } = useCloset();
  const { leaveHaus, renameHaus } = useHauses();
  const { user } = useAuth();
  const { getCollectionsForHaus } = useHausCollections();

  const [activeTab,    setActiveTab]    = useState<Tab>('items');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [leaveVisible,  setLeaveVisible]  = useState(false);
  const [isLeaving,     setIsLeaving]     = useState(false);
  const [inviteInput,   setInviteInput]   = useState('');
  const [filter,        setFilter]        = useState<ItemFilter>('all');
  const [localName,     setLocalName]     = useState(haus.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput,     setNameInput]     = useState(haus.name);
  const [members, setMembers] = useState<InviteMember[]>([
    { id: 'me', name: 'You', handle: '@you', initials: 'ME', isYou: true },
  ]);

  const hausItems = allItems.filter(item => item.haus_visibility?.[haus.id] === true);
  const filteredItems = hausItems.filter(item => {
    if (filter === 'mine')      return item.owner_id === 'me' || (user != null && item.owner_id === user.id);
    if (filter === 'available') return item.status === 'available';
    return true;
  });
  const collections = getCollectionsForHaus(haus.id);
  const words = localName.split(' ').slice(0, 3);

  async function handleRename() {
    const trimmed = nameInput.trim();
    setIsEditingName(false);
    if (!trimmed || trimmed === localName) return;
    const prev = localName;
    setLocalName(trimmed);
    try { await renameHaus(haus.id, trimmed); } catch { setLocalName(prev); }
  }

  function handleAddMember() {
    const raw = inviteInput.trim();
    if (!raw) return;
    setMembers(prev => [
      ...prev,
      {
        id:       Date.now().toString(),
        name:     raw.replace(/^@/, ''),
        handle:   raw.startsWith('@') ? raw : `@${raw}`,
        initials: raw.replace('@', '').slice(0, 2).toUpperCase(),
        isYou:    false,
      },
    ]);
    setInviteInput('');
  }

  function handleRemoveMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  async function handleCopyLink() {
    const inviteLink = INVITE_LINK + localName.toLowerCase().replace(/\s+/g, '-').slice(0, 16);
    await Clipboard.setStringAsync(inviteLink);
    showToast('Link copied!');
  }

  async function confirmLeave() {
    setIsLeaving(true);
    try {
      await Promise.all(
        hausItems.map(item =>
          updateItem({ ...item, haus_visibility: { ...item.haus_visibility, [haus.id]: false } }),
        ),
      );
      await leaveHaus(haus.id);
      setLeaveVisible(false);
      navigation.goBack();
    } catch {
      setIsLeaving(false);
    }
  }

  // Manual 2-col item grid rows
  const itemRows: Item[][] = [];
  for (let i = 0; i < filteredItems.length; i += 2) {
    itemRows.push(filteredItems.slice(i, i + 2));
  }

  const inviteLink = INVITE_LINK + localName.toLowerCase().replace(/\s+/g, '-').slice(0, 16);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Back */}
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarStack}>
            {words.map((word, i) => (
              <View
                key={i}
                style={[
                  styles.avatar,
                  { backgroundColor: i === 0 ? theme.colors.yellow : theme.colors.ivoryMid },
                  i > 0 && { marginLeft: -12 },
                ]}
              >
                <Text style={styles.avatarInitial}>{getInitial(word)}</Text>
              </View>
            ))}
          </View>

          {isEditingName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                onSubmitEditing={handleRename}
                returnKeyType="done"
                autoFocus
                autoCapitalize="words"
                style={[styles.hausName, {
                  flex: 1, borderBottomWidth: 1.5,
                  borderBottomColor: theme.colors.ink,
                  paddingVertical: 2,
                }]}
              />
              <Pressable onPress={handleRename} hitSlop={8}>
                <Ionicons name="checkmark" size={20} color={theme.colors.ink} />
              </Pressable>
              <Pressable onPress={() => setIsEditingName(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => { setNameInput(localName); setIsEditingName(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
            >
              <Text style={styles.hausName}>{localName.toUpperCase()}</Text>
              <Ionicons name="pencil-outline" size={18} color={theme.colors.muted} />
            </Pressable>
          )}

          {haus.description ? (
            <Text style={styles.description}>{haus.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaValue}>{haus.member_count}</Text>
              <Text style={styles.metaLabel}>MEMBERS</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaPill}>
              <Text style={styles.metaValue}>{hausItems.length}</Text>
              <Text style={styles.metaLabel}>PIECES</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaPill}>
              <Text style={styles.metaValue}>{collections.length}</Text>
              <Text style={styles.metaLabel}>COLLECTIONS</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.inviteBtn} onPress={() => setInviteVisible(true)}>
              <Ionicons name="person-add-outline" size={14} color={theme.colors.yellowText} />
              <Text style={styles.inviteBtnText}>INVITE FRIENDS</Text>
            </Pressable>
            <Pressable style={styles.leaveBtn} onPress={() => setLeaveVisible(true)}>
              <Ionicons name="exit-outline" size={14} color="#C0392B" />
              <Text style={styles.leaveBtnText}>LEAVE HAUS</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Tab Bar ── */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── All Items tab ── */}
        {activeTab === 'items' && (
          <>
            {hausItems.length > 0 && (
              <View style={styles.filterRow}>
                {FILTERS.map(f => (
                  <Chip
                    key={f.key}
                    label={f.label}
                    selected={filter === f.key}
                    onPress={() => setFilter(f.key)}
                  />
                ))}
              </View>
            )}
            {filteredItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>NO ITEMS YET</Text>
                  <Text style={styles.emptySubtitle}>
                    Members haven't shared any pieces to this Haus yet.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.itemGrid}>
                {itemRows.map((row, ri) => (
                  <View key={ri} style={styles.itemRow}>
                    {row.map(item => (
                      <View key={item.id} style={{ flex: 1 }}>
                        <ItemCard
                          item={item}
                          onPress={() => navigation.navigate('ItemDetail', { item })}
                        />
                      </View>
                    ))}
                    {row.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Collections tab ── */}
        {activeTab === 'collections' && (
          <HausCollectionsGrid
            hausId={haus.id}
            collections={collections}
            onCollectionPress={c => navigation.navigate('CollectionDetail', { collectionId: c.id })}
            onCreatePress={() => navigation.navigate('CreateCollection', { hausId: haus.id })}
          />
        )}

        {/* ── Members tab ── */}
        {activeTab === 'members' && (
          <HausMembersList members={members} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Invite Modal ── */}
      <Modal
        visible={inviteVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInviteVisible(false)}
      >
        <SafeAreaView style={modal.safe} edges={['top']}>
          <View style={modal.topBar}>
            <Text style={modal.title}>INVITE</Text>
            <Pressable onPress={() => setInviteVisible(false)} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={modal.scroll}
            contentContainerStyle={modal.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={modal.sectionHeader}>
              <Text style={modal.sectionLabel}>ADD MEMBERS</Text>
            </View>

            <View style={modal.inviteRow}>
              <TextInput
                value={inviteInput}
                onChangeText={setInviteInput}
                placeholder="@username or phone…"
                placeholderTextColor={theme.colors.muted}
                style={modal.inviteInput}
                onSubmitEditing={handleAddMember}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <Pressable onPress={handleAddMember} style={modal.addBtn}>
                <Text style={modal.addBtnText}>ADD</Text>
              </Pressable>
            </View>

            {members.map(m => (
              <View key={m.id} style={modal.memberRow}>
                <View style={[modal.memberAvatar, m.isYou && modal.memberAvatarSelf]}>
                  <Text style={modal.memberInitials}>{m.initials}</Text>
                </View>
                <View style={modal.memberInfo}>
                  <Text style={modal.memberName}>{m.name}</Text>
                  <Text style={modal.memberHandle}>{m.handle}</Text>
                </View>
                {m.isYou ? (
                  <View style={modal.youBadge}>
                    <Text style={modal.youBadgeText}>YOU</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => handleRemoveMember(m.id)} hitSlop={8}>
                    <Ionicons name="close" size={16} color={theme.colors.muted} />
                  </Pressable>
                )}
              </View>
            ))}

            <View style={modal.sectionHeader}>
              <Text style={modal.sectionLabel}>SHARE INVITE</Text>
            </View>

            <View style={modal.shareRow}>
              {[
                { icon: 'link-outline' as const,         label: 'Copy Link', onPress: handleCopyLink },
                { icon: 'qr-code-outline' as const,      label: 'QR Code',   onPress: () => showToast('Coming soon') },
                { icon: 'share-social-outline' as const, label: 'Story',     onPress: () => showToast('Coming soon') },
              ].map(({ icon, label, onPress }) => (
                <Pressable key={label} style={modal.shareBtn} onPress={onPress}>
                  <Ionicons name={icon} size={18} color={theme.colors.ink} />
                  <Text style={modal.shareBtnText}>{label.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <View style={modal.linkPill}>
              <Text style={modal.linkText} numberOfLines={1}>{inviteLink}</Text>
              <Pressable onPress={handleCopyLink}>
                <Text style={modal.linkCopy}>COPY</Text>
              </Pressable>
            </View>

            <Pressable style={modal.doneBtn} onPress={() => setInviteVisible(false)}>
              <Text style={modal.doneBtnText}>DONE</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Leave Confirmation Modal ── */}
      <Modal
        visible={leaveVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveVisible(false)}
      >
        <Pressable
          style={leaveModal.overlay}
          onPress={() => !isLeaving && setLeaveVisible(false)}
        >
          <Pressable style={leaveModal.card} onPress={() => {}}>
            <View style={leaveModal.iconWrap}>
              <Ionicons name="exit-outline" size={24} color="#C0392B" />
            </View>
            <Text style={leaveModal.title}>LEAVE HAUS?</Text>
            <Text style={leaveModal.body}>
              You'll be removed from{' '}
              <Text style={leaveModal.hausName}>{haus.name}</Text>
              {' '}and your shared pieces will no longer appear here.
            </Text>
            <View style={leaveModal.btnRow}>
              <Pressable
                style={leaveModal.cancelBtn}
                onPress={() => setLeaveVisible(false)}
                disabled={isLeaving}
              >
                <Text style={leaveModal.cancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[leaveModal.leaveBtn, isLeaving && leaveModal.leaveBtnDisabled]}
                onPress={confirmLeave}
                disabled={isLeaving}
              >
                <Text style={leaveModal.leaveText}>
                  {isLeaving ? 'LEAVING…' : 'LEAVE'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const leaveModal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%', backgroundColor: theme.colors.ivory,
    borderRadius: theme.borderRadius, borderWidth: 1.5,
    borderColor: theme.colors.ink, padding: 24, alignItems: 'center',
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF0EE', borderWidth: 1.5, borderColor: '#C0392B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 18,
    letterSpacing: 2, color: theme.colors.ink, textTransform: 'uppercase',
    marginBottom: 10,
  },
  body: {
    fontFamily: theme.fonts.interLight, fontSize: 13,
    color: theme.colors.muted, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  hausName: { fontFamily: theme.fonts.interSemiBold, color: theme.colors.ink },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
  },
  cancelText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: theme.colors.muted, letterSpacing: 1, textTransform: 'uppercase',
  },
  leaveBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#C0392B', borderRadius: theme.borderRadius,
  },
  leaveBtnDisabled: { opacity: 0.5 },
  leaveText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase',
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { paddingBottom: 32 },

  topBar: { paddingHorizontal: theme.spacing.md, paddingVertical: 12 },
  backText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  heroCard: {
    marginHorizontal: theme.spacing.md, marginBottom: 0,
    padding: 20, borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, backgroundColor: theme.colors.ivory,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.colors.ivory,
  },
  avatarInitial: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 13, color: theme.colors.ink },
  hausName: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 22,
    color: theme.colors.ink, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 6,
  },
  description: {
    fontFamily: theme.fonts.interLight, fontSize: 13,
    color: theme.colors.muted, lineHeight: 19, marginBottom: 16,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 20 },
  metaPill: { alignItems: 'center' },
  metaDivider: {
    width: 1, height: 24, backgroundColor: theme.colors.ivoryMid,
    marginHorizontal: 12,
  },
  metaValue: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 18, color: theme.colors.ink },
  metaLabel: {
    fontFamily: theme.fonts.barlowBold, fontSize: 8,
    color: theme.colors.muted, letterSpacing: 1.5,
    textTransform: 'uppercase', marginTop: 1,
  },

  actionRow: { flexDirection: 'row', gap: 10 },
  inviteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: theme.borderRadius,
  },
  inviteBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    color: theme.colors.yellowText, letterSpacing: 1, textTransform: 'uppercase',
  },
  leaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#C0392B',
    borderRadius: theme.borderRadius, backgroundColor: '#FFF0EE',
  },
  leaveBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    color: '#C0392B', letterSpacing: 1, textTransform: 'uppercase',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md, marginTop: 14,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, overflow: 'hidden',
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    backgroundColor: theme.colors.ivory,
  },
  tabBtnActive: { backgroundColor: theme.colors.ink },
  tabLabel: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9.5,
    letterSpacing: 0.8, color: theme.colors.muted, textTransform: 'uppercase',
  },
  tabLabelActive: { color: theme.colors.ivory },

  // Items tab
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
  },
  itemGrid: { paddingHorizontal: theme.spacing.md, gap: 10 },
  itemRow: { flexDirection: 'row', gap: 10 },

  emptyWrap: { paddingHorizontal: theme.spacing.md, paddingTop: 16 },
  emptyCard: {
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderStyle: 'dashed', borderRadius: theme.borderRadius,
    padding: 32, alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    color: theme.colors.ink, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.interLight, fontSize: 12,
    color: theme.colors.muted, textAlign: 'center', lineHeight: 18,
  },
});

const coll = StyleSheet.create({
  wrapper: { paddingHorizontal: theme.spacing.md, paddingTop: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },

  newCard: {
    flex: 1, aspectRatio: 1,
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderStyle: 'dashed', borderRadius: theme.borderRadius,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.ivory,
  },
  newCardText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    color: theme.colors.muted, letterSpacing: 1, textTransform: 'uppercase',
  },

  card: {
    flex: 1,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, overflow: 'hidden',
    backgroundColor: theme.colors.ivory,
  },
  thumbRow: { flexDirection: 'row' },
  thumb: {
    flex: 1, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 0.5, borderColor: theme.colors.ink,
  },
  cardBody: {
    paddingVertical: 8, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: theme.colors.ink,
  },
  cardName: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10.5,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  cardCount: {
    fontFamily: theme.fonts.interLight, fontSize: 10,
    color: theme.colors.muted, marginTop: 1,
  },

  emptyWrap: { paddingTop: 12 },
  emptyText: {
    fontFamily: theme.fonts.interLight, fontSize: 12,
    color: theme.colors.muted, textAlign: 'center', lineHeight: 18,
  },
});

const mem = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: theme.colors.ivoryMid,
    gap: 12,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSelf: { backgroundColor: theme.colors.yellow },
  initials: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 12, color: theme.colors.ink },
  name: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  handle: { fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted, marginTop: 1 },
  youBadge: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: theme.borderRadius,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  youBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 8,
    color: theme.colors.yellowText, letterSpacing: 1,
  },
});

const modal = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 2, borderBottomColor: theme.colors.ink,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 20,
    letterSpacing: 0.6, textTransform: 'uppercase', color: theme.colors.ink,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  sectionHeader: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.ivoryMid,
    paddingHorizontal: 18, paddingVertical: 8, marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    color: theme.colors.ink, letterSpacing: 1.5,
  },

  inviteRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 14 },
  inviteInput: {
    flex: 1, borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: theme.fonts.interLight, fontSize: 12, color: theme.colors.ink,
  },
  addBtn: {
    backgroundColor: theme.colors.ink, borderRadius: theme.borderRadius,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.ivory,
  },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: theme.colors.ivoryMid, gap: 12,
  },
  memberAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarSelf: { backgroundColor: theme.colors.yellow },
  memberInitials: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 11, color: theme.colors.ink },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  memberHandle: { fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted, marginTop: 1 },
  youBadge: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: theme.borderRadius,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  youBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 8,
    color: theme.colors.yellowText, letterSpacing: 1,
  },

  shareRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 8, marginBottom: 12 },
  shareBtn: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, backgroundColor: theme.colors.ivory,
  },
  shareBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 8,
    color: theme.colors.ink, letterSpacing: 0.8,
  },

  linkPill: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 18, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius, backgroundColor: theme.colors.ivoryDark,
    gap: 10, marginBottom: 28,
  },
  linkText: { flex: 1, fontFamily: theme.fonts.interRegular, fontSize: 11, color: theme.colors.muted },
  linkCopy: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    color: theme.colors.yellowText, backgroundColor: theme.colors.yellow,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.borderRadius, overflow: 'hidden', letterSpacing: 0.8,
  },

  doneBtn: {
    marginHorizontal: 18, backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    color: theme.colors.ivory, textTransform: 'uppercase', letterSpacing: 1.5,
  },
});
