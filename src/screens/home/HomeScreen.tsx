import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, CompositeNavigationProp } from '@react-navigation/native';
import { useFadeOnFocus } from '../../hooks/useFadeOnFocus';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../theme';
import Masthead from '../../components/Masthead';
import ItemCard from '../../components/ItemCard';
import { useFriends } from '../../context/FriendsContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import { getVisibleItems } from '../../utils/visibilityFilter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFeedItems } from '../../services/itemService';
import { fetchCampusHaus } from '../../services/hausService';
import type { Item, Haus } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AppTabsParamList } from '../../navigation/AppTabs';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Home'>,
  NavigationProp<AppStackParamList>
>;

// TEMP: hide the Hauses banner for now — ask before removing it for good.
const SHOW_HAUSES_STRIP = false;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { friends } = useFriends();
  const { hauses } = useHauses();
  const [feedItems, setFeedItems] = useState<Item[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [campusHaus, setCampusHaus] = useState<Haus | null>(null);
  const [campusStripActive, setCampusStripActive] = useState(false);
  const [hausesStripActive, setHausesStripActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchFeedItems()
      .then((items) => { if (!cancelled) setFeedItems(items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFeedLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profile?.campus_verified || !profile.campus_id) return;
    let cancelled = false;
    fetchCampusHaus(profile.campus_id)
      .then((haus) => { if (!cancelled) setCampusHaus(haus); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profile?.campus_verified, profile?.campus_id]);

  // After onboarding completes with "Add My First Item", navigate there on first mount.
  useEffect(() => {
    AsyncStorage.getItem('wearhaus:pending_action').then((action) => {
      if (action === 'add-item') {
        AsyncStorage.removeItem('wearhaus:pending_action');
        navigation.navigate('AddItem');
      }
    }).catch(() => {});
  }, [navigation]);

  const fadeOpacity  = useFadeOnFocus();
  const exploreScale = useRef(new Animated.Value(1)).current;

  const handleExplorePressIn = useCallback(() => {
    Animated.spring(exploreScale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [exploreScale]);

  const handleExplorePressOut = useCallback(() => {
    Animated.spring(exploreScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }, [exploreScale]);

  const displayItems = useMemo(() => {
    const currentUser = { id: user?.id ?? '', friends, hauses };
    return getVisibleItems(feedItems, currentUser).filter((i) => i.status === 'available');
  }, [feedItems, user?.id, friends, hauses]);

  const handleItemPress = useCallback(
    (item: Item) => navigation.navigate('ItemDetail', { item }),
    [navigation],
  );

  if (feedLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Masthead />
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.ink} />
      </SafeAreaView>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
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

            {/* Campus strip */}
            {profile?.campus_verified && (
              <Pressable
                style={({ pressed }) => [
                  styles.campusStrip,
                  (pressed || campusStripActive) && styles.campusStripActive,
                ]}
                onPress={() => profile?.campus_id && navigation.navigate('Explore', { campusId: profile.campus_id })}
                onHoverIn={() => setCampusStripActive(true)}
                onHoverOut={() => setCampusStripActive(false)}
                accessibilityRole="button"
                accessibilityLabel={`${profile.campus_name} Closet, explore the campus exchange`}
              >
                <View style={styles.campusStripBorder}>
                  <View style={styles.campusStripInner}>
                    <View style={styles.campusIconTile}>
                      <Ionicons name="school-outline" size={20} color={theme.colors.ink} />
                    </View>
                    <View style={styles.campusTextBlock}>
                      <Text style={styles.campusStripTitle} numberOfLines={1}>{profile.campus_name} Closet</Text>
                      <Text style={styles.campusStripSub} numberOfLines={1}>Explore the campus exchange</Text>
                    </View>
                    <View style={styles.campusStatChip}>
                      <Text style={styles.campusStatNumber}>
                        {campusHaus?.piece_count ?? 0}
                        <Text style={styles.campusStatLabel}> items</Text>
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color={theme.colors.ink} />
                  </View>
                </View>
              </Pressable>
            )}

            {/* Hauses strip — TEMP: hidden for now, ask before removing for good. Same row
                height/shape as the campus strip (ink border, inset icon tile, hover shadow),
                white fill instead of yellow, plus a direct "create a Haus" button of its own —
                nested inside the card's Pressable, so tapping it claims the touch and navigates
                to CreateHaus without also firing the card's own "go to Hauses" onPress. */}
            {SHOW_HAUSES_STRIP && (
              <Pressable
                style={({ pressed }) => [
                  styles.hausesStrip,
                  (pressed || hausesStripActive) && styles.hausesStripActive,
                ]}
                onPress={() => navigation.navigate('Hauses')}
                onHoverIn={() => setHausesStripActive(true)}
                onHoverOut={() => setHausesStripActive(false)}
                accessibilityRole="button"
                accessibilityLabel="Hauses, browse or start a shared closet"
              >
                <View style={styles.hausesStripBorder}>
                  <View style={styles.hausesStripInner}>
                    <View style={styles.hausesIconTile}>
                      <Ionicons name="home-outline" size={20} color={theme.colors.ink} />
                    </View>
                    <View style={styles.hausesTextBlock}>
                      <Text style={styles.hausesStripTitle} numberOfLines={1}>Hauses</Text>
                      <Text style={styles.hausesStripSub} numberOfLines={1}>Browse yours, or start a new one</Text>
                    </View>
                    <Pressable
                      style={styles.hausesCreateBtn}
                      onPress={() => navigation.navigate('CreateHaus')}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Create a new Haus"
                    >
                      <Ionicons name="add" size={18} color={theme.colors.ink} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            )}

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
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => navigation.navigate('AddItem')}
        hitSlop={4}
      >
        <MaterialCommunityIcons name="hanger" size={20} color={theme.colors.ink} />
        <Text style={styles.fabLabel}>ADD</Text>
      </Pressable>
    </SafeAreaView>
    </Animated.View>
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

  // Campus strip — matches the yellow "Exchanges" card on ProfileScreen (BorrowsMiniCard):
  // ink border + radius on an outer wrapper, yellow fill with a darker-yellow bottom seam on an
  // inner layer, inset (rgba(0,0,0,0.06)) tiles for the icon and stat chip. #C8C820/#5A5A00 aren't
  // theme tokens — matching BorrowsMiniCard's own hardcoded values, not inventing new ones.
  campusStrip: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 12,
  },
  campusStripActive: {
    transform: [{ translateX: -2 }, { translateY: -2 }],
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  campusStripBorder: {
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: 12,
    overflow: 'hidden',
  },
  campusStripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.yellow,
    borderBottomWidth: 1,
    borderBottomColor: '#C8C820',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  campusIconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campusTextBlock: { flex: 1, minWidth: 0 },
  campusStripTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.yellowText,
    lineHeight: 16,
  },
  campusStripSub: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: '#5A5A00',
    marginTop: 2,
  },
  campusStatChip: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  campusStatNumber: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.yellowText,
  },
  campusStatLabel: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: '#5A5A00',
  },

  // Hauses strip — lighter than the yellow campus card on purpose: this one can sit directly
  // below it (campus is gated on campus_verified, this isn't), so matching treatment would
  // read as two of the same banner stacked rather than two distinct entry points.
  // Hauses strip — same treatment as the campus strip (yellow fill, ink border, inset icon
  // tile, hover shadow) and the same row height (identical icon size/padding/font sizes).
  hausesStrip: {
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 12,
  },
  hausesStripActive: {
    transform: [{ translateX: -2 }, { translateY: -2 }],
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  hausesStripBorder: {
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hausesStripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.ivory,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  hausesIconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hausesTextBlock: { flex: 1, minWidth: 0 },
  hausesStripTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: theme.colors.ink,
    lineHeight: 16,
  },
  hausesStripSub: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  hausesCreateBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB — bottom offset is set inline (base 24 + the safe-area inset)
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 28,
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
    color: theme.colors.ink,
  },
});
