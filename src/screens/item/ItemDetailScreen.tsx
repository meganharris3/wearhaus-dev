import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppStack';
import { theme } from '../../theme';
import StatusTag from '../../components/StatusTag';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export default function ItemDetailScreen({ route }: Props) {
  const navigation = useNavigation();
  const { item } = route.params;

  const priceFormatted = `$${(item.price_per_day / 100).toFixed(2)}/day`;
  const ownerName     = item.owner?.display_name ?? 'Unknown';
  const ownerInitials = getInitials(ownerName);
  const ownerRating   = item.owner?.rating ?? 4.9;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back button row */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        {/* Full-width photo */}
        <View style={styles.photoContainer}>
          {item.photo_url ? (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}
          <View style={styles.tagWrapper}>
            <StatusTag status={item.status} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Item name */}
          <Text style={styles.itemName}>{item.name.toUpperCase()}</Text>

          {/* Lender row */}
          <Text style={styles.lenderText}>
            Listed by {ownerName}
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Price + size row */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceFormatted}</Text>
            <View style={styles.sizeBadge}>
              <Text style={styles.sizeBadgeText}>{item.size_label}</Text>
            </View>
          </View>

          {/* Location */}
          <Text style={styles.location}>{item.location_label}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
          <Text style={styles.description}>
            {item.description || 'No description provided.'}
          </Text>

          {/* Divider */}
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

        {/* Extra bottom padding so content isn't hidden behind CTA */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaContainer}>
        <Pressable style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>RENT NOW</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  scroll: {
    flex: 1,
  },

  // Back button
  backRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  backText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Photo
  photoContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.ivoryMid,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.ivoryMid,
  },
  tagWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
  },

  // Content
  content: {
    padding: theme.spacing.md,
  },
  itemName: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  lenderText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.ivoryMid,
    marginVertical: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  price: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 18,
    color: theme.colors.ink,
  },
  sizeBadge: {
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sizeBadgeText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 11,
    color: theme.colors.ink,
  },
  location: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  descriptionLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  description: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 20,
  },

  // Lender card
  lenderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lenderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lenderAvatarText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12,
    color: theme.colors.ink,
  },
  lenderInfo: {
    flex: 1,
  },
  lenderName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  lenderRating: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 1,
  },

  // CTA
  ctaContainer: {
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.ivoryMid,
  },
  ctaButton: {
    backgroundColor: theme.colors.yellow,
    borderRadius: theme.borderRadius,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
