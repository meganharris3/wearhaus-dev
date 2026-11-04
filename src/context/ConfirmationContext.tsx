import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const NATIVE = Platform.OS !== 'web';
const VISIBLE_MS = 1400;

type Confirm = (message: string) => void;

// Without a provider (e.g. a screen rendered on its own in a test) confirming is a no-op.
const ConfirmationContext = createContext<Confirm>(() => {});

/**
 * Shows a short "✓ Request sent"-style confirmation once an action has actually succeeded.
 * It lives at the app root rather than on the button, because the buttons it confirms usually
 * disappear the moment their action completes (a request card flips to Accepted, the screen
 * navigates away after listing an item).
 */
export function useConfirmation(): Confirm {
  return useContext(ConfirmationContext);
}

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const nextId = useRef(0);

  const confirm = useCallback<Confirm>((message) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      {toast && (
        // keyed so a second confirmation restarts the animation instead of reusing the first
        <ConfirmationToast key={toast.id} message={toast.message} onDone={() => setToast(null)} />
      )}
    </ConfirmationContext.Provider>
  );
}

function ConfirmationToast({ message, onDone }: { message: string; onDone: () => void }) {
  const appear = useRef(new Animated.Value(0)).current;
  const check  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(appear, { toValue: 1, useNativeDriver: NATIVE, speed: 18, bounciness: 6 }),
        Animated.sequence([
          Animated.delay(90),
          Animated.spring(check, { toValue: 1, useNativeDriver: NATIVE, speed: 14, bounciness: 14 }),
        ]),
      ]),
      Animated.delay(VISIBLE_MS),
      Animated.timing(appear, { toValue: 0, duration: 220, useNativeDriver: NATIVE }),
    ]);
    anim.start(({ finished }) => { if (finished) onDone(); });
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.layer} pointerEvents="none">
      <Animated.View
        accessibilityRole="alert"
        style={[styles.pill, {
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        }]}
      >
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: check }] }]}>
          <Ionicons name="checkmark" size={14} color={theme.colors.ink} />
        </Animated.View>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 110,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12,
    color: theme.colors.ivory,
    letterSpacing: 0.3,
  },
});
