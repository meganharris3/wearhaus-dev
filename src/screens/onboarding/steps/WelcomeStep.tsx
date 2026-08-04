import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';

interface WelcomeStepProps {
  onNext: () => void;
  onGoToLogin: () => void;
}

export default function WelcomeStep({ onNext, onGoToLogin }: WelcomeStepProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.wordmark}>
          <Text style={styles.wear}>WEAR</Text>
          <Text style={styles.haus}>HAUS</Text>
        </View>
        <Text style={styles.sub}>A social fashion network.</Text>
        <Pressable style={styles.cta} onPress={onNext}>
          <Text style={styles.ctaText}>GET STARTED</Text>
        </Pressable>
        <Pressable onPress={onGoToLogin}>
          <Text style={styles.loginLink}>I already have an account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  wordmark: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  wear: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 40,
    color: theme.colors.ivory,
    letterSpacing: 4,
  },
  haus: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 40,
    color: theme.colors.yellow,
    letterSpacing: 4,
  },
  sub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 14,
    color: theme.colors.ivory,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 48,
  },
  cta: {
    backgroundColor: theme.colors.yellow,
    borderColor: '#C8C820',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginBottom: 16,
  },
  ctaText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  loginLink: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
  },
});
