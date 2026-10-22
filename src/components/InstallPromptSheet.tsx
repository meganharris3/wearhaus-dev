import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, Image, Animated, Easing,
  AccessibilityInfo, Linking, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getPwaPlatform, isInAppBrowser, type PwaPlatform } from '../lib/pwa';

// Push notifications aren't built yet — don't promise alerts the app can't send.
const PUSH_ENABLED = false;

type StepSegment =
  | { t: string }
  | { b: string }
  | { icon: React.ComponentProps<typeof Ionicons>['name'] }
  | { chip: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

interface Step {
  segs: StepSegment[];
  hint?: string;
}

const STEPS: Record<'ios' | 'android', Step[]> = {
  ios: [
    {
      segs: [{ t: 'Tap the ' }, { icon: 'share-outline' }, { t: ' ' }, { b: 'Share' }, { t: ' button at the bottom of Safari' }],
      hint: 'Safari works best. If you opened this from Instagram or another app, open the link in Safari first.',
    },
    {
      segs: [{ t: 'Scroll down and tap ' }, { chip: 'Add to Home Screen', icon: 'add-circle-outline' }],
      hint: "Don't see it? Scroll the share menu or tap More.",
    },
    {
      segs: [{ t: 'Tap ' }, { b: 'Add' }, { t: ' in the top right corner' }],
      hint: 'Wearhaus now lives on your home screen.',
    },
  ],
  android: [
    { segs: [{ t: 'Tap the ' }, { icon: 'ellipsis-vertical' }, { t: ' ' }, { b: 'menu' }, { t: ' in the top right of Chrome' }] },
    {
      segs: [{ t: 'Tap ' }, { chip: 'Install app', icon: 'download-outline' }],
      hint: 'Don\'t see it? Look for "Add to Home screen" instead.',
    },
    {
      segs: [{ t: 'Tap ' }, { b: 'Install' }, { t: ' to confirm' }],
      hint: 'Wearhaus now lives on your home screen.',
    },
  ],
};

const SUBTITLES: Record<'ios' | 'android', string> = {
  ios: 'Opens full screen like a real app, no App Store needed.',
  android: 'Opens full screen like a real app, no Play Store needed.',
};

function Segment({ seg }: { seg: StepSegment }) {
  if ('t' in seg) return <Text style={stepStyles.text}>{seg.t}</Text>;
  if ('b' in seg) return <Text style={[stepStyles.text, stepStyles.bold]}>{seg.b}</Text>;
  if ('chip' in seg) {
    return (
      <View style={stepStyles.menuChip}>
        <Ionicons name={seg.icon} size={11} color={theme.colors.muted} />
        <Text style={stepStyles.menuChipText}>{seg.chip}</Text>
      </View>
    );
  }
  return (
    <View style={stepStyles.iconChip}>
      <Ionicons name={seg.icon} size={13} color={theme.colors.ink} />
    </View>
  );
}

function StepRow({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  return (
    <View style={[stepStyles.row, !isLast && stepStyles.rowDivider]}>
      <View style={stepStyles.badge}>
        <Text style={stepStyles.badgeText}>{index + 1}</Text>
      </View>
      <View style={stepStyles.body}>
        <Text style={stepStyles.textWrap}>
          {step.segs.map((seg, i) => <Segment key={i} seg={seg} />)}
        </Text>
        {step.hint && <Text style={stepStyles.hint}>{step.hint}</Text>}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#E2DED0' },
  badge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFAD', borderWidth: 1.5, borderColor: '#C8C820',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  badgeText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 11, color: '#3A3A00' },
  body: { flex: 1 },
  textWrap: { flexWrap: 'wrap' },
  text: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink, lineHeight: 16 },
  bold: { fontFamily: theme.fonts.barlowExtraBold },
  hint: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted, marginTop: 3, lineHeight: 14 },
  iconChip: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: theme.colors.ink,
    backgroundColor: theme.colors.ivory, alignItems: 'center', justifyContent: 'center',
  },
  menuChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.ivoryDark, borderWidth: 1, borderColor: '#E2DED0', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  menuChipText: { fontFamily: theme.fonts.interSemiBold, fontSize: 11, color: theme.colors.ink },
});

interface InstallPromptSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Tapping the dimmed overlay counts as "Maybe later", not a neutral close. */
  onDismissViaOverlay: () => void;
  onMaybeLater: () => void;
  onGotIt: () => void;
  canNativeInstall: boolean;
  onInstallNative: () => Promise<'accepted' | 'dismissed'>;
}

export default function InstallPromptSheet({
  visible, onClose, onDismissViaOverlay, onMaybeLater, onGotIt, canNativeInstall, onInstallNative,
}: InstallPromptSheetProps) {
  const [platform, setPlatform] = useState<'ios' | 'android'>(() => {
    const detected = getPwaPlatform();
    return detected === 'android' ? 'android' : 'ios'; // default to iOS for 'other' too — the sheet never auto-opens there anyway
  });
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const translateY = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    if (!visible) return;
    setPlatform(getPwaPlatform() === 'android' ? 'android' : 'ios');
    setShowManualSteps(false);
    setCopied(false);

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          translateY.setValue(0);
        } else {
          translateY.setValue(220);
          Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        }
      })
      .catch(() => translateY.setValue(0));
    return () => { cancelled = true; };
  }, [visible, translateY]);

  const inAppBrowser = platform === 'ios' && isInAppBrowser();
  const steps = STEPS[platform];

  async function handleCopyLink() {
    try {
      await Linking.canOpenURL('about:blank'); // no-op touch so this stays a real async branch on native too
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
      }
    } catch {
      // clipboard access denied or unavailable — nothing to recover, the link is still visible in the browser bar
    }
  }

  async function handlePrimaryCta() {
    if (canNativeInstall) {
      await onInstallNative();
      return;
    }
    onGotIt();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismissViaOverlay} accessibilityLabel="Dismiss" />

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={18} color="#7A7762" />
          </Pressable>

          <View style={styles.header}>
            <Image source={{ uri: '/icons/icon-192.png' }} style={styles.appIcon} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Add Wearhaus to your home screen</Text>
              <Text style={styles.subtitle}>{SUBTITLES[platform]}</Text>
            </View>
          </View>

          <View style={styles.toggle}>
            {(['ios', 'android'] as const).map((p, i) => {
              const active = platform === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPlatform(p)}
                  style={[styles.toggleSeg, i === 0 && styles.toggleSegBorder, active && styles.toggleSegActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                    {p === 'ios' ? 'iPhone' : 'Android'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {inAppBrowser ? (
            <View style={styles.inAppBrowserBlock}>
              <StepRow
                index={0}
                isLast
                step={{
                  segs: [{ b: 'Open this link in Safari' }],
                  hint: 'Tap ⋯ or the share icon in this app and choose Open in Browser.',
                }}
              />
              <Pressable style={styles.copyBtn} onPress={handleCopyLink} accessibilityRole="button">
                <Ionicons name="link-outline" size={14} color={theme.colors.ink} />
                <Text style={styles.copyBtnText}>{copied ? 'Link copied' : 'Copy link'}</Text>
              </Pressable>
            </View>
          ) : platform === 'android' && canNativeInstall && !showManualSteps ? (
            <Pressable onPress={() => setShowManualSteps(true)} style={styles.showManualLink}>
              <Text style={styles.showManualLinkText}>Show manual steps</Text>
            </Pressable>
          ) : (
            <View>
              {steps.map((step, i) => (
                <StepRow key={i} step={step} index={i} isLast={i === steps.length - 1} />
              ))}
            </View>
          )}

          <View style={styles.chipsRow}>
            <BenefitChip icon="flash-outline" label="One-tap open" />
            <BenefitChip icon="expand-outline" label="Full screen, no browser bar" />
            {PUSH_ENABLED
              ? <BenefitChip icon="notifications-outline" label="Borrow request alerts" />
              : <BenefitChip icon="rocket-outline" label="Loads faster" />}
          </View>

          <Pressable style={styles.cta} onPress={handlePrimaryCta} accessibilityRole="button">
            <Text style={styles.ctaText}>
              {!inAppBrowser && platform === 'android' && canNativeInstall ? 'Install Wearhaus' : 'Got it'}
            </Text>
          </Pressable>

          <Pressable onPress={onMaybeLater} style={styles.maybeLater}>
            <Text style={styles.maybeLaterText}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function BenefitChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={16} color={theme.colors.ink} />
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,18,12,0.55)',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FDFBF4',
    borderTopWidth: 2,
    borderColor: '#14120C',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    width: 36, height: 3,
    backgroundColor: '#E2DED0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14, right: 14,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
    paddingRight: 24,
  },
  appIcon: {
    width: 52, height: 52, borderRadius: 12,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 17, letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10.5,
    color: '#7A7762',
    marginTop: 3,
  },

  toggle: {
    flexDirection: 'row',
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  toggleSeg: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleSegBorder: { borderRightWidth: 1.5, borderRightColor: theme.colors.ink },
  toggleSegActive: { backgroundColor: '#FFFFAD' },
  toggleText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10, letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7A7762',
  },
  toggleTextActive: { color: '#3A3A00' },

  inAppBrowserBlock: { marginBottom: 4 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: 2,
    paddingVertical: 10, marginTop: 4, marginBottom: 8,
  },
  copyBtnText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 11, letterSpacing: 0.8, color: theme.colors.ink },

  showManualLink: { paddingVertical: 10 },
  showManualLinkText: { fontFamily: theme.fonts.interSemiBold, fontSize: 11, color: '#7A7762', textDecorationLine: 'underline' },

  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0EDE0',
    borderWidth: 1, borderColor: '#E2DED0',
    borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  chipLabel: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 8.5,
    color: theme.colors.ink,
    textAlign: 'center',
  },

  cta: {
    backgroundColor: '#14120C',
    borderRadius: 2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12, letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#FDFBF4',
  },

  maybeLater: { marginTop: 10, alignItems: 'center' },
  maybeLaterText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: '#7A7762',
    textDecorationLine: 'underline',
  },
});
