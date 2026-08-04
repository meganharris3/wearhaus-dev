import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../../theme';

interface PermissionsStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PermissionsStep({ onNext, onBack }: PermissionsStepProps) {
  async function handleEnable() {
    await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => {});
    onNext();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
        </Pressable>

        <Text style={styles.title}>STAY IN THE LOOP</Text>
        <Text style={styles.subtitle}>Enable access to get the best Wearhaus experience.</Text>

        <View style={styles.card}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.ink} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardSub}>Get alerts for borrow requests, messages, and updates</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Ionicons name="images-outline" size={24} color={theme.colors.ink} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Photos</Text>
            <Text style={styles.cardSub}>Add photos to your closet items and profile</Text>
          </View>
        </View>

        <Pressable style={styles.cta} onPress={handleEnable}>
          <Text style={styles.ctaText}>ENABLE & CONTINUE</Text>
        </Pressable>

        <Pressable onPress={onNext} style={styles.skipBtn}>
          <Text style={styles.skipText}>Not now</Text>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    padding: 16,
    marginBottom: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
  },
  cta: {
    backgroundColor: theme.colors.yellow,
    borderColor: '#C8C820',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
