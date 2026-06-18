import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await signUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (err) setError(err);
    // On success RootNavigator automatically switches to AppStack via session state
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wordmark */}
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>
              <Text style={styles.wear}>WEAR</Text>
              <Text style={styles.haus}> HAUS</Text>
            </Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>JOIN YOUR CAMPUS CLOSET</Text>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Display Name"
              placeholderTextColor={theme.colors.muted}
              autoCorrect={false}
              textContentType="name"
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              textContentType="newPassword"
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleSignUp}
              style={[styles.createButton, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.yellowText} size="small" />
              ) : (
                <Text style={styles.createButtonText}>CREATE ACCOUNT</Text>
              )}
            </Pressable>
          </View>

          {/* Sign in link */}
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkBold}>SIGN IN</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  wordmarkRow: {
    marginBottom: 8,
  },
  wordmark: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 28,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  wear: {
    color: theme.colors.ink,
  },
  haus: {
    color: theme.colors.yellowText,
    backgroundColor: theme.colors.yellow,
  },
  tagline: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: '100%',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: theme.fonts.interRegular,
    fontSize: 14,
    color: theme.colors.ink,
  },
  errorText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 12,
    color: '#C0392B',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: theme.colors.yellow,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  linkRow: {
    marginTop: theme.spacing.md,
  },
  linkText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  linkBold: {
    fontFamily: theme.fonts.barlowBold,
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },
});
