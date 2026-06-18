import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';
import ItemCard from '../../components/ItemCard';
import StatusTag from '../../components/StatusTag';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';

const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    name: 'Silk Slip Dress',
    owner_id: '1',
    category: 'dress',
    size_label: 'S',
    price_per_day: 800,
    status: 'available',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '2',
    name: 'Black Blazer',
    owner_id: '1',
    category: 'jacket',
    size_label: 'M',
    price_per_day: 500,
    status: 'lent',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '3',
    name: 'Festival Cowboy Boots',
    owner_id: '2',
    category: 'shoes',
    size_label: 'US 8',
    price_per_day: 600,
    status: 'available',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    owner: { id: '2', display_name: 'Jordan Reyes' },
  },
  {
    id: '4',
    name: 'Sequin Mini Skirt',
    owner_id: '1',
    category: 'skirt',
    size_label: 'XS',
    price_per_day: 700,
    status: 'wash',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '5',
    name: 'Velvet Blazer',
    owner_id: '2',
    category: 'jacket',
    size_label: 'M',
    price_per_day: 900,
    status: 'available',
    location_label: '1.2 mi · Columbia',
    photo_url: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400',
    owner: { id: '2', display_name: 'Jordan Reyes' },
  },
  {
    id: '6',
    name: 'Emerald Gown',
    owner_id: '3',
    category: 'dress',
    size_label: 'XS',
    price_per_day: 1200,
    status: 'available',
    location_label: '0.5 mi · NYU Stern',
    photo_url: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400',
    owner: { id: '3', display_name: 'Priya Patel' },
  },
];

type ClosetTab = 'All' | 'Listed' | 'Lent Out' | 'Borrowed';
const TABS: ClosetTab[] = ['All', 'Listed', 'Lent Out', 'Borrowed'];

function filterItems(items: Item[], tab: ClosetTab): Item[] {
  switch (tab) {
    case 'Listed':   return items.filter((i) => i.status === 'available' || i.status === 'wash');
    case 'Lent Out': return items.filter((i) => i.status === 'lent');
    case 'Borrowed': return []; // No borrowed mock data
    default:         return items;
  }
}

export default function ClosetScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [activeTab, setActiveTab] = useState<ClosetTab>('All');

  const filteredItems = useMemo(() => filterItems(MOCK_ITEMS, activeTab), [activeTab]);
  const washItem = useMemo(() => MOCK_ITEMS.find((i) => i.status === 'wash'), []);

  const handleItemPress = useCallback(
    (item: Item) => navigation.navigate('ItemDetail', { item }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard item={item} onPress={() => handleItemPress(item)} />
    ),
    [handleItemPress],
  );

  return (
    <SafeAreaView style={styles.safe}>
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
              <Pressable style={styles.addButton}>
                <Text style={styles.addButtonText}>+ ADD</Text>
              </Pressable>
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

            {/* Wash item horizontal card (always show if exists and on All/Listed tabs) */}
            {washItem && (activeTab === 'All' || activeTab === 'Listed') && (
              <Pressable
                onPress={() => navigation.navigate('ItemDetail', { item: washItem })}
                style={styles.washCard}
              >
                <View style={styles.washImageContainer}>
                  {washItem.photo_url ? (
                    <Image
                      source={{ uri: washItem.photo_url }}
                      style={styles.washImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.washImage, { backgroundColor: theme.colors.ivoryMid }]} />
                  )}
                </View>
                <View style={styles.washInfo}>
                  <Text style={styles.washItemName} numberOfLines={1}>
                    {washItem.name.toUpperCase()}
                  </Text>
                  <Text style={styles.washLender} numberOfLines={1}>
                    {washItem.owner?.display_name ?? ''}
                  </Text>
                  <Text style={styles.washPrice}>
                    ${(washItem.price_per_day / 100).toFixed(2)}/day
                  </Text>
                  <View style={styles.washTagRow}>
                    <StatusTag status={washItem.status} />
                  </View>
                </View>
              </Pressable>
            )}

            {/* Results label */}
            <Text style={styles.resultsLabel}>
              Your pieces — {filteredItems.length}
            </Text>
          </>
        }
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
  addButton: {
    backgroundColor: theme.colors.yellow,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
