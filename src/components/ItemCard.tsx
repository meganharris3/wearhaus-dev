import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
import StatusTag from './StatusTag';
import type { Item } from '../types';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
}

function ItemCard({ item, onPress }: ItemCardProps) {
  const priceFormatted = `$${(item.price_per_day / 100).toFixed(2)}/day`;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Photo area */}
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

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.lenderName} numberOfLines={1}>
          {item.owner?.display_name ?? ''}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{priceFormatted}</Text>
          <Text style={styles.size}>{item.size_label}</Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>{item.location_label}</Text>
      </View>
    </Pressable>
  );
}

export default React.memo(ItemCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
    backgroundColor: theme.colors.ivory,
  },
  photoContainer: {
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
    top: 6,
    left: 6,
  },
  body: {
    padding: 8,
    gap: 2,
  },
  itemName: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lenderName: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 11,
    color: theme.colors.ink,
  },
  size: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: theme.colors.muted,
  },
  location: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 1,
  },
});
