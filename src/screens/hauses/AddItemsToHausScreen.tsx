import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useCloset } from '../../context/ClosetContext';
import type { AppStackParamList } from '../../navigation/AppStack';

type Nav   = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddItemsToHaus'>;

export default function AddItemsToHausScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { hausId, hausName } = route.params;

  const { items, updateItem } = useCloset();

  const candidates = useMemo(
    () => items.filter(i => i.haus_visibility?.[hausId] !== true),
    [items, hausId],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setIsSaving(true);
    try {
      const toAdd = items.filter(i => selected.has(i.id));
      await Promise.all(
        toAdd.map(item =>
          updateItem({ ...item, haus_visibility: { ...item.haus_visibility, [hausId]: true } }),
        ),
      );
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  }

  // Build 2-col grid rows
  const rows: typeof candidates[number][][] = [];
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

      {hausName ? (
        <View style={s.subBar}>
          <Text style={s.subBarText}>to  {hausName}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {candidates.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>All your closet items are already shared to this Haus.</Text>
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
                      <View style={[s.photo, { backgroundColor: '#E4E0D0' }]}>
                        {item.photo_url ? (
                          <Image source={{ uri: item.photo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        ) : (
                          <Ionicons name="shirt-outline" size={22} color="#14120C" style={{ opacity: 0.15 }} />
                        )}
                        {/* Checkmark overlay */}
                        {sel && (
                          <View style={[StyleSheet.absoluteFill, s.checkOverlay]}>
                            <Ionicons name="checkmark" size={18} color="#14120C" />
                          </View>
                        )}
                      </View>
                      <View style={s.cellBody}>
                        <Text numberOfLines={1} style={s.cellName}>{item.name}</Text>
                        <Text style={s.cellPrice}>${(item.price_per_day / 100).toFixed(2)}/day</Text>
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
          disabled={selected.size === 0 || isSaving}
          style={[s.addBtn, (selected.size === 0 || isSaving) && s.addBtnDisabled]}
        >
          <Text style={s.addBtnText}>
            {isSaving
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
    color: theme.colors.muted, textAlign: 'center', paddingHorizontal: 32,
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
    color: theme.colors.ivory, textTransform: 'uppercase', letterSpacing: 1.5,
  },
});
