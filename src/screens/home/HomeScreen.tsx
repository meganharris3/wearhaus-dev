import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Masthead from '../../components/Masthead';
import SearchBar from '../../components/SearchBar';
import ItemCard from '../../components/ItemCard';
import { useFriends } from '../../context/FriendsContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import { getVisibleItems } from '../../utils/visibilityFilter';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AppTabsParamList } from '../../navigation/AppTabs';

type AudienceFilter = 'all' | 'friends' | 'hauses';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Home'>,
  NavigationProp<AppStackParamList>
>;

const MOCK_ITEMS: Item[] = [
  {
    id: '1',
    name: 'Ribbed Cami Mini Dress',
    owner_id: '1',
    category: 'dress',
    size_label: 'XS/S',
    price_per_day: 800,
    status: 'available',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1726837214001-e1361c51732e?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '2',
    name: 'Plaid Micro Mini Skirt',
    owner_id: '1',
    category: 'skirt',
    size_label: 'XS/S',
    price_per_day: 500,
    status: 'available',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1570700006701-4bdeaf669738?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '3',
    name: 'Mesh Cut-Out Mini Dress',
    owner_id: '2',
    category: 'dress',
    size_label: 'S',
    price_per_day: 600,
    status: 'available',
    location_label: '0.1 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1671632777039-b6434382259d?w=400',
    owner: { id: '2', display_name: 'Jordan Reyes' },
  },
  {
    id: '4',
    name: 'Lace Corset Top',
    owner_id: '1',
    category: 'top',
    size_label: 'XS',
    price_per_day: 700,
    status: 'available',
    location_label: '0.3 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1664875849333-798c9e0eaa62?w=400',
    owner: { id: '1', display_name: 'Maya Chen' },
  },
  {
    id: '5',
    name: 'Satin Slip Mini Skirt',
    owner_id: '2',
    category: 'skirt',
    size_label: 'S',
    price_per_day: 900,
    status: 'available',
    location_label: '1.2 mi · Columbia',
    photo_url: 'https://images.unsplash.com/photo-1608033247410-817c68700611?w=400',
    owner: { id: '2', display_name: 'Jordan Reyes' },
  },
  {
    id: '6',
    name: 'Ruched Bodycon Mini',
    owner_id: '3',
    category: 'dress',
    size_label: 'XS/S',
    price_per_day: 1000,
    status: 'available',
    location_label: '0.5 mi · NYU Stern',
    photo_url: 'https://images.unsplash.com/photo-1687832783432-e1d9a2f76876?w=400',
    owner: { id: '3', display_name: 'Priya Patel' },
  },
  {
    id: '7',
    name: 'Crochet Crop Top',
    owner_id: '3',
    category: 'top',
    size_label: 'XS/S',
    price_per_day: 400,
    status: 'available',
    location_label: '0.5 mi · NYU Stern',
    photo_url: 'https://images.unsplash.com/photo-1742642277612-b6bfbcc1d946?w=400',
    owner: { id: '3', display_name: 'Priya Patel' },
  },
  {
    id: '8',
    name: 'Low-Rise Flare Jeans',
    owner_id: '2',
    category: 'pants',
    size_label: '25',
    price_per_day: 600,
    status: 'lent',
    location_label: '0.1 mi · NYU',
    photo_url: 'https://images.unsplash.com/photo-1689371953420-b6981e43fa38?w=400',
    owner: { id: '2', display_name: 'Jordan Reyes' },
  },
];

const TABS = ['All', 'Date Night', 'Festival', 'Formal', 'Casual'];

type FilterKey = 'size' | 'color' | 'style' | 'event' | 'price';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'size',  label: 'Size'  },
  { key: 'color', label: 'Color' },
  { key: 'style', label: 'Style' },
  { key: 'event', label: 'Event' },
  { key: 'price', label: 'Price' },
];

const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  size:  ['XS', 'S', 'M', 'L', 'XL', 'One Size'],
  color: ['Black', 'White', 'Neutral', 'Bold Color', 'Pattern'],
  style: ['Dresses', 'Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'],
  event: ['Date Night', 'Festival', 'Formal', 'Casual', 'Going Out'],
  price: ['Under $5/day', '$5–$10/day', '$10–$15/day', '$15+/day'],
};

interface FilterSheetProps {
  visible: boolean;
  filterKey: FilterKey | null;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterSheet({ visible, filterKey, selectedValues, onToggle, onClear, onClose }: FilterSheetProps) {
  if (!filterKey) return null;
  const options = FILTER_OPTIONS[filterKey];
  const title = FILTER_CHIPS.find((c) => c.key === filterKey)?.label.toUpperCase() ?? '';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={sheetStyles.wrapper}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          {/* Header */}
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>{title}</Text>
            <View style={sheetStyles.headerRight}>
              {selectedValues.length > 0 && (
                <Pressable onPress={onClear} hitSlop={8}>
                  <Text style={sheetStyles.clearText}>CLEAR</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={8} style={sheetStyles.closeBtn}>
                <Text style={sheetStyles.closeText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Options */}
          <View style={sheetStyles.optionsRow}>
            {options.map((opt) => {
              const active = selectedValues.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={[sheetStyles.option, active && sheetStyles.optionActive]}
                  onPress={() => onToggle(opt)}
                >
                  <Text style={[sheetStyles.optionText, active && sheetStyles.optionTextActive]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Apply */}
          <Pressable
            style={[sheetStyles.applyBtn, selectedValues.length === 0 && sheetStyles.applyBtnDisabled]}
            onPress={onClose}
          >
            <Text style={[sheetStyles.applyText, selectedValues.length === 0 && sheetStyles.applyTextDisabled]}>
              {selectedValues.length > 0 ? `SHOW RESULTS · ${selectedValues.length} SELECTED` : 'SHOW RESULTS'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();
  const [activeTab, setActiveTab]     = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [audience, setAudience]       = useState<AudienceFilter>('all');
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    size: [], color: [], style: [], event: [], price: [],
  });

  const exploreScale = useRef(new Animated.Value(1)).current;

  const handleExplorePressIn = useCallback(() => {
    Animated.spring(exploreScale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [exploreScale]);

  const handleExplorePressOut = useCallback(() => {
    Animated.spring(exploreScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [exploreScale]);

  const toggleFilterOption = useCallback((key: FilterKey, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }, []);

  const clearFilter = useCallback((key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  }, []);

  const totalActiveFilters = useMemo(
    () => Object.values(filters).reduce((acc, arr) => acc + arr.length, 0),
    [filters],
  );

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const hausIds = useMemo(() => new Set(hauses.map((h) => h.id)), [hauses]);

  const displayItems = useMemo(() => {
    const currentUser = { id: user?.id ?? '', friends, hauses };
    let items = getVisibleItems(MOCK_ITEMS, currentUser).filter(
      (i) => i.status === 'available',
    );

    if (audience === 'friends') {
      items = items.filter((i) => i.owner?.id && friendIds.has(i.owner.id));
    } else if (audience === 'hauses') {
      items = items.filter((i) =>
        Object.entries(i.haus_visibility ?? {}).some(
          ([id, on]) => on && hausIds.has(id),
        ),
      );
    }

    if (filters.size.length > 0) {
      items = items.filter((i) => filters.size.includes(i.size_label));
    }

    if (filters.price.length > 0) {
      items = items.filter((i) =>
        filters.price.some((p) => {
          const cents = i.price_per_day;
          if (p === 'Under $5/day')  return cents < 500;
          if (p === '$5–$10/day')    return cents >= 500 && cents < 1000;
          if (p === '$10–$15/day')   return cents >= 1000 && cents < 1500;
          if (p === '$15+/day')      return cents >= 1500;
          return false;
        }),
      );
    }

    if (filters.style.length > 0) {
      items = items.filter((i) =>
        filters.style.some((s) => {
          const cat = i.category.toLowerCase();
          if (s === 'Dresses')     return cat === 'dress';
          if (s === 'Outerwear')   return ['jacket', 'coat', 'blazer'].includes(cat);
          if (s === 'Tops')        return ['top', 'blouse', 'shirt'].includes(cat);
          if (s === 'Bottoms')     return ['pants', 'shorts', 'skirt', 'jeans'].includes(cat);
          if (s === 'Shoes')       return cat === 'shoes';
          if (s === 'Accessories') return cat === 'accessories';
          return false;
        }),
      );
    }

    if (filters.color.length > 0) {
      items = items.filter((i) =>
        filters.color.some((c) => {
          const n = i.name.toLowerCase();
          if (c === 'Black')      return n.includes('black');
          if (c === 'White')      return n.includes('white') || n.includes('ivory') || n.includes('cream');
          if (c === 'Neutral')    return n.includes('beige') || n.includes('tan') || n.includes('nude') || n.includes('velvet') || n.includes('silk');
          if (c === 'Bold Color') return n.includes('emerald') || n.includes('red') || n.includes('blue') || n.includes('pink') || n.includes('cobalt');
          if (c === 'Pattern')    return n.includes('floral') || n.includes('sequin') || n.includes('print') || n.includes('stripe') || n.includes('plaid');
          return false;
        }),
      );
    }

    if (filters.event.length > 0) {
      items = items.filter((i) =>
        filters.event.some((e) => {
          const n = i.name.toLowerCase();
          const cat = i.category.toLowerCase();
          if (e === 'Date Night') return n.includes('slip') || n.includes('silk') || n.includes('velvet') || n.includes('sequin');
          if (e === 'Festival')   return n.includes('festival') || n.includes('boot') || n.includes('cowboy');
          if (e === 'Formal')     return cat === 'dress' || n.includes('gown') || n.includes('blazer') || n.includes('suit');
          if (e === 'Casual')     return cat === 'shoes' || cat === 'top' || cat === 'pants';
          if (e === 'Going Out')  return n.includes('sequin') || n.includes('mini') || n.includes('velvet') || n.includes('slip');
          return false;
        }),
      );
    }

    return items;
  }, [audience, user?.id, friends, hauses, friendIds, hausIds, filters]);

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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FilterSheet
        visible={activeFilter !== null}
        filterKey={activeFilter}
        selectedValues={activeFilter ? filters[activeFilter] : []}
        onToggle={(val) => activeFilter && toggleFilterOption(activeFilter, val)}
        onClear={() => activeFilter && clearFilter(activeFilter)}
        onClose={() => setActiveFilter(null)}
      />
      <FlatList
        data={displayItems}
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

            {/* Audience filter tags */}
            <View style={styles.audienceRow}>
              <Pressable
                style={[styles.audienceTag, audience === 'friends' && styles.audienceTagFriends]}
                onPress={() => setAudience((p) => p === 'friends' ? 'all' : 'friends')}
              >
                <Ionicons
                  name="people-outline"
                  size={12}
                  color={audience === 'friends' ? '#3A3A00' : theme.colors.muted}
                />
                <Text style={[styles.audienceTagText, audience === 'friends' && styles.audienceTagTextFriends]}>
                  FRIENDS
                </Text>
              </Pressable>
              <Pressable
                style={[styles.audienceTag, audience === 'hauses' && styles.audienceTagHauses]}
                onPress={() => setAudience((p) => p === 'hauses' ? 'all' : 'hauses')}
              >
                <Ionicons
                  name="home-outline"
                  size={12}
                  color={audience === 'hauses' ? '#3A3A00' : theme.colors.muted}
                />
                <Text style={[styles.audienceTagText, audience === 'hauses' && styles.audienceTagTextHauses]}>
                  HAUSES
                </Text>
              </Pressable>
            </View>

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

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContent}
              style={styles.chipsScroll}
            >
              {FILTER_CHIPS.map(({ key, label }) => {
                const count = filters[key].length;
                const isActive = count > 0;
                return (
                  <Pressable
                    key={key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setActiveFilter(key)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {label.toUpperCase()}
                      {count > 0
                        ? <Text style={styles.chipCount}> · {count}</Text>
                        : <Text style={styles.chipChevron}> ▾</Text>
                      }
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Hero banner */}
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>
                WEARHAUS · A SOCIAL FASHION NETWORK
              </Text>
              <Text style={styles.heroHeadline}>
                SHARE{' '}
                <Text style={styles.heroHeadlineYellow}>YOUR</Text>
                {' '}CLOSET
              </Text>
              <Text style={styles.heroBody}>
                Buy less. Borrow more.
              </Text>
              <Animated.View style={{ transform: [{ scale: exploreScale }], alignSelf: 'flex-start' }}>
                <Pressable
                  style={styles.heroCta}
                  onPressIn={handleExplorePressIn}
                  onPressOut={handleExplorePressOut}
                >
                  <Text style={styles.heroCtaText}>EXPLORE NOW</Text>
                </Pressable>
              </Animated.View>
            </View>

            {/* Section divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>NEAR YOU</Text>
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

  // Filter chips
  chipsScroll: { marginBottom: 2 },
  chipsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.colors.ivory,
  },
  chipActive: {
    backgroundColor: '#FFFFAD',
    borderColor: '#C8C820',
  },
  chipText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10, color: theme.colors.ink,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#3A3A00',
  },
  chipChevron: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 10, color: theme.colors.muted,
  },
  chipCount: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10, color: '#3A3A00',
  },

  // Audience filter
  audienceRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 4,
    paddingBottom: 2,
  },
  audienceTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: theme.colors.ivory,
  },
  audienceTagFriends: {
    backgroundColor: '#FFFFAD',
    borderColor: '#C8C820',
  },
  audienceTagHauses: {
    backgroundColor: '#FFFFAD',
    borderColor: '#C8C820',
  },
  audienceTagText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10, letterSpacing: 0.8,
    textTransform: 'uppercase', color: theme.colors.muted,
  },
  audienceTagTextFriends: { color: '#3A3A00' },
  audienceTagTextHauses:  { color: '#3A3A00' },

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
    fontSize: 9,
    color: theme.colors.yellow,
    letterSpacing: 1,
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

const sheetStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,18,12,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.ivory,
    borderTopWidth: 2,
    borderTopColor: theme.colors.ink,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.ink,
    borderRightWidth: 2,
    borderRightColor: theme.colors.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 16,
    color: theme.colors.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: '#C8C820',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28, height: 28,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12,
    color: theme.colors.ink,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 20,
  },
  option: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.ivory,
  },
  optionActive: {
    backgroundColor: '#FFFFAD',
    borderColor: '#C8C820',
  },
  optionText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionTextActive: {
    color: '#3A3A00',
  },
  applyBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    marginHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: theme.colors.ivoryMid,
  },
  applyText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  applyTextDisabled: {
    color: theme.colors.muted,
  },
});
