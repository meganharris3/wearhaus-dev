import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';
import ItemCard from '../../components/ItemCard';
import { useCloset } from '../../context/ClosetContext';
import type { Item } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';

function getInitial(word: string) {
  return word.trim().charAt(0).toUpperCase();
}

export default function HausDetailScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppStackParamList, 'HausDetail'>>();
  const { haus } = route.params;
  const { items: allItems } = useCloset();

  const items = allItems.filter(
    (item) => item.haus_visibility?.[haus.id] === true,
  );
  const words = haus.name.split(' ').slice(0, 3);

  function renderItem({ item }: { item: Item }) {
    return (
      <ItemCard
        item={item}
        onPress={() => navigation.navigate('ItemDetail', { item })}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListHeaderComponent={
          <Header haus={haus} words={words} pieceCount={items.length} onBack={() => navigation.goBack()} />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

function Header({
  haus,
  words,
  pieceCount,
  onBack,
}: {
  haus: ReturnType<typeof useRoute<RouteProp<AppStackParamList, 'HausDetail'>>>['params']['haus'];
  words: string[];
  pieceCount: number;
  onBack: () => void;
}) {
  return (
    <>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
      </View>

      {/* Haus hero card */}
      <View style={styles.heroCard}>
        {/* Avatar stack */}
        <View style={styles.avatarStack}>
          {words.map((word, i) => (
            <View
              key={i}
              style={[
                styles.avatar,
                { backgroundColor: i === 0 ? theme.colors.yellow : theme.colors.ivoryMid },
                i > 0 && { marginLeft: -12 },
              ]}
            >
              <Text style={styles.avatarInitial}>{getInitial(word)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.hausName}>{haus.name.toUpperCase()}</Text>

        {haus.description ? (
          <Text style={styles.description}>{haus.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaValue}>{haus.member_count}</Text>
            <Text style={styles.metaLabel}>MEMBERS</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaPill}>
            <Text style={styles.metaValue}>{pieceCount}</Text>
            <Text style={styles.metaLabel}>PIECES</Text>
          </View>
        </View>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>CLOSET</Text>
        {pieceCount > 0 && (
          <Text style={styles.sectionCount}>{pieceCount} items</Text>
        )}
      </View>
    </>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>NO ITEMS YET</Text>
        <Text style={styles.emptySubtitle}>
          Members haven't shared any pieces to this Haus yet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  listContent: { paddingBottom: 32 },
  columnWrapper: {
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 10,
  },

  // Top bar
  topBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  backBtn: {},
  backText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Hero card
  heroCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.ivory,
  },
  avatarInitial: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  hausName: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 19,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaPill: { alignItems: 'center' },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.ivoryMid,
    marginHorizontal: 16,
  },
  metaValue: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ink,
  },
  metaLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 9,
    color: theme.colors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ivoryMid,
    backgroundColor: theme.colors.ivoryDark,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
  },

  // Empty
  emptyWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 8,
  },
  emptyCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
