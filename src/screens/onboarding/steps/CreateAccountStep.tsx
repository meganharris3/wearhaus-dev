import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

interface CreateAccountStepProps {
  onNext: () => void;
  onBack: () => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}

export default function CreateAccountStep({
  onNext,
  onBack,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
}: CreateAccountStepProps) {
  const { signUp } = useAuth();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);

  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordValid = password.length >= 8;
  const isFormValid =
    name.trim().length > 0 &&
    isEmailValid &&
    isPasswordValid &&
    password === confirmPassword;

  // Listen for Supabase email confirmation and auto-advance
  useEffect(() => {
    if (!emailSent) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        onNext();
      }
    });
    return () => subscription.unsubscribe();
  }, [emailSent, onNext]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleContinue() {
    setErrorMessage(null);
    if (!name.trim()) { setErrorMessage('Please enter your full name.'); return; }
    if (!isEmailValid) { setErrorMessage('Please enter a valid email address.'); return; }
    if (!isPasswordValid) { setErrorMessage('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setErrorMessage("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setEmailSent(true);
  }

  async function handleResend() {
    setResendError(null);
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      setResendError(error.message);
    } else {
      setResendCooldown(60);
    }
  }

  // ── Email sent / awaiting confirmation ────────────────────────────────────────
  if (emailSent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.verifyRoot}>
          <View style={styles.verifyIconBox}>
            <Ionicons name="mail-outline" size={32} color={theme.colors.yellowText} />
          </View>
          <Text style={styles.verifyTitle}>CHECK YOUR INBOX</Text>
          <Text style={styles.verifySub}>
            We sent a confirmation link to
          </Text>
          <Text style={styles.verifyEmail}>{email}</Text>
          <Text style={styles.verifyHint}>
            Tap the link in the email to confirm your account. This page will advance automatically once you confirm.
          </Text>

          <Pressable
            style={styles.openMailBtn}
            onPress={() => Linking.openURL('message://')}
          >
            <Ionicons name="open-outline" size={14} color={theme.colors.yellowText} />
            <Text style={styles.openMailText}>OPEN MAIL APP</Text>
          </Pressable>

          {resendCooldown > 0 ? (
            <Text style={styles.cooldownText}>Resend available in {resendCooldown}s</Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending} style={styles.resendBtn}>
              <Text style={styles.resendText}>{resending ? 'Sending…' : 'Resend confirmation email'}</Text>
            </Pressable>
          )}
          {resendError && <Text style={styles.verifyError}>{resendError}</Text>}

          <Pressable onPress={() => setEmailSent(false)} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Use a different email</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Account creation form ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.ivory} />
          </Pressable>

          <Text style={styles.title}>CREATE ACCOUNT</Text>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.muted}
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 8 characters"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {errorMessage && (
            <Text style={styles.footerError}>{errorMessage}</Text>
          )}
          <Pressable
            style={[styles.cta, { opacity: isFormValid && !loading ? 1 : 0.4 }]}
            onPress={handleContinue}
          >
            <Text style={styles.ctaText}>{loading ? 'CREATING ACCOUNT…' : 'CONTINUE'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ink,
  },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ivory,
    marginTop: 12,
    marginBottom: 24,
  },
  label: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 10,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    padding: 12,
    color: theme.colors.ivory,
    fontFamily: theme.fonts.interRegular,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  errorText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: -12,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: theme.colors.ink,
  },
  footerError: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: theme.colors.yellow,
    borderColor: '#C8C820',
    borderWidth: 1.5,
    borderRadius: 2,
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

  // Email verification screen
  verifyRoot: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    alignItems: 'center',
  },
  verifyIconBox: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.yellow,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  verifyTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ivory,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  verifySub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  verifyEmail: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.yellow,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  verifyHint: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 28,
  },
  openMailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.yellow,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  openMailText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
    letterSpacing: 1,
  },
  cooldownText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  resendBtn: {
    paddingVertical: 8,
  },
  resendText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
  verifyError: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
  },
  backLinkText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
});
