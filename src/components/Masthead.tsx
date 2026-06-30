import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import NotificationBell from './NotificationBell';

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

        <NotificationBell />
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
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
