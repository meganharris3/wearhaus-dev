import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Masthead from '../../components/Masthead';
import ItemCard from '../../components/ItemCard';
import { useFriends } from '../../context/FriendsContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import { getVisibleItems } from '../../utils/visibilityFilter';
import type { Item } from '../../types';

const MOCK_ITEMS: Item[] = [
  { id: '1', name: 'Ribbed Cami Mini Dress', owner_id: '1', category: 'dress', size_label: 'XS/S', price_per_day: 800, status: 'available', location_label: '0.3 mi · NYU', photo_url: 'https://images.unsplash.com/photo-1726837214001-e1361c51732e?w=400', owner: { id: '1', display_name: 'Maya Chen' }, occasion_tags: ['Date Night', 'Going Out'] },
  { id: '2', name: 'Plaid Micro Mini Skirt', owner_id: '1', category: 'skirt', size_label: 'XS/S', price_per_day: 500, status: 'available', location_label: '0.3 mi · NYU', photo_url: 'https://images.unsplash.com/photo-1570700006701-4bdeaf669738?w=400', owner: { id: '1', display_name: 'Maya Chen' }, occasion_tags: ['Festival', 'Casual'] },
  { id: '3', name: 'Mesh Cut-Out Mini Dress', owner_id: '2', category: 'dress', size_label: 'S', price_per_day: 600, status: 'available', location_label: '0.1 mi · NYU', photo_url: 'https://images.unsplash.com/photo-1671632777039-b6434382259d?w=400', owner: { id: '2', display_name: 'Jordan Reyes' }, occasion_tags: ['Date Night', 'Going Out'] },
  { id: '4', name: 'Lace Corset Top', owner_id: '1', category: 'top', size_label: 'XS', price_per_day: 700, status: 'available', location_label: '0.3 mi · NYU', photo_url: 'https://images.unsplash.com/photo-1664875849333-798c9e0eaa62?w=400', owner: { id: '1', display_name: 'Maya Chen' }, occasion_tags: ['Date Night', 'Formal'] },
  { id: '5', name: 'Satin Slip Mini Skirt', owner_id: '2', category: 'skirt', size_label: 'S', price_per_day: 900, status: 'available', location_label: '1.2 mi · Columbia', photo_url: 'https://images.unsplash.com/photo-1608033247410-817c68700611?w=400', owner: { id: '2', display_name: 'Jordan Reyes' }, occasion_tags: ['Date Night', 'Formal'] },
  { id: '6', name: 'Ruched Bodycon Mini', owner_id: '3', category: 'dress', size_label: 'XS/S', price_per_day: 1000, status: 'available', location_label: '0.5 mi · NYU Stern', photo_url: 'https://images.unsplash.com/photo-1687832783432-e1d9a2f76876?w=400', owner: { id: '3', display_name: 'Priya Patel' }, occasion_tags: ['Going Out', 'Formal'] },
  { id: '7', name: 'Crochet Crop Top', owner_id: '3', category: 'top', size_label: 'XS/S', price_per_day: 400, status: 'available', location_label: '0.5 mi · NYU Stern', photo_url: 'https://images.unsplash.com/photo-1742642277612-b6bfbcc1d946?w=400', owner: { id: '3', display_name: 'Priya Patel' }, occasion_tags: ['Festival', 'Casual'] },
  { id: '8', name: 'Low-Rise Flare Jeans', owner_id: '2', category: 'pants', size_label: '25', price_per_day: 600, status: 'available', location_label: '0.1 mi · NYU', photo_url: 'https://images.unsplash.com/photo-1689371953420-b6981e43fa38?w=400', owner: { id: '2', display_name: 'Jordan Reyes' }, occasion_tags: ['Casual', 'Festival'] },
];
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AppTabsParamList } from '../../navigation/AppTabs';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Home'>,
  NavigationProp<AppStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();

  const exploreScale = useRef(new Animated.Value(1)).current;

  const handleExplorePressIn = useCallback(() => {
    Animated.spring(exploreScale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [exploreScale]);

  const handleExplorePressOut = useCallback(() => {
    Animated.spring(exploreScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [exploreScale]);

  const displayItems = useMemo(() => {
    const currentUser = { id: user?.id ?? '', friends, hauses };
    return getVisibleItems(MOCK_ITEMS, currentUser).filter((i) => i.status === 'available');
  }, [user?.id, friends, hauses]);

  const handleItemPress = useCallback(
    (item: Item) => navigation.navigate('ItemDetail', { item }),
    [navigation],
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
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => handleItemPress(item)} />
        )}
        ListHeaderComponent={
          <>
            <Masthead />

            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>WEARHAUS · A SOCIAL FASHION NETWORK</Text>
              <Text style={styles.heroHeadline}>
                SHARE{' '}
                <Text style={styles.heroHeadlineYellow}>YOUR</Text>
                {' '}CLOSET
              </Text>
              <Text style={styles.heroBody}>Buy less. Borrow more.</Text>
              <Animated.View style={{ transform: [{ scale: exploreScale }], alignSelf: 'flex-start' }}>
                <Pressable
                  style={styles.heroCta}
                  onPressIn={handleExplorePressIn}
                  onPressOut={handleExplorePressOut}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <Text style={styles.heroCtaText}>EXPLORE NOW</Text>
                  <Ionicons name="arrow-forward" size={12} color={theme.colors.yellowText} />
                </Pressable>
              </Animated.View>
            </View>

            {/* Section label */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>NEAR YOU</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        }
      />

      {/* FAB — add item to closet */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AddItem')}
        hitSlop={4}
      >
        <Ionicons name="add" size={22} color={theme.colors.ink} />
        <Text style={styles.fabLabel}>ADD</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
    gap: 8,
  },
  columnWrapper: { gap: 8 },

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
  heroHeadlineYellow: { color: theme.colors.yellow },
  heroBody: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.ink },
  dividerLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fabLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    letterSpacing: 1,
    color: theme.colors.yellowText,
  },
});
