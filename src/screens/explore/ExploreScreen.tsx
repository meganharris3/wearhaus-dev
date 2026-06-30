import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme';
import Masthead from '../../components/Masthead';
import SearchBar from '../../components/SearchBar';
import ItemCard from '../../components/ItemCard';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import { Ionicons } from '@expo/vector-icons';
import { useFriends } from '../../context/FriendsContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import { getVisibleItems } from '../../utils/visibilityFilter';

type AudienceFilter = 'all' | 'friends' | 'hauses';

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

const FILTER_CHIPS = ['Size', 'Colour', 'Style', 'Event', 'Price'];

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();
  const [searchQuery, setSearchQuery] = useState('');
  const [audience, setAudience]       = useState<AudienceFilter>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const hausIds = useMemo(() => new Set(hauses.map((h) => h.id)), [hauses]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim]),
  );

  const filteredItems = useMemo(() => {
    const currentUser = { id: user?.id ?? '', friends, hauses };
    let items = getVisibleItems(MOCK_ITEMS, currentUser);
    if (audience === 'friends') {
      items = items.filter((i) => i.owner?.id && friendIds.has(i.owner.id));
    } else if (audience === 'hauses') {
      items = items.filter((i) =>
        Object.entries(i.haus_visibility ?? {}).some(
          ([id, on]) => on && hausIds.has(id),
        ),
      );
    }
    if (!searchQuery.trim()) return items;
    return items.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, audience, user?.id, friends, hauses, friendIds, hausIds]);

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
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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
            {/* Masthead */}
            <Masthead subtitle="The Edit" />

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
              {FILTER_CHIPS.map((chip) => (
                <Pressable key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {chip.toUpperCase()}
                    <Text style={styles.chipChevron}> ▾</Text>
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Results count */}
            <Text style={styles.resultsCount}>
              {filteredItems.length} PIECES
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>NO PIECES FOUND</Text>
          </View>
        }
      />
    </SafeAreaView>
    </Animated.View>
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

  // Filter chips
  chipsScroll: {
    marginBottom: 4,
  },
  chipsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.ivory,
  },
  chipText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipChevron: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 10,
    color: theme.colors.muted,
  },

  // Results count
  resultsCount: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 8,
    letterSpacing: 0.5,
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
