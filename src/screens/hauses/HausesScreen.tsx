import { useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import HausListItem from '../../components/HausListItem';
import NotificationBell from '../../components/NotificationBell';
import MessagesIcon from '../../components/MessagesIcon';
import { useHauses } from '../../context/HausesContext';
import { useCloset } from '../../context/ClosetContext';
import type { AppStackParamList } from '../../navigation/AppStack';

export default function HausesScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { hauses } = useHauses();
  const { items } = useCloset();

  const pieceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const haus of hauses) {
      counts[haus.id] = items.filter(
        (item) => item.haus_visibility?.[haus.id] === true,
      ).length;
    }
    return counts;
  }, [hauses, items]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 15 && Math.abs(gs.dy) < gs.dx,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80) navigation.goBack();
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <Text style={styles.heading}>MY HAUSES</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => navigation.navigate('Friends')}
                style={styles.actionBtn}
                hitSlop={6}
              >
                <Ionicons name="person-add-outline" size={18} color={theme.colors.ink} />
              </Pressable>
              <MessagesIcon />
              <NotificationBell />
            </View>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>JOINED HAUSES</Text>

          {/* Haus list — negative margin lets HausListItem borders bleed edge-to-edge */}
          <View style={{ marginHorizontal: -theme.spacing.md }}>
            {hauses.map((haus) => (
              <HausListItem
                key={haus.id}
                haus={haus}
                pieceCount={pieceCounts[haus.id]}
                onPress={() => navigation.navigate('HausDetail', { haus })}
              />
            ))}
          </View>

          {/* Create Haus button */}
          <Pressable
            style={styles.createLargeBtn}
            onPress={() => navigation.navigate('CreateHaus')}
          >
            <Ionicons name="add" size={20} color="#3A3A00" />
            <Text style={styles.createLargeBtnText}>CREATE A HAUS</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38, height: 38,
    borderWidth: 2, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  sectionLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingTop: theme.spacing.md,
    paddingBottom: 8,
  },
  createLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    marginTop: 16,
    paddingVertical: 18,
  },
  createLargeBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
