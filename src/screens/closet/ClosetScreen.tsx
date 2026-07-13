import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import ItemCard from '../../components/ItemCard';
import NotificationBell from '../../components/NotificationBell';
import type { Item, Board, CoverStyle } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import { useCloset } from '../../context/ClosetContext';
import { useBoards } from '../../context/BoardsContext';

// ─── Board components ──────────────────────────────────────────────────────────

const THUMB_COLORS = ['#E8E4D4', '#E0DCD0', '#D8D4C8', '#E4DDD4'];

function BoardMosaicCover({ items, coverStyle }: { items: (Item | null)[]; coverStyle: CoverStyle }) {
  if (coverStyle === 'single') {
    return (
      <View style={{ height: 110 }}>
        {items[0]?.photo_url
          ? <Image source={{ uri: items[0].photo_url }} style={{ width: '100%', height: 110 }} resizeMode="cover" />
          : <View style={{ flex: 1, backgroundColor: THUMB_COLORS[0], alignItems: 'center', justifyContent: 'center' }}>
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
            : <View style={{ flex: 1, backgroundColor: THUMB_COLORS[0], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shirt-outline" size={18} color="#14120C" style={{ opacity: 0.12 }} />
              </View>
          }
        </View>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          {items[1]?.photo_url
            ? <Image source={{ uri: items[1].photo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ flex: 1, backgroundColor: THUMB_COLORS[1], alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shirt-outline" size={18} color="#14120C" style={{ opacity: 0.12 }} />
              </View>
          }
        </View>
      </View>
    );
  }

  // mosaic 2×2
  const slots: (Item | null)[] = [...items.slice(0, 4)];
  while (slots.length < 4) slots.push(null);
  return (
    <View style={{ height: 110, flexDirection: 'row', flexWrap: 'wrap' }}>
      {slots.map((item, i) => (
        <View key={i} style={{
          width: '50%', height: '50%', overflow: 'hidden',
          backgroundColor: THUMB_COLORS[i % 4],
          borderRightWidth: i % 2 === 0 ? 0.5 : 0,
          borderBottomWidth: i < 2 ? 0.5 : 0,
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
  const items = board.itemIds.map((id) => allItems.find((i) => i.id === id) ?? null);
  const visLabel = { public: 'Public', friends: 'Friends', hauses: 'Hauses' }[board.visibility];
  return (
    <View style={{ borderWidth: 1.5, borderColor: '#14120C', borderRadius: 2, overflow: 'hidden' }}>
      <BoardMosaicCover items={items} coverStyle={board.coverStyle} />
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

function BoardsGrid({
  boards, allItems, onBoardPress, onCreatePress,
}: {
  boards: Board[]; allItems: Item[];
  onBoardPress: (b: Board) => void;
  onCreatePress: () => void;
}) {
  const rows: (Board | 'new')[][] = [];
  const flat: (Board | 'new')[] = [...boards, 'new'];
  for (let i = 0; i < flat.length; i += 2) rows.push(flat.slice(i, i + 2));

  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 10 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((item) =>
            item === 'new' ? (
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
              <TouchableOpacity key={item.id} onPress={() => onBoardPress(item)} style={{ width: '47%' }}>
                <BoardCard board={item} allItems={allItems} />
              </TouchableOpacity>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Visibility legend ─────────────────────────────────────────────────────────

const LEGEND = [
  { key: 'public',  icon: 'globe-outline'  as const, bg: '#14120C', iconColor: '#FDFBF4', label: 'Public'  },
  { key: 'friends', icon: 'people-outline' as const, bg: '#FFFFAD', iconColor: '#3A3A00', label: 'Friends' },
  { key: 'hauses',  icon: 'home-outline'   as const, bg: '#F0EDE0', iconColor: '#7A7762', label: 'Hauses'  },
];

function VisibilityLegend() {
  return (
    <View style={legendStyles.row}>
      {LEGEND.map((l) => (
        <View key={l.key} style={legendStyles.item}>
          <View style={[legendStyles.icon, { backgroundColor: l.bg }]}>
            <Ionicons name={l.icon} size={8} color={l.iconColor} />
          </View>
          <Text style={legendStyles.label}>{l.label}</Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 4,
    paddingBottom: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  icon: {
    width: 14, height: 14, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: theme.fonts.interLight,
    fontSize: 9, color: theme.colors.muted,
  },
});

type ClosetTab = 'All' | 'Listed' | 'Lent Out' | 'Borrowed';
const TABS: ClosetTab[] = ['All', 'Listed', 'Lent Out', 'Borrowed'];

function filterItems(items: Item[], tab: ClosetTab): Item[] {
  switch (tab) {
    case 'Listed':   return items.filter((i) => i.status === 'available' || i.status === 'wash' || i.status === 'draft');
    case 'Lent Out': return items.filter((i) => i.status === 'lent');
    case 'Borrowed': return [];
    default:         return items;
  }
}

export default function ClosetScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { items: allItems, deleteItem } = useCloset();
  const { boards } = useBoards();
  const [activeTab,  setActiveTab]  = useState<ClosetTab>('All');
  const [viewMode,   setViewMode]   = useState<'gallery' | 'boards'>('gallery');

  const filteredItems = useMemo(() => filterItems(allItems, activeTab), [allItems, activeTab]);

  const handleItemPress = useCallback(
    (item: Item) => navigation.navigate('ItemDetail', { item }),
    [navigation],
  );

  const handleItemEdit = useCallback(
    (item: Item) => navigation.navigate('AddItem', { item }),
    [navigation],
  );

  const handleItemDelete = useCallback(
    (item: Item) => {
      Alert.alert(
        'Remove from closet',
        `Delete "${item.name}"? This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
        ],
      );
    },
    [deleteItem],
  );

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard
        item={item}
        onPress={() => handleItemPress(item)}
        onEdit={() => handleItemEdit(item)}
        onDelete={() => handleItemDelete(item)}
      />
    ),
    [handleItemPress, handleItemEdit, handleItemDelete],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={viewMode === 'gallery' ? filteredItems : []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={4}
        initialNumToRender={6}
        removeClippedSubviews
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {/* Header row */}
            <View style={styles.headerRow}>
              <Text style={styles.heading}>MY CLOSET</Text>
              <View style={styles.headerActions}>
                <NotificationBell />
                <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddItem')}>
                  <Ionicons name="add" size={18} color={theme.colors.yellowText} />
                  <Text style={styles.addButtonText}>ADD</Text>
                </Pressable>
              </View>
            </View>

            {/* Gallery / Boards toggle */}
            <View style={styles.viewToggle}>
              {([
                { key: 'gallery', icon: 'grid-outline',   label: 'Gallery' },
                { key: 'boards',  icon: 'albums-outline', label: 'Boards'  },
              ] as const).map((opt, i) => {
                const active = viewMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setViewMode(opt.key)}
                    style={[styles.viewToggleBtn, active && styles.viewToggleBtnActive, i === 0 && styles.viewToggleBtnBorder]}
                  >
                    <Ionicons name={opt.icon} size={13} color={active ? '#3A3A00' : '#7A7762'} />
                    <Text style={[styles.viewToggleText, active && styles.viewToggleTextActive]}>
                      {opt.label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {viewMode === 'boards' ? (
              <BoardsGrid
                boards={boards}
                allItems={allItems}
                onBoardPress={(b) => navigation.navigate('BoardDetail', { boardId: b.id })}
                onCreatePress={() => navigation.navigate('CreateBoard')}
              />
            ) : (
              <>
                {/* Tab row */}
                <View style={styles.tabRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
                    {TABS.map((tab) => {
                      const isActive = activeTab === tab;
                      return (
                        <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, isActive && styles.tabActive]}>
                          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.toUpperCase()}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <Text style={styles.resultsLabel}>Your pieces — {filteredItems.length}</Text>
              </>
            )}
          </>
        }
        ListFooterComponent={viewMode === 'gallery' && filteredItems.length > 0 ? <VisibilityLegend /> : null}
        ListEmptyComponent={viewMode === 'gallery' ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>NO PIECES HERE YET</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: 8,
  },
  columnWrapper: {
    gap: 8,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 12,
  },
  heading: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    height: 38,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.yellow,
    borderWidth: 2,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addButtonText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  // View toggle
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 18, marginTop: 10, marginBottom: 4,
    borderWidth: 1.5, borderColor: '#14120C', borderRadius: 2, overflow: 'hidden',
  },
  viewToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 7, backgroundColor: 'transparent',
  },
  viewToggleBtnActive: { backgroundColor: '#FFFFAD' },
  viewToggleBtnBorder: { borderRightWidth: 1, borderRightColor: '#14120C' },
  viewToggleText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#7A7762',
  },
  viewToggleTextActive: { color: '#3A3A00' },

  // Tab row
  tabRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ink,
    marginBottom: 0,
  },
  tabContent: {
    paddingHorizontal: theme.spacing.md,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
  },
  tabActive: {
    backgroundColor: theme.colors.yellow,
  },
  tabText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: theme.colors.yellowText,
  },

  // Wash item horizontal card
  washCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
    margin: theme.spacing.md,
    marginBottom: 8,
    backgroundColor: theme.colors.ivory,
  },
  washImageContainer: {
    width: 80,
    height: 80,
  },
  washImage: {
    width: 80,
    height: 80,
  },
  washInfo: {
    flex: 1,
    padding: 10,
    gap: 3,
  },
  washItemName: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  washLender: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
  },
  washPrice: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 11,
    color: theme.colors.ink,
  },
  washTagRow: {
    flexDirection: 'row',
    marginTop: 2,
  },

  // Results label
  resultsLabel: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 13,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
