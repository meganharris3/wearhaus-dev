import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import StatusTag from './StatusTag';
import type { Item, VisibilityMode } from '../types';

const VIS_CONFIG: Record<VisibilityMode, {
  bg: string; icon: React.ComponentProps<typeof Ionicons>['name']; iconColor: string; border?: string;
}> = {
  public:  { bg: '#14120C', icon: 'globe-outline',   iconColor: '#FDFBF4' },
  friends: { bg: '#FFFFAD', icon: 'people-outline',  iconColor: '#3A3A00', border: '#C8C820' },
  hauses:  { bg: '#F0EDE0', icon: 'home-outline',    iconColor: '#7A7762', border: '#E2DED0' },
  private: { bg: '#E2DED0', icon: 'lock-closed-outline', iconColor: '#14120C' },
};

function VisibilityIcon({ visibility }: { visibility: VisibilityMode }) {
  const cfg = VIS_CONFIG[visibility];
  return (
    <View style={[
      styles.visIcon,
      { backgroundColor: cfg.bg, borderColor: cfg.border ?? 'transparent', borderWidth: cfg.border ? 1 : 0 },
    ]}>
      <Ionicons name={cfg.icon} size={14} color={cfg.iconColor} />
    </View>
  );
}

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ItemCard({ item, onPress, onEdit, onDelete }: ItemCardProps) {
  const priceFormatted = `$${(item.price_per_day / 100).toFixed(2)}/day`;
  const [liked, setLiked] = useState(false);

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
        {onEdit && (
          <Pressable onPress={onEdit} style={styles.editBtn} hitSlop={8}>
            <Ionicons name="pencil" size={10} color={theme.colors.ink} />
          </Pressable>
        )}
        {onDelete && (
          <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={10} color="#C0392B" />
          </Pressable>
        )}
        {item.status !== 'draft' && item.visibility && (
          <VisibilityIcon visibility={item.visibility} />
        )}
      </View>

      {/* Card body */}
      <View style={styles.body}>
        <View style={styles.bodyInner}>
          <View style={{ flex: 1 }}>
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
          {!onEdit && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); setLiked((l) => !l); }}
              style={styles.heartBtn}
              hitSlop={6}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={liked ? '#E8524A' : theme.colors.muted}
              />
            </Pressable>
          )}
        </View>
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
  editBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: theme.colors.ivory,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 34,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  heartBtn: {
    paddingBottom: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  visIcon: {
    position: 'absolute',
    bottom: 6, right: 6,
    width: 24, height: 24, borderRadius: 3,
    alignItems: 'center', justifyContent: 'center',
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
