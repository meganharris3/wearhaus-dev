import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface MastheadProps {
  subtitle?: string;
}

export default function Masthead({ subtitle }: MastheadProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Wordmark */}
        <Text style={styles.wordmark}>
          <Text style={styles.wear}>WEAR</Text>
          <Text style={styles.haus}> HAUS</Text>
        </Text>

        {/* Bell icon with badge */}
        <View style={styles.bellWrapper}>
          <Ionicons name="notifications-outline" size={22} color={theme.colors.ink} />
          <View style={styles.badge} />
        </View>
      </View>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: theme.colors.ivory,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: theme.colors.ink,
  },
  wear: {
    color: theme.colors.ink,
  },
  haus: {
    color: theme.colors.yellowText,
    backgroundColor: theme.colors.yellow,
  },
  bellWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.yellow,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
