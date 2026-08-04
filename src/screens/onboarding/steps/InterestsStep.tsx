import React from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

const STYLE_CHIPS = ['Formal', 'Casual', 'Streetwear', 'Vintage', 'Festival', 'Athleisure', 'Date Night', 'Going Out'];

interface InterestsStepProps {
  onNext: () => void;
  onBack: () => void;
  interests: string[];
  setInterests: (v: string[]) => void;
}

export default function InterestsStep({
  onNext,
  onBack,
  interests,
  setInterests,
}: InterestsStepProps) {
  const { user, refreshProfile } = useAuth();

  function toggleInterest(chip: string) {
    if (interests.includes(chip)) {
      setInterests(interests.filter((i) => i !== chip));
    } else {
      setInterests([...interests, chip]);
    }
  }

  async function handleContinue() {
    try {
      if (user?.id && interests.length > 0) {
        await supabase.from('users').update({ interests }).eq('id', user.id);
        await refreshProfile();
      }
      onNext();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save interests.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
        </Pressable>

        <Text style={styles.title}>YOUR STYLE</Text>
        <Text style={styles.subtitle}>Select what you wear — we'll personalize your feed.</Text>

        <View style={styles.chipWrap}>
          {STYLE_CHIPS.map((chip) => {
            const selected = interests.includes(chip);
            return (
              <Pressable
                key={chip}
                onPress={() => toggleInterest(chip)}
                style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.cta} onPress={handleContinue}>
          <Text style={styles.ctaText}>CONTINUE</Text>
        </Pressable>

        <Pressable onPress={onNext} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  inner: {
    flex: 1,
    padding: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    marginBottom: 32,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  chip: {
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: theme.colors.ink,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
  },
  chipText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12,
  },
  chipTextSelected: {
    color: theme.colors.ivory,
  },
  chipTextUnselected: {
    color: theme.colors.ink,
  },
  cta: {
    backgroundColor: theme.colors.yellow,
    borderColor: '#C8C820',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
