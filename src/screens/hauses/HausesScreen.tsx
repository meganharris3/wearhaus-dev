import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  PanResponder,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import HausListItem from '../../components/HausListItem';
import NotificationBell from '../../components/NotificationBell';
import MessagesIcon from '../../components/MessagesIcon';
import { useHauses } from '../../context/HausesContext';
import { useCloset } from '../../context/ClosetContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Haus } from '../../types';

export default function HausesScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { hauses, leaveHaus } = useHauses();
  const { items, updateItem } = useCloset();
  const [leaveTarget, setLeaveTarget] = useState<Haus | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const pieceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const haus of hauses) {
      counts[haus.id] = items.filter(
        (item) => item.haus_visibility?.[haus.id] === true,
      ).length;
    }
    return counts;
  }, [hauses, items]);

  async function confirmLeave() {
    if (!leaveTarget) return;
    setIsLeaving(true);
    try {
      const hausItems = items.filter((item) => item.haus_visibility?.[leaveTarget.id] === true);
      await Promise.all(
        hausItems.map((item) =>
          updateItem({ ...item, haus_visibility: { ...item.haus_visibility, [leaveTarget.id]: false } }),
        ),
      );
      await leaveHaus(leaveTarget.id);
      setLeaveTarget(null);
    } finally {
      setIsLeaving(false);
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 15 && Math.abs(gs.dy) < gs.dx,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80) navigation.goBack();
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.headingRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={theme.colors.ink} />
              </Pressable>
              <Text style={styles.heading}>MY HAUSES</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => navigation.navigate('Friends')}
                style={styles.actionBtn}
                hitSlop={6}
              >
                <Ionicons name="person-add-outline" size={18} color={theme.colors.ink} />
              </Pressable>
              <MessagesIcon />
              <NotificationBell />
            </View>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>JOINED HAUSES</Text>

          {/* Haus list — negative margin lets HausListItem borders bleed edge-to-edge */}
          <View style={{ marginHorizontal: -theme.spacing.md }}>
            {hauses.map((haus) => (
              <HausListItem
                key={haus.id}
                haus={haus}
                pieceCount={pieceCounts[haus.id]}
                onPress={() => navigation.navigate('HausDetail', { haus })}
                onLeave={() => setLeaveTarget(haus)}
              />
            ))}
          </View>

          {/* Create Haus button */}
          <Pressable
            style={styles.createLargeBtn}
            onPress={() => navigation.navigate('CreateHaus')}
          >
            <Ionicons name="add" size={20} color="#3A3A00" />
            <Text style={styles.createLargeBtnText}>CREATE A HAUS</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Leave Confirmation Modal */}
      <Modal
        visible={!!leaveTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !isLeaving && setLeaveTarget(null)}
      >
        <Pressable
          style={leaveModal.overlay}
          onPress={() => !isLeaving && setLeaveTarget(null)}
        >
          <Pressable style={leaveModal.card} onPress={() => {}}>
            <View style={leaveModal.iconWrap}>
              <Ionicons name="exit-outline" size={24} color="#C0392B" />
            </View>
            <Text style={leaveModal.title}>LEAVE HAUS?</Text>
            <Text style={leaveModal.body}>
              You'll be removed from{' '}
              <Text style={leaveModal.hausName}>{leaveTarget?.name}</Text>
              {' '}and your shared pieces will no longer appear here.
            </Text>
            <View style={leaveModal.btnRow}>
              <Pressable
                style={leaveModal.cancelBtn}
                onPress={() => setLeaveTarget(null)}
                disabled={isLeaving}
              >
                <Text style={leaveModal.cancelText}>CANCEL</Text>
              </Pressable>
              <Pressable
                style={[leaveModal.leaveBtn, isLeaving && leaveModal.leaveBtnDisabled]}
                onPress={confirmLeave}
                disabled={isLeaving}
              >
                <Text style={leaveModal.leaveText}>
                  {isLeaving ? 'LEAVING…' : 'LEAVE'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const leaveModal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%', backgroundColor: theme.colors.ivory,
    borderRadius: theme.borderRadius, borderWidth: 1.5,
    borderColor: theme.colors.ink, padding: 24, alignItems: 'center',
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#FFF0EE', borderWidth: 1.5, borderColor: '#C0392B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 18,
    letterSpacing: 2, color: theme.colors.ink, textTransform: 'uppercase',
    marginBottom: 10,
  },
  body: {
    fontFamily: theme.fonts.interLight, fontSize: 13,
    color: theme.colors.muted, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  hausName: { fontFamily: theme.fonts.interSemiBold, color: theme.colors.ink },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
  },
  cancelText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: theme.colors.muted, letterSpacing: 1, textTransform: 'uppercase',
  },
  leaveBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    backgroundColor: '#C0392B', borderRadius: theme.borderRadius,
  },
  leaveBtnDisabled: { opacity: 0.5 },
  leaveText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    color: '#FFFFFF', letterSpacing: 1, textTransform: 'uppercase',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38, height: 38,
    borderWidth: 2, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  sectionLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingTop: theme.spacing.md,
    paddingBottom: 8,
  },
  createLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    marginTop: 16,
    paddingVertical: 18,
  },
  createLargeBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.yellowText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
