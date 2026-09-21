import React, { useEffect, useState } from 'react';
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
import StatusTag from '../../components/StatusTag';
import Chip from '../../components/Chip';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import {
  useHausCollections,
  type HausCollection,
} from '../../context/HausCollectionsContext';
import { fetchMembershipRole, fetchAllHausMembers, type HausMemberRow } from '../../services/hausService';
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

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

// ─── HausHeader — compact, text-only, no avatar ──────────────────────────────

function HausFact({ num, label }: { num: number; label: string }) {
  return (
    <Text style={header.fact}>
      <Text style={header.factNum}>{num}</Text> {label}
    </Text>
  );
}

function FactDot() {
  return <View style={header.dot} />;
}

function HausHeader({
  name,
  isOwner,
  isEditingName,
  nameInput,
  onChangeNameInput,
  onStartEdit,
  onSubmitEdit,
  onCancelEdit,
  memberCount,
  pieceCount,
  collectionCount,
  onBack,
}: {
  name: string;
  isOwner: boolean;
  isEditingName: boolean;
  nameInput: string;
  onChangeNameInput: (v: string) => void;
  onStartEdit: () => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  memberCount: number;
  pieceCount: number;
  collectionCount: number;
  onBack: () => void;
}) {
  return (
    <View style={header.wrap}>
      <View style={header.topRow}>
        <TouchableOpacity onPress={onBack} style={header.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={header.backText}>Hauses</Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity onPress={onStartEdit} style={header.editBtn} hitSlop={8}>
            <Ionicons name="pencil" size={12} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>

      {isEditingName ? (
        <View style={header.editRow}>
          <TextInput
            value={nameInput}
            onChangeText={onChangeNameInput}
            onSubmitEditing={onSubmitEdit}
            returnKeyType="done"
            autoFocus
            autoCapitalize="words"
            style={header.editInput}
          />
          <Pressable onPress={onSubmitEdit} hitSlop={8}>
            <Ionicons name="checkmark" size={20} color={theme.colors.ivory} />
          </Pressable>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      ) : (
        <Text style={header.title}>{name}</Text>
      )}

      <View style={header.factsRow}>
        <HausFact num={memberCount} label="members" />
        <FactDot />
        <HausFact num={pieceCount} label="pieces" />
        <FactDot />
        <HausFact num={collectionCount} label="collections" />
      </View>
    </View>
  );
}

// ─── ActionRow — rounded Invite / Leave buttons ──────────────────────────────

function ActionRow({ onInvite, onLeave }: { onInvite: () => void; onLeave: () => void }) {
  return (
    <View style={action.row}>
      <TouchableOpacity onPress={onInvite} style={action.inviteBtn}>
        <Ionicons name="person-add-outline" size={12} color={theme.colors.yellowText} />
        <Text style={action.inviteText}>Invite</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onLeave} style={action.leaveBtn}>
        <Ionicons name="log-out-outline" size={12} color={theme.colors.muted} />
        <Text style={action.leaveText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── HausTabRow — yellow-fill pills ───────────────────────────────────────────

function HausTabRow({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <View style={tabs.row}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={[tabs.pill, activeTab === tab.key && tabs.pillActive]}
        >
          <Text style={[tabs.label, activeTab === tab.key && tabs.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── HausCollectionCard — 12px rounded, 2×2 mosaic cover ─────────────────────

function resolveCollectionItem(id: string, closetItems: Item[]) {
  const real = closetItems.find(i => i.id === id);
  if (real) return { ownerId: real.owner_id as string | undefined, photoUrl: real.photo_url, thumbColor: '#E4E0D0' };
  return { ownerId: undefined as string | undefined, photoUrl: undefined, thumbColor: '#EEEAE0' };
}

function HausCollectionCard({
  collection,
  onPress,
}: {
  collection: HausCollection;
  onPress: () => void;
}) {
  const { items: closetItems } = useCloset();
  // collection.itemIds is populated lazily (only in CollectionDetailScreen via
  // fetchCollectionItems), so the grid preview tiles/contributor count are
  // blank until that screen has been visited — but itemCount comes straight
  // from the service and is always accurate.
  const resolved = collection.itemIds.map(id => resolveCollectionItem(id, closetItems));
  const contributorCount = new Set(resolved.map(r => r.ownerId).filter(Boolean)).size;
  const tiles = [0, 1, 2, 3].map(i => resolved[i]);
  const count = collection.itemCount;

  return (
    <TouchableOpacity onPress={onPress} style={coll.card} activeOpacity={0.85}>
      <View style={coll.mosaic}>
        {tiles.map((tile, i) => (
          <View
            key={i}
            style={[
              coll.tile,
              { backgroundColor: tile?.thumbColor ?? '#EEEAE0' },
              i % 2 === 0 && coll.tileRightBorder,
              i < 2 && coll.tileBottomBorder,
            ]}
          >
            {tile?.photoUrl ? (
              <Image source={{ uri: tile.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <Ionicons name="shirt-outline" size={18} color={theme.colors.ink} style={{ opacity: 0.15 }} />
            )}
          </View>
        ))}
      </View>
      <View style={coll.cardBody}>
        <Text numberOfLines={1} style={coll.cardName}>{collection.name}</Text>
        <Text style={coll.cardCount}>
          {count} item{count !== 1 ? 's' : ''} · {contributorCount} contributor{contributorCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── HausCollectionsGrid — Collections as dominant content ───────────────────

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
  return (
    <View style={coll.wrapper}>
      <View style={coll.headerRow}>
        <Text style={coll.headerLabel}>Collections</Text>
        <Text style={coll.headerCount}>{collections.length} total</Text>
      </View>

      <View style={coll.grid}>
        {collections.map(c => (
          <View key={c.id} style={coll.gridItem}>
            <HausCollectionCard collection={c} onPress={() => onCollectionPress(c)} />
          </View>
        ))}

        <TouchableOpacity
          onPress={onCreatePress}
          style={[coll.gridItem, coll.newCard]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color={theme.colors.ivoryMid} />
          <Text style={coll.newCardText}>New Collection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── HausItemGrid — All Items tab, sharp grid with owner badges ─────────────

function HausItemGrid({
  items,
  myId,
  myInitials,
  onItemPress,
}: {
  items: Item[];
  myId?: string;
  myInitials: string;
  onItemPress: (item: Item) => void;
}) {
  return (
    <>
      <View style={itemGrid.header}>
        <Text style={itemGrid.headerLabel}>All Items</Text>
        <Text style={itemGrid.headerCount}>{items.length} pieces</Text>
      </View>

      <View style={itemGrid.grid}>
        {items.map(item => {
          const isMine = !!myId && item.owner_id === myId;
          const initials = item.owner?.display_name
            ? item.owner.display_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
            : isMine ? myInitials : '?';
          return (
            <TouchableOpacity key={item.id} style={itemGrid.cell} onPress={() => onItemPress(item)}>
              <View style={itemGrid.photo}>
                <View style={itemGrid.tagWrap}>
                  <StatusTag status={item.status} />
                </View>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Ionicons name="shirt-outline" size={16} color={theme.colors.ink} style={{ opacity: 0.12 }} />
                )}
                <View style={[
                  itemGrid.ownerBadge,
                  { backgroundColor: isMine ? theme.colors.yellow : theme.colors.ivoryMid },
                ]}>
                  <Text style={itemGrid.ownerInitials}>{initials}</Text>
                </View>
              </View>
              <View style={itemGrid.cellBody}>
                <Text numberOfLines={1} style={itemGrid.cellName}>{item.name}</Text>
                <Text style={itemGrid.cellPrice}>${(item.price_per_day / 100).toFixed(2)}/day</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

// ─── HausMembersList ─────────────────────────────────────────────────────────

function HausMembersList({ members, myId }: { members: HausMemberRow[]; myId?: string }) {
  if (members.length === 0) {
    return <Text style={mem.empty}>No members yet.</Text>;
  }
  return (
    <View style={{ paddingTop: 4 }}>
      {members.map(m => {
        const isYou = !!myId && m.userId === myId;
        const initials = m.displayName.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return (
          <View key={m.userId} style={mem.row}>
            <View style={[mem.avatar, isYou && mem.avatarSelf]}>
              {m.avatarUrl ? (
                <Image source={{ uri: m.avatarUrl }} style={mem.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={mem.initials}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={mem.name}>{m.displayName}</Text>
              <Text style={mem.handle}>{m.role === 'admin' ? 'Admin' : 'Member'}</Text>
            </View>
            {isYou && (
              <View style={mem.youBadge}>
                <Text style={mem.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>
        );
      })}
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
  const { user, profile } = useAuth();
  const { getCollectionsForHaus, loadCollectionsForHaus } = useHausCollections();

  const [activeTab,    setActiveTab]    = useState<Tab>('items');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [leaveVisible,  setLeaveVisible]  = useState(false);
  const [isLeaving,     setIsLeaving]     = useState(false);
  const [filter,        setFilter]        = useState<ItemFilter>('all');
  const [localName,     setLocalName]     = useState(haus.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput,     setNameInput]     = useState(haus.name);
  const [isOwner,       setIsOwner]       = useState(false);
  const [members, setMembers] = useState<HausMemberRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setIsOwner(false); return; }
    fetchMembershipRole(haus.id, user.id)
      .then(role => { if (!cancelled) setIsOwner(role === 'admin'); })
      .catch(() => { if (!cancelled) setIsOwner(false); });
    return () => { cancelled = true; };
  }, [haus.id, user?.id]);

  useEffect(() => {
    let cancelled = false;
    fetchAllHausMembers(haus.id)
      .then(rows => { if (!cancelled) setMembers(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [haus.id]);

  useEffect(() => {
    loadCollectionsForHaus(haus.id);
  }, [haus.id, loadCollectionsForHaus]);

  const hausItems = allItems.filter(item => item.haus_visibility?.[haus.id] === true);
  const filteredItems = hausItems.filter(item => {
    if (filter === 'mine')      return item.owner_id === 'me' || (user != null && item.owner_id === user.id);
    if (filter === 'available') return item.status === 'available';
    return true;
  });
  const collections = getCollectionsForHaus(haus.id);
  const myInitials = profile?.display_name
    ? profile.display_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';

  async function handleRename() {
    const trimmed = nameInput.trim();
    setIsEditingName(false);
    if (!trimmed || trimmed === localName) return;
    const prev = localName;
    setLocalName(trimmed);
    try { await renameHaus(haus.id, trimmed); } catch { setLocalName(prev); }
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

  const inviteLink = INVITE_LINK + localName.toLowerCase().replace(/\s+/g, '-').slice(0, 16);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <HausHeader
          name={localName}
          isOwner={isOwner}
          isEditingName={isEditingName}
          nameInput={nameInput}
          onChangeNameInput={setNameInput}
          onStartEdit={() => { setNameInput(localName); setIsEditingName(true); }}
          onSubmitEdit={handleRename}
          onCancelEdit={() => setIsEditingName(false)}
          memberCount={haus.member_count}
          pieceCount={hausItems.length}
          collectionCount={collections.length}
          onBack={() => navigation.goBack()}
        />

        <ActionRow
          onInvite={() => setInviteVisible(true)}
          onLeave={() => setLeaveVisible(true)}
        />

        <HausTabRow activeTab={activeTab} onTabChange={setActiveTab} />

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
              <HausItemGrid
                items={filteredItems}
                myId={user?.id}
                myInitials={myInitials}
                onItemPress={item => navigation.navigate('ItemDetail', { item })}
              />
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
          <HausMembersList members={members} myId={user?.id} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Floating add-items button ── */}
      <Pressable
        onPress={() => navigation.navigate('AddItemsToHaus', { hausId: haus.id, hausName: localName })}
        hitSlop={4}
        style={fab.button}
      >
        <Ionicons name="add" size={20} color={theme.colors.yellowText} />
        <Text style={fab.label}>ADD ITEMS</Text>
      </Pressable>

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
              <Text style={modal.sectionLabel}>IN THIS HAUS</Text>
            </View>

            <HausMembersList members={members} myId={user?.id} />

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

  // Items tab
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
  },
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

const fab = StyleSheet.create({
  button: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12, paddingHorizontal: 18,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: 28,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 12,
    letterSpacing: 1, color: theme.colors.yellowText,
  },
});

const header = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.ink,
    paddingTop: 36, paddingHorizontal: theme.spacing.md, paddingBottom: 36,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)',
  },
  editBtn: {
    width: 26, height: 26, borderRadius: 2,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 22,
    letterSpacing: 0.4, textTransform: 'uppercase',
    color: theme.colors.ivory, lineHeight: 23, marginBottom: 2,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  editInput: {
    flex: 1, fontFamily: theme.fonts.barlowExtraBold, fontSize: 22,
    letterSpacing: 0.4, textTransform: 'uppercase', color: theme.colors.ivory,
    borderBottomWidth: 1.5, borderBottomColor: theme.colors.ivory, paddingVertical: 2,
  },
  factsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  fact: { fontFamily: theme.fonts.interRegular, fontSize: 11, color: theme.colors.yellow },
  factNum: { fontFamily: theme.fonts.interSemiBold },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,173,0.4)' },
});

const action = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7, paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  inviteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: theme.colors.yellow, borderWidth: 1.5, borderColor: '#C8C820',
    borderRadius: 10, paddingVertical: 8,
  },
  inviteText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    letterSpacing: 0.6, textTransform: 'uppercase', color: theme.colors.yellowText,
  },
  leaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: 10, paddingVertical: 8,
  },
  leaveText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    letterSpacing: 0.6, textTransform: 'uppercase', color: theme.colors.muted,
  },
});

const tabs = StyleSheet.create({
  row: {
    flexDirection: 'row', paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1.5, borderBottomColor: theme.colors.ink,
    gap: 6, alignItems: 'center',
  },
  pill: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.borderRadius, marginVertical: 6,
    backgroundColor: 'transparent',
  },
  pillActive: { backgroundColor: theme.colors.yellow },
  label: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    letterSpacing: 0.8, textTransform: 'uppercase', color: theme.colors.muted,
  },
  labelActive: { color: theme.colors.yellowText },
});

const itemGrid = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingTop: 18, paddingBottom: 8,
  },
  headerLabel: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 12,
    letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.ink,
  },
  headerCount: { fontFamily: theme.fonts.interRegular, fontSize: 10, color: theme.colors.muted },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: theme.borderRadius,
    overflow: 'hidden', backgroundColor: theme.colors.ink,
    marginHorizontal: theme.spacing.md, marginBottom: 16,
  },
  cell: { width: '33.333%' },
  photo: {
    aspectRatio: 3 / 4, backgroundColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
  },
  tagWrap: { position: 'absolute', top: 4, left: 4, zIndex: 1 },
  ownerBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.ivory,
    alignItems: 'center', justifyContent: 'center',
  },
  ownerInitials: { fontFamily: theme.fonts.interSemiBold, fontSize: 6, color: theme.colors.ink },
  cellBody: {
    padding: 5, borderTopWidth: 0.5, borderTopColor: theme.colors.ivoryMid,
    backgroundColor: theme.colors.ivory,
  },
  cellName: { fontFamily: theme.fonts.interSemiBold, fontSize: 9, color: theme.colors.ink },
  cellPrice: { fontFamily: theme.fonts.interLight, fontSize: 9, color: theme.colors.muted },
});

const coll = StyleSheet.create({
  wrapper: { paddingTop: 14 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: theme.spacing.md, paddingBottom: 8,
  },
  headerLabel: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 12,
    letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.ink,
  },
  headerCount: { fontFamily: theme.fonts.interRegular, fontSize: 10, color: theme.colors.muted },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: theme.spacing.md,
  },
  gridItem: { width: '47%' },

  card: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.ivory,
  },
  mosaic: { height: 114, flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: '50%', height: '50%', alignItems: 'center', justifyContent: 'center' },
  tileRightBorder: { borderRightWidth: 0.5, borderRightColor: theme.colors.ink },
  tileBottomBorder: { borderBottomWidth: 0.5, borderBottomColor: theme.colors.ink },
  cardBody: {
    paddingVertical: 9, paddingHorizontal: 11,
    borderTopWidth: 0.5, borderTopColor: theme.colors.ivoryMid,
  },
  cardName: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 12,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2,
  },
  cardCount: {
    fontFamily: theme.fonts.interLight, fontSize: 9.5,
    color: theme.colors.muted,
  },

  newCard: {
    height: 165,
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid, borderStyle: 'dashed',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  newCardText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    color: theme.colors.muted, letterSpacing: 1, textTransform: 'uppercase',
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
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  empty: { fontFamily: theme.fonts.interLight, fontSize: 12, color: theme.colors.muted, textAlign: 'center', paddingVertical: 24 },
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
