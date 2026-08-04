import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../theme';
import NotificationBell from './NotificationBell';
import MessagesIcon from './MessagesIcon';
import type { AppStackParamList } from '../navigation/AppStack';

interface MastheadProps {
  subtitle?: string;
}

export default function Masthead({ subtitle }: MastheadProps) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Wordmark */}
        <Text style={styles.wordmark}>
          <Text style={styles.wear}>WEAR</Text>
          <Text style={styles.haus}> HAUS</Text>
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Friends')}
            hitSlop={6}
          >
            <Ionicons name="person-add-outline" size={18} color={theme.colors.ink} />
          </Pressable>
          <MessagesIcon />
          <NotificationBell />
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
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
