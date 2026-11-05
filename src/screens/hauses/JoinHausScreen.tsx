import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import PressableScale from '../../components/PressableScale';
import { useHauses } from '../../context/HausesContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { fetchHausInvitePreview, joinHausByInviteCode } from '../../services/hausService';
import type { HausInvitePreview } from '../../services/hausService';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Haus } from '../../types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

/** Where a /join/<code> invite link lands: shows the haus and lets the user join it. */
export default function JoinHausScreen() {
  const navigation = useNavigation<Nav>();
  const { code } = useRoute<RouteProp<AppStackParamList, 'JoinHaus'>>().params;
  const { refreshHauses } = useHauses();
  const confirm = useConfirmation();

  const [preview, setPreview] = useState<HausInvitePreview | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHausInvitePreview(code)
      .then(p => { if (!cancelled) setPreview(p); })
      .catch(() => { if (!cancelled) setPreview(null); });
    return () => { cancelled = true; };
  }, [code]);

  function close() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  }

  function openHaus(haus: Haus) {
    navigation.replace('HausDetail', { haus });
  }

  async function handleJoin() {
    if (!preview || joining) return;
    setJoining(true);
    setError(null);
    try {
      await joinHausByInviteCode(code);
      await refreshHauses();
      const { is_member: _, ...haus } = preview;
      confirm(`You joined ${haus.name}`);
      openHaus({ ...haus, member_count: haus.member_count + 1 });
    } catch {
      setError("Couldn't join this Haus. Try again.");
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={close} hitSlop={10}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.topTitle}>INVITE</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.body}>
        {preview === undefined ? (
          <ActivityIndicator color={theme.colors.ink} />
        ) : preview === null ? (
          <View style={styles.card}>
            <Text style={styles.title}>INVITE NOT FOUND</Text>
            <Text style={styles.description}>
              This invite link isn't valid. Ask whoever sent it for a new one.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={close}>
              <Text style={styles.primaryText}>GO HOME</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {preview.is_member ? "YOU'RE ALREADY IN" : "YOU'RE INVITED TO"}
            </Text>
            <Text style={styles.title}>{preview.name}</Text>
            {!!preview.description && <Text style={styles.description}>{preview.description}</Text>}
            <Text style={styles.facts}>
              {preview.member_count} member{preview.member_count !== 1 ? 's' : ''} · {preview.piece_count} piece{preview.piece_count !== 1 ? 's' : ''}
            </Text>

            {preview.is_member ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => { const { is_member: _, ...haus } = preview; openHaus(haus); }}
              >
                <Text style={styles.primaryText}>OPEN HAUS</Text>
              </Pressable>
            ) : (
              <PressableScale
                style={[styles.primaryBtn, joining && styles.btnDisabled]}
                onPress={handleJoin}
                disabled={joining}
                scaleTo={0.97}
              >
                <Text style={styles.primaryText}>{joining ? 'JOINING…' : 'JOIN HAUS'}</Text>
              </PressableScale>
            )}
            {!!error && <Text style={styles.error}>{error}</Text>}
            {!preview.is_member && (
              <Pressable style={styles.secondaryBtn} onPress={close}>
                <Text style={styles.secondaryText}>NOT NOW</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 2, borderBottomColor: theme.colors.ink,
  },
  backText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: theme.colors.ink, letterSpacing: 1,
  },
  topTitle: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 16,
    color: theme.colors.ink, letterSpacing: 1,
  },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, paddingBottom: 60 },
  card: {
    borderWidth: 2, borderColor: theme.colors.ink, borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory, padding: 22, alignItems: 'center',
  },
  eyebrow: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    color: theme.colors.muted, letterSpacing: 1.5, marginBottom: 8,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 28, lineHeight: 30,
    color: theme.colors.ink, textTransform: 'uppercase', textAlign: 'center', marginBottom: 8,
  },
  description: {
    fontFamily: theme.fonts.interRegular, fontSize: 13, lineHeight: 19,
    color: theme.colors.muted, textAlign: 'center', marginBottom: 10,
  },
  facts: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 11,
    color: theme.colors.ink, marginBottom: 22,
  },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    color: theme.colors.ivory, letterSpacing: 1.5,
  },
  secondaryBtn: { marginTop: 14, paddingVertical: 6 },
  secondaryText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: theme.colors.muted, letterSpacing: 1.2,
  },
  error: {
    fontFamily: theme.fonts.interRegular, fontSize: 12,
    color: '#C0392B', marginTop: 10, textAlign: 'center',
  },
});
