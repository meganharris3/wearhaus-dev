import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius,
    borderWidth: 1.5,
    marginRight: 6,
    marginBottom: 6,
  },
  selected: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  unselected: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.ivoryMid,
  },
  label: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  labelSelected: {
    color: theme.colors.yellowText,
  },
  labelUnselected: {
    color: theme.colors.muted,
  },
});
