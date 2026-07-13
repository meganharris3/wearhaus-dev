import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import StatusTag from '../../components/StatusTag';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

function getInitials(name: string): string {
  return name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
}

export default function ItemDetailScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { item } = route.params;

  const priceFormatted = `$${(item.price_per_day / 100).toFixed(2)}/day`;
  const ownerName      = item.owner?.display_name ?? 'Unknown';
  const ownerInitials  = getInitials(ownerName);
  const ownerRating    = item.owner?.rating ?? 4.9;

  // Owner if item was added by current user (owner_id='me') or matches auth uid
  const isOwner = item.owner_id === 'me' || (user != null && item.owner_id === user.id);

  // Build the photo list: prefer photo_urls array, fall back to single photo_url
  const photoList: string[] =
    item.photo_urls?.length
      ? item.photo_urls
      : item.photo_url
      ? [item.photo_url]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef   = useRef<FlatList<string>>(null);
  const SCREEN_WIDTH  = Dimensions.get('window').width;
  const PHOTO_HEIGHT  = SCREEN_WIDTH * (4 / 3);

  function goTo(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back + Edit */}
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>
          {isOwner && (
            <Pressable
              onPress={() => navigation.navigate('AddItem', { item })}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>EDIT</Text>
            </Pressable>
          )}
        </View>

        {/* Photo swiper */}
        <View style={styles.photoContainer}>
          {photoList.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={photoList}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
              getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveIndex(idx);
              }}
              renderItem={({ item: uri }) => (
                <Image
                  source={{ uri }}
                  style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}

          {/* Status tag */}
          <View style={styles.tagWrapper}>
            <StatusTag status={item.status} />
          </View>

          {/* Counter badge */}
          {photoList.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{activeIndex + 1} / {photoList.length}</Text>
            </View>
          )}

          {/* Left / right arrows */}
          {photoList.length > 1 && activeIndex > 0 && (
            <Pressable
              style={[styles.arrowBtn, styles.arrowLeft]}
              onPress={() => goTo(activeIndex - 1)}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.ivory} />
            </Pressable>
          )}
          {photoList.length > 1 && activeIndex < photoList.length - 1 && (
            <Pressable
              style={[styles.arrowBtn, styles.arrowRight]}
              onPress={() => goTo(activeIndex + 1)}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.colors.ivory} />
            </Pressable>
          )}

          {/* Dot indicators */}
          {photoList.length > 1 && (
            <View style={styles.dotsRow}>
              {photoList.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.lenderText}>Listed by {ownerName}</Text>
          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceFormatted}</Text>
            <View style={styles.sizeBadge}>
              <Text style={styles.sizeBadgeText}>{item.size_label}</Text>
            </View>
          </View>
          <Text style={styles.location}>{item.location_label}</Text>
          <View style={styles.divider} />

          {/* Size & Condition */}
          {(item.size_label || item.condition || item.occasion_tags?.length) && (
            <>
              <Text style={styles.descriptionLabel}>SIZE & CONDITION</Text>
              <View style={styles.tagRow}>
                {item.size_label && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.size_label}</Text>
                  </View>
                )}
                {item.condition && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.condition}</Text>
                  </View>
                )}
                {item.occasion_tags?.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Rental Settings */}
          {item.list_for_rental && (item.max_duration || item.pickup_method) && (
            <>
              <Text style={styles.descriptionLabel}>RENTAL SETTINGS</Text>
              <View style={styles.tagRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{priceFormatted}</Text>
                </View>
                {item.max_duration && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>MAX {item.max_duration}</Text>
                  </View>
                )}
                {item.pickup_method && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.pickup_method}</Text>
                  </View>
                )}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Availability shortcut (lender) */}
          {isOwner && (
            <Pressable
              style={styles.availabilityRow}
              onPress={() => navigation.navigate('Availability', { item })}
            >
              <Ionicons name="calendar-outline" size={16} color={theme.colors.ink} />
              <Text style={styles.availabilityRowText}>Manage Availability</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </Pressable>
          )}

          {/* Edit shortcut (lender) */}
          {isOwner && (
            <Pressable
              style={styles.availabilityRow}
              onPress={() => navigation.navigate('AddItem', { item })}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.ink} />
              <Text style={styles.availabilityRowText}>Edit Item</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </Pressable>
          )}

          <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
          <Text style={styles.description}>
            {item.description || 'No description provided.'}
          </Text>
          <View style={styles.divider} />

          {/* Lender card */}
          <View style={styles.lenderCard}>
            <View style={styles.lenderAvatar}>
              <Text style={styles.lenderAvatarText}>{ownerInitials}</Text>
            </View>
            <View style={styles.lenderInfo}>
              <Text style={styles.lenderName}>{ownerName}</Text>
              <Text style={styles.lenderRating}>⭐ {ownerRating}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaContainer}>
        {isOwner ? (
          <Pressable
            style={styles.ctaManage}
            onPress={() => navigation.navigate('Availability', { item })}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.colors.ivory} />
            <Text style={styles.ctaManageText}>MANAGE AVAILABILITY</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.ctaButton}
            onPress={() => navigation.navigate('DatePicker', { item })}
          >
            <Text style={styles.ctaButtonText}>CHECK AVAILABILITY</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { flex: 1 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
  },
  backBtn: { flex: 1 },
  backText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  editBtn: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  editBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 1.5,
  },

  photoContainer: {
    width: '100%', aspectRatio: 3 / 4,
    backgroundColor: theme.colors.ivoryMid, position: 'relative',
    overflow: 'hidden',
  },

  photoPlaceholder: { flex: 1, backgroundColor: theme.colors.ivoryMid },
  tagWrapper: { position: 'absolute', top: 12, left: 12 },

  // Counter badge (top-right)
  counterBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(20,18,12,0.55)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  counterText: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 11,
    color: theme.colors.ivory, letterSpacing: 0.3,
  },

  // Left / right arrow buttons
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(20,18,12,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowLeft:  { left: 12 },
  arrowRight: { right: 12 },

  // Dot indicators (bottom-center)
  dotsRow: {
    position: 'absolute', bottom: 12,
    flexDirection: 'row', alignSelf: 'center',
    gap: 5,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(253,251,244,0.45)',
  },
  dotActive: {
    backgroundColor: theme.colors.ivory,
    width: 16, borderRadius: 3,
  },

  content: { padding: theme.spacing.md },
  itemName: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 22,
    color: theme.colors.ink, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 6,
  },
  lenderText: {
    fontFamily: theme.fonts.interRegular, fontSize: 13,
    color: theme.colors.muted, marginBottom: 14,
  },
  divider: { height: 1, backgroundColor: theme.colors.ivoryMid, marginVertical: 14 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  price: { fontFamily: theme.fonts.interSemiBold, fontSize: 18, color: theme.colors.ink },
  sizeBadge: {
    borderWidth: 1, borderColor: theme.colors.ink, borderRadius: 2,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sizeBadgeText: { fontFamily: theme.fonts.interSemiBold, fontSize: 11, color: theme.colors.ink },
  location: { fontFamily: theme.fonts.interLight, fontSize: 12, color: theme.colors.muted, marginTop: 2 },

  availabilityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: theme.colors.ivoryMid, borderRadius: 2,
    paddingHorizontal: 12,
  },
  availabilityRowText: {
    flex: 1, fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink,
  },

  descriptionLabel: {
    fontFamily: theme.fonts.barlowBold, fontSize: 10,
    color: theme.colors.muted, textTransform: 'uppercase',
    letterSpacing: 2, marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14,
  },
  tag: {
    borderWidth: 1, borderColor: theme.colors.ink, borderRadius: 2,
    paddingHorizontal: 9, paddingVertical: 5,
    backgroundColor: theme.colors.ivoryDark,
  },
  tagText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 10,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  description: {
    fontFamily: theme.fonts.interRegular, fontSize: 13,
    color: theme.colors.ink, lineHeight: 20,
  },

  lenderCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lenderAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.yellow, alignItems: 'center', justifyContent: 'center',
  },
  lenderAvatarText: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink },
  lenderInfo: { flex: 1 },
  lenderName: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  lenderRating: { fontFamily: theme.fonts.interRegular, fontSize: 12, color: theme.colors.muted, marginTop: 1 },

  ctaContainer: {
    backgroundColor: theme.colors.ivory, paddingHorizontal: theme.spacing.md,
    paddingTop: 8, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid,
  },
  ctaButton: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 14,
    color: theme.colors.yellowText, textTransform: 'uppercase', letterSpacing: 1,
  },
  ctaManage: {
    backgroundColor: theme.colors.ink, borderRadius: 2,
    height: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  ctaManageText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 14,
    color: theme.colors.ivory, textTransform: 'uppercase', letterSpacing: 1,
  },
});
