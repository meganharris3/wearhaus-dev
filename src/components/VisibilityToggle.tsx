import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VisibilityMode } from '../types';

type Option = { key: VisibilityMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

const ITEM_OPTIONS: Option[] = [
  { key: 'public',  label: 'Public',  icon: 'globe-outline'      },
  { key: 'hauses',  label: 'Hauses',  icon: 'home-outline'       },
  { key: 'friends', label: 'Friends', icon: 'people-outline'     },
];

export const BOARD_OPTIONS: Option[] = [
  { key: 'public',  label: 'Public',  icon: 'globe-outline'      },
  { key: 'friends', label: 'Friends', icon: 'people-outline'     },
  { key: 'private', label: 'Private', icon: 'lock-closed-outline'},
];

interface VisibilityToggleProps {
  value: VisibilityMode;
  onChange: (v: VisibilityMode) => void;
  options?: Option[];
}

export default function VisibilityToggle({ value, onChange, options = ITEM_OPTIONS }: VisibilityToggleProps) {
  return (
    <View style={styles.container}>
      {options.map((opt, idx) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              active && styles.segmentActive,
              idx < options.length - 1 && styles.segmentBorder,
            ]}
          >
            <Ionicons
              name={opt.icon}
              size={14}
              color={active ? '#3A3A00' : '#7A7762'}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#14120C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#FFFFAD',
  },
  segmentBorder: {
    borderRightWidth: 1,
    borderRightColor: '#14120C',
  },
  label: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#7A7762',
  },
  labelActive: {
    color: '#3A3A00',
  },
});
