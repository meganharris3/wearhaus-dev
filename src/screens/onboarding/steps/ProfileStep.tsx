import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { uploadAvatar } from '../../../services/storageService';

interface ProfileStepProps {
  onNext: () => void;
  onBack: () => void;
  name: string;
  username: string;
  setUsername: (v: string) => void;
  localAvatar: string | null;
  setLocalAvatar: (v: string | null) => void;
}

export default function ProfileStep({
  onNext,
  onBack,
  name,
  username,
  setUsername,
  localAvatar,
  setLocalAvatar,
}: ProfileStepProps) {
  const { updateProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setUsername(name.toLowerCase().replace(/\s+/g, ''));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setLocalAvatar(result.assets[0].uri);
    }
  }

  async function handleContinue() {
    setErrorMessage(null);

    if (!user?.id) {
      setErrorMessage('Session not found — please confirm your email and sign in again.');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('Please choose a username.');
      return;
    }

    setLoading(true);
    try {
      // Check username is not already taken by another user.
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .neq('id', user.id)
        .maybeSingle();
      if (existing) {
        setErrorMessage('That username is already taken. Please choose another.');
        setLoading(false);
        return;
      }

      if (name) {
        await updateProfile({ display_name: name, username });
      } else {
        await updateProfile({ username });
      }
      if (localAvatar) {
        const url = await uploadAvatar(localAvatar, user.id);
        await updateProfile({ avatar_url: url });
      }
      onNext();
    } catch (err) {
      console.error('[ProfileStep] handleContinue error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
        </Pressable>

        <Text style={styles.title}>YOUR PROFILE</Text>
        <Text style={styles.subtitle}>Add a photo and pick a username to get started.</Text>

        <Pressable onPress={pickAvatar} style={styles.avatarWrap}>
          {localAvatar ? (
            <Image source={{ uri: localAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View style={styles.avatarOverlay}>
            <Ionicons name="camera-outline" size={20} color={theme.colors.ink} style={{ opacity: 0.7 }} />
          </View>
        </Pressable>

        <View style={styles.usernameRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Pressable style={[styles.cta, { opacity: loading ? 0.6 : 1 }]} onPress={handleContinue} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={theme.colors.yellowText} />
            : <Text style={styles.ctaText}>CONTINUE</Text>
          }
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
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#C8C820',
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#ccc',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    backgroundColor: theme.colors.ivory,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  atSign: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 14,
    color: theme.colors.ink,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: theme.fonts.interRegular,
    fontSize: 14,
    color: theme.colors.ink,
  },
  errorText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 12,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: theme.colors.yellow,
    borderColor: '#C8C820',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
