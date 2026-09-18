import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import StatusTag from '../../components/StatusTag';
import { useHausCollections } from '../../context/HausCollectionsContext';
import { fetchCollectionItems } from '../../services/collectionService';
import { useCloset } from '../../context/ClosetContext';
import { useHauses } from '../../context/HausesContext';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Item } from '../../types';

type Nav   = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'CollectionDetail'>;

// Display shape derived from a real Item row
interface DisplayItem {
  id: string;
  name: string;
  pricePerDay: number;
  photoUrl?: string;
  photoThumbColor: string;
  ownerId: string;
  ownerName: string;
  ownerInitials: string;
  ownerAvatarColor: string;
  status: 'available' | 'lent' | 'wash' | 'draft';
}

function avatarColorForId(id: string): string {
  const palette = ['#FFFFAD', '#E2DED0', '#DDD8CC', '#D8D4C8', '#E8E4D4'];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function toDisplayItem(item: Item, profile: { display_name?: string } | null): DisplayItem {
  const ownerName = item.owner?.display_name ?? profile?.display_name ?? 'User';
  return {
    id:               item.id,
    name:             item.name,
    pricePerDay:      Math.round(item.price_per_day / 100),
    photoUrl:         item.photo_url,
    photoThumbColor:  '#E4E0D0',
    ownerId:          item.owner_id,
    ownerName,
    ownerInitials:    getInitials(ownerName),
    ownerAvatarColor: avatarColorForId(item.owner_id),
    status:           item.status === 'draft' ? 'available' : item.status,
  };
}

// ─── ContributorRow ───────────────────────────────────────────────────────────

interface Contributor {
  id: string;
  firstName: string;
  initials: string;
  avatarColor: string;
}

function ContributorRow({ contributors }: { contributors: Contributor[] }) {
  if (contributors.length === 0) return null;
  return (
    <View style={s.contributorRow}>
      {contributors.map(u => (
        <View key={u.id} style={s.chip}>
          <View style={[s.chipAvatar, { backgroundColor: u.avatarColor }]}>
            <Text style={s.chipInitials}>{u.initials}</Text>
          </View>
          <Text style={s.chipName}>{u.firstName}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── ItemGalleryWithOwners ────────────────────────────────────────────────────

function ItemGalleryWithOwners({
  items, onItemPress,
}: {
  items: DisplayItem[];
  onItemPress: (item: DisplayItem) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={s.emptyGallery}>
        <Text style={s.emptyGalleryText}>No items yet — add yours below</Text>
      </View>
    );
  }

  // 3-col grid built as rows of 3
  const rows: DisplayItem[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

  return (
    <View style={s.gallery}>
      {rows.map((row, ri) => (
        <View key={ri} style={s.galleryRow}>
          {row.map((item, ci) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onItemPress(item)}
              style={[
                s.galleryCell,
                ci < row.length - 1 && { borderRightWidth: 0.5 },
                ri < rows.length - 1 && { borderBottomWidth: 0.5 },
              ]}
            >
              <View style={[s.cellPhoto, { backgroundColor: item.photoThumbColor }]}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Ionicons name="shirt-outline" size={16} color="#14120C" style={{ opacity: 0.15 }} />
                )}
                <View style={s.statusWrap}>
                  <StatusTag status={item.status === 'draft' ? 'draft' : item.status} />
                </View>
                {/* Owner badge */}
                <View style={[s.ownerBadge, { backgroundColor: item.ownerAvatarColor }]}>
                  <Text style={s.ownerBadgeText}>{item.ownerInitials}</Text>
                </View>
              </View>
              <View style={s.cellBody}>
                <Text numberOfLines={1} style={s.cellName}>{item.name}</Text>
                <Text style={s.cellPrice}>${item.pricePerDay}/day</Text>
              </View>
            </TouchableOpacity>
          ))}
          {/* Pad last row with empty cells */}
          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
            <View key={`pad_${i}`} style={s.galleryCell} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CollectionDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { collectionId } = route.params;

  const { getCollectionById } = useHausCollections();
  const { items: closetItems } = useCloset();
  const { hauses } = useHauses();
  const { profile } = useAuth();

  const collection = getCollectionById(collectionId);
  const haus = hauses.find(h => h.id === collection?.hausId);

  const [remoteItems, setRemoteItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionItems(collectionId)
      .then(rows => { if (!cancelled) setRemoteItems(rows); })
      .catch(() => { if (!cancelled) setRemoteItems([]); });
    return () => { cancelled = true; };
  }, [collectionId]);

  if (!collection) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.topBar}>
          <Text style={s.backLabel}>← Back</Text>
        </TouchableOpacity>
        <View style={s.notFound}>
          <Text style={s.notFoundText}>Collection not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const items: DisplayItem[] = remoteItems.map(item => toDisplayItem(item, profile));

  // Dedupe contributors
  const contributorMap = new Map<string, Contributor>();
  items.forEach(item => {
    if (!contributorMap.has(item.ownerId)) {
      contributorMap.set(item.ownerId, {
        id:          item.ownerId,
        firstName:   item.ownerName.split(' ')[0],
        initials:    item.ownerInitials,
        avatarColor: item.ownerAvatarColor,
      });
    }
  });
  const contributors = Array.from(contributorMap.values());

  function handleItemPress(item: DisplayItem) {
    const real = closetItems.find(i => i.id === item.id);
    if (real) navigation.navigate('ItemDetail', { item: real });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={s.backLabel}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.collectionName} numberOfLines={1}>{collection.name}</Text>
          </View>
          <Text style={s.headerSub}>
            {items.length} items{haus ? ` · ${haus.name}` : ''}
          </Text>
        </View>

        <ContributorRow contributors={contributors} />

        <ItemGalleryWithOwners items={items} onItemPress={handleItemPress} />

        {/* Add My Items CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddItemsToCollection', { collectionId })}
          style={s.addBtn}
        >
          <Ionicons name="add" size={14} color={theme.colors.ink} />
          <Text style={s.addBtnText}>Add My Items to Collection</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  topBar: { paddingHorizontal: 16, paddingVertical: 12 },

  header: {
    paddingTop: 8, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 2, borderBottomColor: '#14120C',
  },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4,
  },
  backLabel: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  collectionName: {
    flex: 1,
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 17,
    letterSpacing: 0.6, textTransform: 'uppercase', color: '#14120C',
  },
  headerSub: {
    fontFamily: theme.fonts.interLight, fontSize: 10, color: '#7A7762',
  },

  contributorRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E2DED0',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0EDE0', borderWidth: 1, borderColor: '#E2DED0',
    borderRadius: 20, paddingVertical: 3, paddingLeft: 3, paddingRight: 9,
  },
  chipAvatar: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  chipInitials: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 6.5, color: '#14120C',
  },
  chipName: {
    fontFamily: theme.fonts.interRegular, fontSize: 10, color: '#14120C',
  },

  emptyGallery: {
    paddingVertical: 40, alignItems: 'center', marginHorizontal: 16,
  },
  emptyGalleryText: {
    fontFamily: theme.fonts.interLight, fontSize: 13, color: '#7A7762',
    textAlign: 'center',
  },

  gallery: {
    borderWidth: 1.5, borderColor: '#14120C',
    borderRadius: 2, overflow: 'hidden',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#14120C',
  },
  galleryRow: {
    flexDirection: 'row',
  },
  galleryCell: {
    flex: 1,
    borderColor: '#E2DED0',
  },
  cellPhoto: {
    aspectRatio: 3 / 4,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  statusWrap: {
    position: 'absolute', top: 4, left: 4,
  },
  ownerBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDFBF4',
    alignItems: 'center', justifyContent: 'center',
  },
  ownerBadgeText: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 5.5, color: '#14120C',
  },
  cellBody: {
    paddingTop: 4, paddingHorizontal: 6, paddingBottom: 5,
    borderTopWidth: 0.5, borderTopColor: '#E2DED0',
    backgroundColor: '#FDFBF4',
  },
  cellName: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 8.5, color: '#14120C',
  },
  cellPrice: {
    fontFamily: theme.fonts.interLight, fontSize: 8.5, color: '#7A7762',
    marginTop: 1,
  },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 16,
    borderWidth: 1.5, borderColor: '#14120C',
    borderRadius: 2, paddingVertical: 11,
  },
  addBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase', color: '#14120C',
  },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: theme.fonts.interLight, fontSize: 13, color: '#7A7762' },
});
