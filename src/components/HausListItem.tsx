import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
import type { Haus } from '../types';

interface HausListItemProps {
  haus: Haus;
  pieceCount?: number;
  onPress: () => void;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

export default function HausListItem({ haus, pieceCount, onPress }: HausListItemProps) {
  // Generate up to 3 avatar placeholders from haus name words
  const words = haus.name.split(' ').slice(0, 3);

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Avatar stack */}
      <View style={styles.avatarStack}>
        {words.map((word, index) => (
          <View
            key={index}
            style={[
              styles.avatar,
              { backgroundColor: index === 0 ? theme.colors.yellow : theme.colors.ivoryMid },
              index > 0 && { marginLeft: -10 },
            ]}
          >
            <Text style={styles.avatarInitial}>{getInitial(word)}</Text>
          </View>
        ))}
      </View>

      {/* Haus info */}
      <View style={styles.info}>
        <Text style={styles.hausName} numberOfLines={1}>{haus.name.toUpperCase()}</Text>
        <Text style={styles.meta}>
          {haus.member_count} members · {pieceCount ?? haus.piece_count} pieces
        </Text>
      </View>

      {/* View button */}
      <Pressable onPress={onPress} style={styles.viewButton}>
        <Text style={styles.viewButtonText}>VIEW</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    paddingHorizontal: theme.spacing.md,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.ivory,
  },
  avatarInitial: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 10,
    color: theme.colors.ink,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  hausName: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  meta: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  viewButton: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewButtonText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
