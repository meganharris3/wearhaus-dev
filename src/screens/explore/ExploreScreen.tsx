import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
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
import { fetchFeedItems, searchItems } from '../../services/itemService';

type AudienceFilter = 'all' | 'friends' | 'hauses';

const FILTER_CHIPS = ['Size', 'Colour', 'Style', 'Event', 'Price'];

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();
  const [searchQuery, setSearchQuery] = useState('');
  const [audience, setAudience]       = useState<AudienceFilter>('all');
  const [allItems, setAllItems]       = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const hausIds = useMemo(() => new Set(hauses.map((h) => h.id)), [hauses]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setItemsLoading(true);
      try {
        const items = searchQuery.trim()
          ? await searchItems({ query: searchQuery.trim() })
          : await fetchFeedItems();
        if (!cancelled) setAllItems(items);
      } catch {
        // keep previous items on error
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    }, searchQuery.trim() ? 350 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

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
    let items = getVisibleItems(allItems, currentUser);
    if (audience === 'friends') {
      items = items.filter((i) => friendIds.has(i.owner_id));
    } else if (audience === 'hauses') {
      items = items.filter((i) =>
        Object.entries(i.haus_visibility ?? {}).some(
          ([id, on]) => on && hausIds.has(id),
        ),
      );
    }
    return items;
  }, [allItems, audience, user?.id, friends, hauses, friendIds, hausIds]);

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
              {itemsLoading ? '…' : `${filteredItems.length} PIECES`}
            </Text>
          </>
        }
        ListEmptyComponent={
          itemsLoading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.colors.ink} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>NO PIECES FOUND</Text>
            </View>
          )
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
