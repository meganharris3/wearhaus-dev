import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useFadeOnFocus(duration = 220) {
  const opacity = useRef(new Animated.Value(0)).current;
  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, [opacity]),
  );
  return opacity;
}
