import React, { useState } from 'react';
import {
  View, Text, Image, Pressable, FlatList, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useCloset } from '../../context/ClosetContext';
import { useBoards } from '../../context/BoardsContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Item } from '../../types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddItemsToBoard'>;

const { width: SCREEN_W } = Dimensions.get('window');
const PAD = 14;
const GAP = 2;
const CELL_W = (SCREEN_W - PAD * 2 - GAP * 2) / 3;

export default function AddItemsToBoardScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { boardId } = route.params;
  const { items: allItems } = useCloset();
  const { boards, addItemsToBoard } = useBoards();

  const board = boards.find((b) => b.id === boardId);
  const availableItems = allItems.filter((item) => !board?.itemIds.includes(item.id));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) { navigation.goBack(); return; }
    setIsAdding(true);
    try {
      await addItemsToBoard(boardId, Array.from(selected));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not add items', e instanceof Error ? e.message : 'Please try again.');
      setIsAdding(false);
    }
  }

  function renderItem({ item, index }: { item: Item; index: number }) {
    const isSelected = selected.has(item.id);
    const col = index % 3;
    return (
      <Pressable
        onPress={() => toggle(item.id)}
        style={[
          styles.cell,
          { marginRight: col < 2 ? GAP : 0 },
        ]}
      >
        {item.photo_url
          ? <Image source={{ uri: item.photo_url }} style={styles.cellImage} resizeMode="cover" />
          : (
            <View style={[styles.cellImage, styles.cellPlaceholder]}>
              <Ionicons name="shirt-outline" size={22} color={theme.colors.ink} style={{ opacity: 0.12 }} />
            </View>
          )
        }
        {/* Item info */}
        <View style={styles.cellInfo}>
          <Text numberOfLines={1} style={styles.cellName}>{item.name}</Text>
          <Text style={styles.cellSub}>{item.size_label}</Text>
        </View>
        {/* Selected overlay */}
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={14} color="#3A3A00" />
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={22} color={theme.colors.ink} />
        </Pressable>
        <Text style={styles.title}>ADD ITEMS</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {board?.name ?? 'Board'} · {selected.size > 0 ? `${selected.size} selected` : 'tap to select'}
      </Text>

      {/* Grid */}
      <FlatList
        data={availableItems}
        keyExtractor={(i) => i.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>All your items are already in this board.</Text>
          </View>
        }
      />

      {/* Add button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.addBtn, (selected.size === 0 || isAdding) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={isAdding}
        >
          <Text style={styles.addBtnText}>
            {isAdding ? 'ADDING…' : selected.size > 0 ? `ADD ${selected.size} ITEM${selected.size > 1 ? 'S' : ''}` : 'DONE'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 15, letterSpacing: 1.5, color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11, color: theme.colors.muted,
    paddingHorizontal: 14, paddingVertical: 8,
  },

  grid: { paddingHorizontal: PAD, paddingBottom: 12 },

  cell: {
    width: CELL_W,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius, overflow: 'hidden',
    backgroundColor: theme.colors.ivory,
  },
  cellImage: { width: '100%', aspectRatio: 1 },
  cellPlaceholder: {
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  cellInfo: { padding: 5 },
  cellName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 9, color: theme.colors.ink,
  },
  cellSub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 9, color: theme.colors.muted, marginTop: 1,
  },

  selectedOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(255,255,173,0.35)',
    alignItems: 'flex-end', padding: 6,
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFAD',
    borderWidth: 1.5, borderColor: '#C8C820',
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { padding: 40, alignItems: 'center' },
  emptyText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13, color: theme.colors.muted, textAlign: 'center',
  },

  footer: { padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid },
  addBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingVertical: 14, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13, letterSpacing: 1.5, color: theme.colors.ivory,
  },
});
