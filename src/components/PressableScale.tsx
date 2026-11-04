import React, { useRef } from 'react';
import { Animated, Pressable, Platform } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const NATIVE = Platform.OS !== 'web';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the button shrinks while held. */
  scaleTo?: number;
};

/**
 * A Pressable that squishes while held and springs back on release — press feedback for the
 * app's primary actions (request, accept, list). Drop-in for Pressable with a static style.
 */
export default function PressableScale({ style, scaleTo = 0.94, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function springTo(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: NATIVE,
      speed: 40,
      bounciness: toValue === 1 ? 12 : 0,
    }).start();
  }

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => { springTo(scaleTo); onPressIn?.(e); }}
      onPressOut={(e: GestureResponderEvent) => { springTo(1); onPressOut?.(e); }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
