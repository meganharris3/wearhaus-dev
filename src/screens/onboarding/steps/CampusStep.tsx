import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import type { CampusInfo } from '../../../data/campusDomains';
import { detectCampusFromEmail } from '../../../data/campusDomains';
import {
  joinCampusCloset,
  getCampusClosetStats,
  sendCampusOtp,
  verifyCampusOtp,
} from '../../../services/campusService';

interface CampusStepProps {
  onNext: () => void;
  onBack: () => void;
  schoolEmail: string;
  setSchoolEmail: (v: string) => void;
  detectedCampus: CampusInfo | null;
  setDetectedCampus: (v: CampusInfo | null) => void;
  campusJoined: boolean;
  setCampusJoined: (v: boolean) => void;
}

export default function CampusStep({
  onNext,
  onBack,
  schoolEmail,
  setSchoolEmail,
  detectedCampus,
  setDetectedCampus,
  campusJoined,
  setCampusJoined,
}: CampusStepProps) {
  const { user, updateCampus } = useAuth();

  // UI phases
  const [phase, setPhase] = useState<'input' | 'otp' | 'joined'>('input');

  // Stats
  const [campusStats, setCampusStats] = useState<{ memberCount: number; activeLenders: number; itemCount: number } | null>(null);

  // OTP state
  const [otpCode, setOtpCode]           = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying]   = useState(false);
  const [otpError, setOtpError]         = useState<string | null>(null);

  function handleEmailChange(text: string) {
    setSchoolEmail(text);
    setPhase('input');
    setOtpCode('');
    setOtpError(null);
    const campus = detectCampusFromEmail(text);
    setDetectedCampus(campus);
    if (campus) {
      getCampusClosetStats(campus.id).then((s) => setCampusStats(s));
    } else {
      setCampusStats(null);
    }
  }

  async function handleSendOtp() {
    if (!detectedCampus || !user?.id) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      await sendCampusOtp(user.id, schoolEmail);
      setPhase('otp');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Could not send code. Try again.');
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyAndJoin() {
    if (!detectedCampus || !user?.id || otpCode.length !== 6) return;
    setIsVerifying(true);
    setOtpError(null);
    try {
      const valid = await verifyCampusOtp(user.id, schoolEmail, otpCode);
      if (!valid) {
        setOtpError('Invalid or expired code. Please try again.');
        return;
      }
      await joinCampusCloset(detectedCampus, user.id);
      await updateCampus(detectedCampus, schoolEmail);
      setCampusJoined(true);
      setPhase('joined');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not join campus closet.');
    } finally {
      setIsVerifying(false);
    }
  }

  // ── Joined confirmation ───────────────────────────────────────────────────────
  if (phase === 'joined' && detectedCampus) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmInner}>
          <View style={styles.checkBox}>
            <Ionicons name="checkmark" size={32} color="#3A3A00" />
          </View>
          <Text style={styles.confirmTitle}>
            {`YOU'RE IN THE ${detectedCampus.name.toUpperCase()} CLOSET`}
          </Text>
          <Text style={styles.confirmSub}>
            Campus Exchange is now active on your account.
          </Text>

          <View style={styles.campusCard}>
            <View style={styles.schoolBadge}>
              <Ionicons name="school-outline" size={18} color={theme.colors.ink} />
            </View>
            <Text style={styles.campusCardName}>{detectedCampus.name}</Text>
            {campusStats && (
              <Text style={styles.campusCardMeta}>
                {campusStats.memberCount} members · {campusStats.itemCount} items
              </Text>
            )}
          </View>

          <View style={styles.unlockList}>
            {[
              'Campus Exchange pickup unlocked',
              'Public items visible to campus students',
              'Explore filtered to campus by default',
            ].map((line) => (
              <View key={line} style={styles.unlockRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#C8C820" />
                <Text style={styles.unlockText}>{line}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.cta} onPress={onNext}>
            <Text style={styles.ctaText}>CONTINUE</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── OTP entry ─────────────────────────────────────────────────────────────────
  if (phase === 'otp' && detectedCampus) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={() => { setPhase('input'); setOtpCode(''); setOtpError(null); }} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
            </Pressable>

            <View style={styles.schoolBadgeSmall}>
              <Ionicons name="school-outline" size={18} color={theme.colors.ink} />
            </View>

            <Text style={styles.title}>VERIFY YOUR EMAIL</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code we sent to
            </Text>
            <Text style={styles.otpTargetEmail}>{schoolEmail}</Text>

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>VERIFICATION CODE</Text>
            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={(t) => {
                setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                setOtpError(null);
              }}
              placeholder="000000"
              placeholderTextColor={theme.colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              autoFocus
            />

            {otpError && <Text style={styles.otpError}>{otpError}</Text>}

            <Pressable
              style={[styles.cta, { opacity: otpCode.length === 6 && !isVerifying ? 1 : 0.4, marginTop: 16 }]}
              onPress={handleVerifyAndJoin}
              disabled={otpCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={theme.colors.yellowText} />
              ) : (
                <Text style={styles.ctaText}>VERIFY & JOIN CAMPUS</Text>
              )}
            </Pressable>

            <Pressable onPress={handleSendOtp} disabled={isSendingOtp} style={styles.resendOtpBtn}>
              <Text style={styles.resendOtpText}>{isSendingOtp ? 'Resending…' : 'Resend code'}</Text>
            </Pressable>

            <Pressable onPress={onNext} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip campus verification</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Email input ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
          </Pressable>

          <Text style={styles.title}>YOUR CAMPUS</Text>
          <Text style={styles.subtitle}>
            Connect your .edu email to unlock Campus Exchange — borrow and lend exclusively with students at your school.
          </Text>

          <Text style={styles.fieldLabel}>SCHOOL EMAIL</Text>
          <TextInput
            style={styles.input}
            value={schoolEmail}
            onChangeText={handleEmailChange}
            placeholder="you@university.edu"
            placeholderTextColor={theme.colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {detectedCampus && (
            <View style={styles.detectionCard}>
              <View style={styles.detectionTop}>
                <View style={styles.schoolBadgeSmall}>
                  <Ionicons name="school-outline" size={18} color={theme.colors.ink} />
                </View>
                <View style={styles.detectionMeta}>
                  <Text style={styles.detectionName}>{detectedCampus.name}</Text>
                  <Text style={styles.detectionHint}>Auto-detected from your email</Text>
                </View>
              </View>

              {campusStats && (
                <>
                  <View style={styles.detectionDivider} />
                  <View style={styles.statRow}>
                    <Text style={styles.statText}>👥 {campusStats.memberCount} campus members</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statText}>👗 {campusStats.activeLenders} active lenders</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statText}>📦 {campusStats.itemCount} items available</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {otpError && <Text style={styles.otpError}>{otpError}</Text>}

          <Pressable
            style={[styles.cta, { opacity: detectedCampus && !isSendingOtp ? 1 : 0.4, marginTop: 16 }]}
            onPress={handleSendOtp}
            disabled={!detectedCampus || isSendingOtp}
          >
            {isSendingOtp ? (
              <ActivityIndicator color={theme.colors.yellowText} />
            ) : (
              <Text style={styles.ctaText}>
                {detectedCampus
                  ? `SEND CODE TO ${detectedCampus.name.toUpperCase()}`
                  : 'SEND VERIFICATION CODE'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={onNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>I'm not a student — skip this step</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.ivory },
  kav:    { flex: 1 },
  scroll: { padding: 24 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },

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
    marginBottom: 24,
    lineHeight: 19,
  },
  fieldLabel: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 10,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    padding: 12,
    color: theme.colors.ink,
    fontFamily: theme.fonts.interRegular,
    backgroundColor: theme.colors.ivory,
  },
  detectionCard: {
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    padding: 16,
    marginTop: 16,
  },
  detectionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  schoolBadgeSmall: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  detectionMeta: { flex: 1 },
  detectionName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 14,
    color: theme.colors.ivory,
  },
  detectionHint: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  detectionDivider: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.ivory,
  },

  // OTP
  otpTargetEmail: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
    marginBottom: 4,
    marginTop: 2,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    padding: 16,
    color: theme.colors.ink,
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 28,
    letterSpacing: 8,
    backgroundColor: theme.colors.ivory,
    textAlign: 'center',
  },
  otpError: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: '#C0392B',
    marginTop: 8,
    textAlign: 'center',
  },
  resendOtpBtn: { alignItems: 'center', paddingVertical: 12 },
  resendOtpText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    textDecorationLine: 'underline',
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
  skipBtn: { alignItems: 'center', paddingVertical: 16 },
  skipText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
  },

  // Confirmation screen
  confirmInner: { flex: 1, padding: 24, alignItems: 'center' },
  checkBox: {
    width: 64, height: 64,
    backgroundColor: theme.colors.yellow,
    borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  campusCard: {
    backgroundColor: theme.colors.ink,
    padding: 16, borderRadius: 2,
    marginBottom: 24, width: '100%',
    alignItems: 'center', gap: 8,
  },
  schoolBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  campusCardName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 14, color: theme.colors.ivory,
  },
  campusCardMeta: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12, color: theme.colors.muted,
  },
  unlockList: { width: '100%', marginBottom: 32, gap: 8 },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unlockText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12, color: theme.colors.ink,
  },
});
