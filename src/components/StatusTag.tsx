import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Status = 'available' | 'lent' | 'wash' | 'draft';

interface StatusTagProps {
  status: Status;
}

const TAG_CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  available: { label: 'AVAIL.', bg: theme.colors.yellow,   color: theme.colors.yellowText },
  lent:      { label: 'LENT',   bg: theme.colors.ink,      color: theme.colors.ivory },
  wash:      { label: 'WASH',   bg: theme.colors.ivoryMid, color: theme.colors.ink },
  draft:     { label: 'DRAFT',  bg: theme.colors.ivoryMid, color: theme.colors.ink },
};

export default function StatusTag({ status }: StatusTagProps) {
  const { label, bg, color } = TAG_CONFIG[status];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: theme.borderRadius,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
