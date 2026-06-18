import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';
import Masthead from '../../components/Masthead';
import SearchBar from '../../components/SearchBar';
import ItemCard from '../../components/ItemCard';
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

const TABS = ['All', 'Date Night', 'Festival', 'Formal', 'Casual'];

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [activeTab, setActiveTab]   = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
        data={MOCK_ITEMS}
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
            {/* Masthead */}
            <Masthead />

            {/* Horizontal tab pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
              style={styles.tabsScroll}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.pill, isActive && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                      {tab.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Search bar */}
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search size, style, occasion…"
            />

            {/* Hero banner */}
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>
                WEARHAUS · CAMPUS EXCHANGE · NYU
              </Text>
              <Text style={styles.heroHeadline}>
                SHARE{' '}
                <Text style={styles.heroHeadlineYellow}>YOUR</Text>
                {' '}CLOSET
              </Text>
              <Text style={styles.heroBody}>
                Rent from your campus community. List what you own.
              </Text>
              <Pressable style={styles.heroCta}>
                <Text style={styles.heroCtaText}>EXPLORE NOW</Text>
              </Pressable>
            </View>

            {/* Section divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>NEAR CAMPUS</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
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

  // Tabs
  tabsScroll: {
    marginBottom: 0,
  },
  tabsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.ivory,
    borderWidth: 1,
    borderColor: theme.colors.ink,
  },
  pillActive: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  pillText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: theme.colors.yellowText,
  },

  // Hero
  hero: {
    backgroundColor: theme.colors.ink,
    padding: 20,
    marginHorizontal: theme.spacing.md,
    marginBottom: 16,
    borderRadius: theme.borderRadius,
  },
  heroKicker: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.yellow,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroHeadline: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 32,
    color: theme.colors.ivory,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    lineHeight: 36,
  },
  heroHeadlineYellow: {
    color: theme.colors.yellow,
  },
  heroBody: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  heroCta: {
    backgroundColor: theme.colors.yellow,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  heroCtaText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Section divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: 8,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.ink,
  },
  dividerLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
