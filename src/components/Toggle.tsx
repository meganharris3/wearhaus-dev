import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
}

export default function Toggle({ value, onToggle }: ToggleProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  }, [value, anim]);

  const knobTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 17],
  });

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.ivoryMid, theme.colors.yellow],
  });

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.ivoryMid, theme.colors.yellowBorder],
  });

  const knobColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.muted, theme.colors.yellowText],
  });

  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <Animated.View style={[styles.track, { backgroundColor: bgColor, borderColor }]}>
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: knobColor, transform: [{ translateX: knobTranslate }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 38,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
