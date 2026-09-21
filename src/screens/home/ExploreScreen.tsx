import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
import { fetchFeedItems, searchItems } from '../../services/itemService';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AppTabsParamList } from '../../navigation/AppTabs';

type AudienceFilter = 'all' | 'friends' | 'hauses';

type ExploreNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Explore'>,
  NavigationProp<AppStackParamList>
>;

type FilterKey = 'size' | 'color' | 'style' | 'price';

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: 'size',  label: 'Size'  },
  { key: 'color', label: 'Color' },
  { key: 'style', label: 'Style' },
  { key: 'price', label: 'Price' },
];

const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Black',   hex: '#1A1A1A' },
  { name: 'White',   hex: '#FFFFFF' },
  { name: 'Cream',   hex: '#F5EFD8' },
  { name: 'Beige',   hex: '#D4B896' },
  { name: 'Brown',   hex: '#8B6347' },
  { name: 'Red',     hex: '#CC2D2D' },
  { name: 'Pink',    hex: '#F2A0B0' },
  { name: 'Blush',   hex: '#E8C4BC' },
  { name: 'Orange',  hex: '#E8733A' },
  { name: 'Yellow',  hex: '#F5E642' },
  { name: 'Green',   hex: '#4A8C5C' },
  { name: 'Teal',    hex: '#2E8B89' },
  { name: 'Blue',    hex: '#3A5FA0' },
  { name: 'Cobalt',  hex: '#1B3FA0' },
  { name: 'Purple',  hex: '#7A4FA0' },
  { name: 'Silver',  hex: '#B0B0B8' },
  { name: 'Gold',    hex: '#C8A830' },
  { name: 'Pattern', hex: 'pattern' },
];

const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  size:  ['XS', 'S', 'M', 'L', 'XL', 'One Size'],
  color: COLOR_PALETTE.map((c) => c.name),
  style: ['Dresses', 'Outerwear', 'Tops', 'Bottoms', 'Shoes', 'Accessories'],
  price: ['Under $5/day', '$5–$10/day', '$10–$15/day', '$15+/day'],
};

function ColorSwatch({ color, active, onPress }: {
  color: { name: string; hex: string };
  active: boolean;
  onPress: () => void;
}) {
  const isLight = ['#FFFFFF', '#F5EFD8', '#D4B896', '#F2A0B0', '#E8C4BC', '#F5E642', '#B0B0B8'].includes(color.hex);

  return (
    <Pressable onPress={onPress} style={dropdownStyles.swatch}>
      <View style={[dropdownStyles.swatchCircle, active && dropdownStyles.swatchCircleActive]}>
        {color.hex === 'pattern' ? (
          <View style={dropdownStyles.swatchPattern}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, backgroundColor: '#CC2D2D' }} />
              <View style={{ flex: 1, backgroundColor: '#3A5FA0' }} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, backgroundColor: '#F5E642' }} />
              <View style={{ flex: 1, backgroundColor: '#4A8C5C' }} />
            </View>
          </View>
        ) : (
          <View style={[dropdownStyles.swatchFill, { backgroundColor: color.hex }]}>
            {active && (
              <Ionicons name="checkmark" size={13} color={isLight ? '#14120C' : '#FFFFFF'} />
            )}
          </View>
        )}
        {color.hex === 'pattern' && active && (
          <View style={dropdownStyles.swatchCheckBadge}>
            <Ionicons name="checkmark" size={9} color="#14120C" />
          </View>
        )}
      </View>
      <Text style={[dropdownStyles.swatchLabel, active && dropdownStyles.swatchLabelActive]} numberOfLines={1}>
        {color.name}
      </Text>
    </Pressable>
  );
}

function FilterDropdown({ filterKey, selectedValues, onToggle, onClear, onClose }: {
  filterKey: FilterKey;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const options = FILTER_OPTIONS[filterKey];
  const title = FILTER_CHIPS.find((c) => c.key === filterKey)?.label.toUpperCase() ?? '';
  const isColor = filterKey === 'color';

  return (
    <View style={dropdownStyles.panel}>
      <View style={dropdownStyles.header}>
        <Text style={dropdownStyles.title}>{title}</Text>
        <View style={dropdownStyles.headerRight}>
          {selectedValues.length > 0 && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text style={dropdownStyles.clearText}>CLEAR ALL</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8} style={dropdownStyles.closeBtn}>
            <Ionicons name="close" size={14} color={theme.colors.ink} />
          </Pressable>
        </View>
      </View>

      {isColor ? (
        <View style={dropdownStyles.swatchRow}>
          {COLOR_PALETTE.map((color) => (
            <ColorSwatch
              key={color.name}
              color={color}
              active={selectedValues.includes(color.name)}
              onPress={() => onToggle(color.name)}
            />
          ))}
        </View>
      ) : (
        <View style={dropdownStyles.optionsRow}>
          {options.map((opt) => {
            const active = selectedValues.includes(opt);
            return (
              <Pressable
                key={opt}
                style={[dropdownStyles.option, active && dropdownStyles.optionActive]}
                onPress={() => onToggle(opt)}
              >
                {active && <Ionicons name="checkmark" size={11} color="#3A3A00" />}
                <Text style={[dropdownStyles.optionText, active && dropdownStyles.optionTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ExploreScreen() {
  const navigation = useNavigation<ExploreNavProp>();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();
  const [searchQuery, setSearchQuery] = useState('');
  const [audience, setAudience]       = useState<AudienceFilter>('all');
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    size: [], color: [], style: [], price: [],
  });
  const [feedItems, setFeedItems]     = useState<Item[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFeedItems()
      .then((items) => { if (!cancelled) setFeedItems(items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFeedLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const items = await searchItems({ query: searchQuery.trim() });
        if (!cancelled) setFeedItems(items);
      } catch {}
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

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

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const hausIds = useMemo(() => new Set(hauses.map((h) => h.id)), [hauses]);

  const displayItems = useMemo(() => {
    const currentUser = { id: user?.id ?? '', friends, hauses };
    let items = getVisibleItems(feedItems, currentUser).filter(
      (i) => i.status === 'available',
    );

    if (audience === 'friends') {
      items = items.filter((i) => friendIds.has(i.owner_id));
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
          if (c === 'Black')   return n.includes('black');
          if (c === 'White')   return n.includes('white');
          if (c === 'Cream')   return n.includes('cream') || n.includes('ivory') || n.includes('off-white');
          if (c === 'Beige')   return n.includes('beige') || n.includes('tan') || n.includes('nude') || n.includes('sand');
          if (c === 'Brown')   return n.includes('brown') || n.includes('chocolate') || n.includes('camel') || n.includes('cognac');
          if (c === 'Red')     return n.includes('red') || n.includes('scarlet') || n.includes('cherry') || n.includes('burgundy');
          if (c === 'Pink')    return n.includes('pink') || n.includes('rose') || n.includes('fuchsia') || n.includes('magenta');
          if (c === 'Blush')   return n.includes('blush');
          if (c === 'Orange')  return n.includes('orange') || n.includes('rust') || n.includes('terracotta');
          if (c === 'Yellow')  return n.includes('yellow') || n.includes('mustard') || n.includes('lemon');
          if (c === 'Green')   return n.includes('green') || n.includes('olive') || n.includes('emerald') || n.includes('sage') || n.includes('forest');
          if (c === 'Teal')    return n.includes('teal') || n.includes('turquoise') || n.includes('aqua') || n.includes('mint');
          if (c === 'Blue')    return n.includes('blue') || n.includes('navy') || n.includes('indigo') || n.includes('denim');
          if (c === 'Cobalt')  return n.includes('cobalt') || n.includes('royal blue') || n.includes('electric blue');
          if (c === 'Purple')  return n.includes('purple') || n.includes('lavender') || n.includes('violet') || n.includes('lilac');
          if (c === 'Silver')  return n.includes('silver') || n.includes('grey') || n.includes('gray') || n.includes('metallic');
          if (c === 'Gold')    return n.includes('gold') || n.includes('bronze') || n.includes('champagne');
          if (c === 'Pattern') return n.includes('floral') || n.includes('sequin') || n.includes('print') || n.includes('stripe') || n.includes('plaid') || n.includes('check') || n.includes('crochet');
          return false;
        }),
      );
    }

    return items;
  }, [feedItems, audience, user?.id, friends, hauses, friendIds, hausIds, filters]);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <Masthead />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent} style={styles.tabsScroll}>
              {([
                { label: 'All',     value: 'all'     },
                { label: 'Friends', value: 'friends' },
                { label: 'Hauses',  value: 'hauses'  },
              ] as { label: string; value: AudienceFilter }[]).map(({ label, value }) => (
                <Pressable key={value} onPress={() => setAudience(value)} style={[styles.pill, audience === value && styles.pillActive]}>
                  <Text style={[styles.pillText, audience === value && styles.pillTextActive]}>{label.toUpperCase()}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search size, style, occasion…" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent} style={styles.chipsScroll}>
              {FILTER_CHIPS.map(({ key, label }) => {
                const count = filters[key].length;
                const isActive = count > 0;
                return (
                  <Pressable key={key} style={[styles.chip, isActive && styles.chipActive]} onPress={() => setActiveFilter((k) => k === key ? null : key)}>
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

            {activeFilter !== null && (
              <FilterDropdown
                filterKey={activeFilter}
                selectedValues={filters[activeFilter]}
                onToggle={(val) => toggleFilterOption(activeFilter, val)}
                onClear={() => clearFilter(activeFilter)}
                onClose={() => setActiveFilter(null)}
              />
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>NEAR YOU</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        }
        ListEmptyComponent={
          feedLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.colors.ink} />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  listContent: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg, gap: 8 },
  columnWrapper: { gap: 8 },

  chipsScroll: { marginBottom: 2 },
  chipsContent: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, gap: 8 },
  chip: { borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.ivory },
  chipActive: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  chipText: { fontFamily: theme.fonts.barlowBold, fontSize: 10, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipTextActive: { color: '#3A3A00' },
  chipChevron: { fontFamily: theme.fonts.interRegular, fontSize: 10, color: theme.colors.muted },
  chipCount: { fontFamily: theme.fonts.barlowBold, fontSize: 10, color: '#3A3A00' },

  audienceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.md, paddingTop: 4, paddingBottom: 2 },
  audienceTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: theme.colors.ivoryMid, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: theme.colors.ivory },
  audienceTagFriends: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  audienceTagHauses:  { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  audienceTagText: { fontFamily: theme.fonts.barlowBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: theme.colors.muted },
  audienceTagTextFriends: { color: '#3A3A00' },
  audienceTagTextHauses:  { color: '#3A3A00' },

  tabsScroll: { marginBottom: 0 },
  tabsContent: { paddingHorizontal: theme.spacing.md, paddingVertical: 10, gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.ivory, borderWidth: 1, borderColor: theme.colors.ink },
  pillActive: { backgroundColor: theme.colors.yellow, borderColor: theme.colors.yellowBorder },
  pillText: { fontFamily: theme.fonts.barlowBold, fontSize: 11, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillTextActive: { color: theme.colors.yellowText },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.spacing.md, marginBottom: 8, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.ink },
  dividerLabel: { fontFamily: theme.fonts.barlowBold, fontSize: 10, color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 2 },
});

const dropdownStyles = StyleSheet.create({
  panel: { marginHorizontal: theme.spacing.md, marginBottom: 8, borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: theme.borderRadius, backgroundColor: theme.colors.ivory },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid },
  title: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 12, color: theme.colors.ink, letterSpacing: 1.5, textTransform: 'uppercase' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearText: { fontFamily: theme.fonts.barlowBold, fontSize: 10, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  closeBtn: { width: 24, height: 24, borderWidth: 1.5, borderColor: theme.colors.ivoryMid, borderRadius: theme.borderRadius, alignItems: 'center', justifyContent: 'center' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: theme.colors.ivoryMid, borderRadius: theme.borderRadius, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.ivory },
  optionActive: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  optionText: { fontFamily: theme.fonts.barlowBold, fontSize: 11, color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  optionTextActive: { color: '#3A3A00' },

  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 14, gap: 12 },
  swatch: { alignItems: 'center', width: 44 },
  swatchCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: theme.colors.ivoryMid, overflow: 'hidden', marginBottom: 4 },
  swatchCircleActive: { borderWidth: 2.5, borderColor: theme.colors.ink },
  swatchPattern: { flex: 1, flexDirection: 'column' },
  swatchFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  swatchCheckBadge: { position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFAD', borderWidth: 1, borderColor: '#C8C820', alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontFamily: theme.fonts.barlowBold, fontSize: 8, color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  swatchLabelActive: { color: theme.colors.ink },
});
