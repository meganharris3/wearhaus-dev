import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.ink,
    margin: 0,
    padding: 0,
  },
});
