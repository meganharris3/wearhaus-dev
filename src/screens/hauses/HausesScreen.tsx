import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import HausListItem from '../../components/HausListItem';
import type { Haus } from '../../types';

const MOCK_HAUSES: Haus[] = [
  {
    id: '1',
    name: 'NYU Village Collective',
    member_count: 2,
    piece_count: 5,
    description: 'Lower Manhattan students.',
  },
  {
    id: '2',
    name: 'Uptown Closet',
    member_count: 1,
    piece_count: 3,
    description: 'Columbia and Barnard students.',
  },
];

export default function HausesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.heading}>MY HAUSES</Text>
          <Pressable style={styles.createButton}>
            <Text style={styles.createButtonText}>+ CREATE</Text>
          </Pressable>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>JOINED HAUSES</Text>

        {/* Haus list */}
        {MOCK_HAUSES.map((haus) => (
          <HausListItem
            key={haus.id}
            haus={haus}
            onPress={() => {}}
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

  // Header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 12,
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
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section label
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

  // Find more box
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
