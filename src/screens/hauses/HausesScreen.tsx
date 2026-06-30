import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../../theme';
import HausListItem from '../../components/HausListItem';
import NotificationBell from '../../components/NotificationBell';
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>MY HAUSES</Text>
          <View style={styles.headerActions}>
            <NotificationBell />
            <Pressable
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateHaus')}
            >
              <Text style={styles.createButtonText}>+ CREATE</Text>
            </Pressable>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>JOINED HAUSES</Text>

        {/* Haus list */}
        {hauses.map((haus) => (
          <HausListItem
            key={haus.id}
            haus={haus}
            pieceCount={pieceCounts[haus.id]}
            onPress={() => navigation.navigate('HausDetail', { haus })}
          />
        ))}

        {/* Find More Hauses box */}
        <View style={styles.findMoreBox}>
          <Text style={styles.findMoreTitle}>FIND MORE HAUSES</Text>
          <Text style={styles.findMoreSubtitle}>
            Discover groups near your campus
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  createButton: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 8,
  },

  findMoreBox: {
    backgroundColor: theme.colors.ivoryDark,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius,
    padding: 20,
    margin: theme.spacing.md,
    alignItems: 'center',
  },
  findMoreTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  findMoreSubtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
