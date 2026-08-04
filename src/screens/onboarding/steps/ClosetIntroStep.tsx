import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';

interface ClosetIntroStepProps {
  onNext: () => void;
}

export default function ClosetIntroStep({ onNext }: ClosetIntroStepProps) {
  const { completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleComplete(addItem: boolean) {
    setLoading(true);
    try {
      if (addItem) {
        await AsyncStorage.setItem('wearhaus:pending_action', 'add-item');
      }
      await completeOnboarding();
      onNext();
    } catch {
      // completeOnboarding failing is non-fatal — RootNavigator will
      // retry when profile reloads. Don't block the user here.
      onNext();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <View style={styles.iconBox}>
          <Ionicons name="shirt-outline" size={32} color="#3A3A00" />
        </View>

        <Text style={styles.title}>READY TO SHARE?</Text>
        <Text style={styles.subtitle}>
          Add your first item to start lending and earning on Wearhaus.
        </Text>

        <Pressable
          style={[styles.cta, { opacity: loading ? 0.6 : 1 }]}
          onPress={() => handleComplete(true)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={theme.colors.yellowText} />
            : <Text style={styles.ctaText}>ADD MY FIRST ITEM</Text>
          }
        </Pressable>

        <Pressable
          style={[styles.ghost, { opacity: loading ? 0.4 : 1 }]}
          onPress={() => handleComplete(false)}
          disabled={loading}
        >
          <Text style={styles.ghostText}>EXPLORE FIRST</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconBox: {
    width: 64, height: 64, backgroundColor: theme.colors.yellow,
    borderRadius: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 26,
    color: theme.colors.ink, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight, fontSize: 14, color: theme.colors.muted,
    textAlign: 'center', marginBottom: 40, lineHeight: 20,
  },
  cta: {
    backgroundColor: theme.colors.yellow, borderColor: '#C8C820', borderWidth: 1.5,
    borderRadius: 2, paddingHorizontal: 24, paddingVertical: 14,
    alignItems: 'center', alignSelf: 'stretch', marginBottom: 12,
  },
  ctaText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: theme.colors.yellowText, textTransform: 'uppercase', letterSpacing: 1.2,
  },
  ghost: {
    borderWidth: 1, borderColor: theme.colors.ivoryMid, borderRadius: 2,
    paddingHorizontal: 24, paddingVertical: 14,
    alignItems: 'center', alignSelf: 'stretch', marginTop: 12,
  },
  ghostText: {
    fontFamily: theme.fonts.interLight, fontSize: 13,
    color: theme.colors.muted, textAlign: 'center',
  },
});
