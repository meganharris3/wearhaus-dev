import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import ItemCard from '../../components/ItemCard';
import NotificationBell from '../../components/NotificationBell';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import { useCloset } from '../../context/ClosetContext';

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
  const [activeTab, setActiveTab] = useState<ClosetTab>('All');

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
        data={filteredItems}
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
                {/* Bell */}
                <NotificationBell />
                {/* Add */}
                <Pressable style={styles.addButton} onPress={() => navigation.navigate('AddItem')}>
                  <Ionicons name="add" size={18} color={theme.colors.yellowText} />
                  <Text style={styles.addButtonText}>ADD</Text>
                </Pressable>
              </View>
            </View>

            {/* Tab row */}
            <View style={styles.tabRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabContent}
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[styles.tab, isActive && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                        {tab.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Results label */}
            <Text style={styles.resultsLabel}>
              Your pieces — {filteredItems.length}
            </Text>
          </>
        }
        ListFooterComponent={filteredItems.length > 0 ? <VisibilityLegend /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>NO PIECES HERE YET</Text>
          </View>
        }
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
