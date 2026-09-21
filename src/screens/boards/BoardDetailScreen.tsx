import React, { useState } from 'react';
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useBoards } from '../../context/BoardsContext';
import { useCloset } from '../../context/ClosetContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Item } from '../../types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'BoardDetail'>;

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_MARGIN = 14;
const HERO_WIDTH  = SCREEN_W - HERO_MARGIN * 2 - 3; // 1.5 border each side
const HERO_HEIGHT = Math.round(HERO_WIDTH * 0.5 * (4 / 3)); // left col half-width × 4:3

const THUMB_COLORS = ['#E8E4D4', '#E0DCD0', '#D8D4C8', '#E4DDD4'];

const VIS_LABELS: Record<string, string> = {
  public: 'Public', friends: 'Friends', hauses: 'Hauses',
};
const VIS_COLORS: Record<string, { bg: string; color: string }> = {
  public:  { bg: '#14120C', color: '#FDFBF4' },
  friends: { bg: '#FFFFAD', color: '#3A3A00' },
  hauses:  { bg: '#F0EDE0', color: '#7A7762' },
};

function ItemTile({ item, style }: { item: Item | null; style?: object }) {
  if (!item) {
    return <View style={[{ flex: 1, backgroundColor: '#E8E4D4' }, style]} />;
  }
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      {item.photo_url
        ? <Image source={{ uri: item.photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        : (
          <View style={{ flex: 1, backgroundColor: '#E8E4D4', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shirt-outline" size={20} color={theme.colors.ink} style={{ opacity: 0.15 }} />
          </View>
        )
      }
    </View>
  );
}

function ItemListRow({
  item, boardId, onViewItem, onRemove, onMove,
}: {
  item: Item; boardId: string;
  onViewItem: (item: Item) => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string) => void;
}) {
  function openMenu() {
    Alert.alert(
      item.name,
      undefined,
      [
        { text: 'View item',             onPress: () => onViewItem(item) },
        { text: 'Remove from this board', style: 'destructive', onPress: () => onRemove(item.id) },
        { text: 'Move to another board', onPress: () => onMove(item.id) },
        { text: 'Cancel',                style: 'cancel' },
      ],
    );
  }

  return (
    <Pressable onPress={() => onViewItem(item)} style={styles.listRow}>
      <View style={styles.listThumb}>
        {item.photo_url
          ? <Image source={{ uri: item.photo_url }} style={styles.listThumbImg} resizeMode="cover" />
          : (
            <View style={[styles.listThumbImg, styles.listThumbPlaceholder]}>
              <Ionicons name="shirt-outline" size={16} color={theme.colors.ink} style={{ opacity: 0.15 }} />
            </View>
          )
        }
      </View>
      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.listSub}>{item.size_label} · ${(item.price_per_day / 100).toFixed(0)}/day</Text>
      </View>
      <Pressable onPress={openMenu} hitSlop={10} style={styles.menuBtn}>
        <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.muted} />
      </Pressable>
    </Pressable>
  );
}

export default function BoardDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { boardId } = route.params;
  const { boards, removeItemFromBoard, moveItemToBoard } = useBoards();
  const { items: allItems } = useCloset();

  const board = boards.find((b) => b.id === boardId);

  if (!board) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBar}>
          <Text style={styles.backText}>← CLOSET</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.emptyTitle}>Board not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const boardItems = board.itemIds
    .map((id) => allItems.find((i) => i.id === id) ?? null)
    .filter((i): i is Item => i !== null);

  const heroItems = boardItems.slice(0, 3);
  const listItems = boardItems.slice(3);

  const visCfg = VIS_COLORS[board.visibility];

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function handleRemove(itemId: string) {
    run(() => removeItemFromBoard(boardId, itemId));
  }

  function handleMove(itemId: string) {
    const otherBoards = boards.filter((b) => b.id !== boardId);
    if (otherBoards.length === 0) {
      Alert.alert('No other boards', 'Create another board first.');
      return;
    }
    Alert.alert(
      'Move to board',
      'Choose a destination:',
      [
        ...otherBoards.map((b) => ({
          text: b.name,
          onPress: () => run(() => moveItemToBoard(boardId, b.id, itemId)),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }

  function handleViewItem(item: Item) {
    navigation.navigate('ItemDetail', { item });
  }

  function openAddItems() {
    navigation.navigate('AddItemsToBoard', { boardId: boardId });
  }

  function openEdit() {
    navigation.navigate('CreateBoard', { boardId: boardId });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header row */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← CLOSET</Text>
        </Pressable>
        <Text style={styles.boardName} numberOfLines={1}>{board.name.toUpperCase()}</Text>
        <Pressable onPress={openEdit} style={styles.editBtn}>
          <Text style={styles.editBtnText}>EDIT</Text>
        </Pressable>
      </View>

      {/* Sub-header */}
      <View style={styles.subHeader}>
        <Text style={styles.itemCount}>{boardItems.length} items</Text>
        <View style={[styles.visBadge, { backgroundColor: visCfg.bg }]}>
          <Text style={[styles.visBadgeText, { color: visCfg.color }]}>
            {VIS_LABELS[board.visibility]}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable onPress={openAddItems} style={styles.addItemsBtn}>
          <Ionicons name="add" size={12} color={theme.colors.ink} />
          <Text style={styles.addItemsBtnText}>ADD ITEMS</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {boardItems.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyWrap}>
            <Ionicons name="albums-outline" size={32} color="#E2DED0" />
            <Text style={styles.emptyTitle}>EMPTY BOARD</Text>
            <Text style={styles.emptySubtitle}>Add items from your closet to get started.</Text>
            <Pressable style={styles.emptyAddBtn} onPress={openAddItems}>
              <Ionicons name="add" size={14} color={theme.colors.yellowText} />
              <Text style={styles.emptyAddBtnText}>ADD ITEMS</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Pinterest hero */}
            <View style={styles.hero}>
              {/* Left — tall card */}
              <View style={{ width: '50%', height: HERO_HEIGHT }}>
                <ItemTile item={heroItems[0] ?? null} style={{ height: HERO_HEIGHT }} />
              </View>

              {/* Right — two stacked */}
              <View style={{ flex: 1, height: HERO_HEIGHT, gap: 1 }}>
                <ItemTile item={heroItems[1] ?? null} style={{ flex: 1 }} />
                <ItemTile item={heroItems[2] ?? null} style={{ flex: 1 }} />
              </View>
            </View>

            {/* Remaining list rows */}
            {listItems.length > 0 && (
              <View style={styles.listSection}>
                <View style={styles.listSectionHeader}>
                  <Text style={styles.listSectionLabel}>MORE PIECES</Text>
                </View>
                {listItems.map((item) => (
                  <ItemListRow
                    key={item.id}
                    item={item}
                    boardId={board.id}
                    onViewItem={handleViewItem}
                    onRemove={handleRemove}
                    onMove={handleMove}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  scrollContent: { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
    gap: 10,
  },
  backBtn: {},
  backText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  boardName: {
    flex: 1, fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 18, letterSpacing: 1, color: theme.colors.ink,
    textAlign: 'center',
  },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
  },
  editBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 1, color: theme.colors.muted,
  },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  itemCount: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11, color: theme.colors.muted,
  },
  visBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 2,
  },
  visBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8, letterSpacing: 1, textTransform: 'uppercase',
  },
  addItemsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
  },
  addItemsBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 0.8, color: theme.colors.ink,
  },

  hero: {
    flexDirection: 'row', gap: 1,
    marginHorizontal: HERO_MARGIN, marginTop: 12,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, overflow: 'hidden',
    backgroundColor: theme.colors.ink,
  },

  listSection: { marginTop: 16 },
  listSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.ivoryMid,
    marginBottom: 2,
  },
  listSectionLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 1.5, color: theme.colors.muted,
  },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: theme.colors.ivoryMid,
  },
  listThumb: {
    width: 60, height: 60, borderRadius: 2,
    borderWidth: 1, borderColor: theme.colors.ivoryMid, overflow: 'hidden',
  },
  listThumbImg: { width: 60, height: 60 },
  listThumbPlaceholder: {
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  listName: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink, marginBottom: 3,
  },
  listSub: {
    fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted,
  },
  menuBtn: { padding: 4 },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14, letterSpacing: 1.5, color: theme.colors.ink,
    marginTop: 16, marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13, color: theme.colors.muted,
    textAlign: 'center', lineHeight: 19, marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5, borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
  },
  emptyAddBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11, letterSpacing: 1, color: theme.colors.yellowText,
  },
});
