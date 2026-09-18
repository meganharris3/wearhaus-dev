import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHausCollections } from '../../context/HausCollectionsContext';
import { fetchCollectionItems } from '../../services/collectionService';
import { useCloset } from '../../context/ClosetContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Item } from '../../types';

type Nav   = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddItemsToCollection'>;

interface SelectableItem {
  id: string;
  name: string;
  pricePerDay: number;
  photoUrl?: string;
  photoThumbColor: string;
}

function toSelectable(item: Item): SelectableItem {
  return {
    id:              item.id,
    name:            item.name,
    pricePerDay:     Math.round(item.price_per_day / 100),
    photoUrl:        item.photo_url,
    photoThumbColor: '#E4E0D0',
  };
}

export default function AddItemsToCollectionScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { collectionId } = route.params;

  const { getCollectionById, addItemsToCollection } = useHausCollections();
  const { items: closetItems } = useCloset();

  const collection = getCollectionById(collectionId);

  const [alreadyAddedIds, setAlreadyAddedIds] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionItems(collectionId)
      .then(rows => { if (!cancelled) setAlreadyAddedIds(new Set(rows.map(i => i.id))); })
      .catch(() => { if (!cancelled) setAlreadyAddedIds(new Set()); });
    return () => { cancelled = true; };
  }, [collectionId]);

  // Only real closet items can be added — collection items are always real now.
  const candidates: SelectableItem[] = useMemo(() => {
    return closetItems
      .filter(i => !alreadyAddedIds.has(i.id))
      .map(toSelectable);
  }, [closetItems, alreadyAddedIds]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0 || isAdding) return;
    setIsAdding(true);
    try {
      await addItemsToCollection(collectionId, Array.from(selected));
      navigation.goBack();
    } catch {
      setIsAdding(false);
    }
  }

  // Build 2-col grid rows
  const rows: SelectableItem[][] = [];
  for (let i = 0; i < candidates.length; i += 2) {
    rows.push(candidates.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backLabel}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>ADD ITEMS</Text>
        <View style={{ width: 48 }} />
      </View>

      {collection && (
        <View style={s.subBar}>
          <Text style={s.subBarText}>to  {collection.name}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {candidates.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>All items are already in this collection.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {rows.map((row, ri) => (
              <View key={ri} style={s.row}>
                {row.map(item => {
                  const sel = selected.has(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggle(item.id)}
                      style={[s.cell, sel && s.cellSelected]}
                      activeOpacity={0.85}
                    >
                      {/* Photo */}
                      <View style={[s.photo, { backgroundColor: item.photoThumbColor }]}>
                        {item.photoUrl ? (
                          <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        ) : (
                          <Ionicons name="shirt-outline" size={22} color="#14120C" style={{ opacity: 0.15 }} />
                        )}
                        {/* Checkmark overlay */}
                        {sel && (
                          <View style={s.checkOverlay}>
                            <Ionicons name="checkmark" size={18} color="#14120C" />
                          </View>
                        )}
                      </View>
                      <View style={s.cellBody}>
                        <Text numberOfLines={1} style={s.cellName}>{item.name}</Text>
                        <Text style={s.cellPrice}>${item.pricePerDay}/day</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {/* Pad odd last row */}
                {row.length === 1 && <View style={s.cell} />}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={handleAdd}
          disabled={selected.size === 0 || isAdding}
          style={[s.addBtn, (selected.size === 0 || isAdding) && s.addBtnDisabled]}
        >
          <Text style={s.addBtnText}>
            {isAdding
              ? 'Adding…'
              : selected.size === 0
                ? 'Select Items'
                : `Add ${selected.size} Item${selected.size > 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1.5, borderBottomColor: theme.colors.ink,
  },
  backLabel: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 0.5,
    width: 48,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 15,
    letterSpacing: 1.2, color: theme.colors.ink, textTransform: 'uppercase',
  },

  subBar: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  subBarText: {
    fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted,
  },

  scroll: { paddingTop: 12, paddingHorizontal: 12 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: {
    fontFamily: theme.fonts.interLight, fontSize: 13,
    color: theme.colors.muted, textAlign: 'center',
  },

  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },

  cell: {
    flex: 1,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    borderRadius: 4, overflow: 'hidden',
    backgroundColor: theme.colors.ivory,
  },
  cellSelected: {
    borderColor: theme.colors.ink, borderWidth: 2,
  },

  photo: {
    aspectRatio: 3 / 4,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,173,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  cellBody: {
    paddingTop: 5, paddingHorizontal: 7, paddingBottom: 6,
    borderTopWidth: 0.5, borderTopColor: theme.colors.ivoryMid,
  },
  cellName: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 9.5, color: '#14120C',
  },
  cellPrice: {
    fontFamily: theme.fonts.interLight, fontSize: 9, color: theme.colors.muted, marginTop: 1,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid,
    backgroundColor: theme.colors.ivory,
  },
  addBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.ivory,
  },
});
