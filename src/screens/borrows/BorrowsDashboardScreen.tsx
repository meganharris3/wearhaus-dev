import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useBorrows, getDaysUntil, getDays, formatDate,
  BorrowRecord, LendRecord,
} from '../../context/BorrowsContext';
import { useMessages } from '../../context/MessagesContext';
import type { ThreadParticipant } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';

type DashNavProp = NavigationProp<AppStackParamList>;

function participantFromBorrow(b: BorrowRecord): ThreadParticipant {
  const parts = b.lenderName.trim().split(' ');
  return {
    id: b.lenderId,
    name: b.lenderName,
    handle: '@' + b.lenderName.toLowerCase().replace(/[^a-z]/g, ''),
    initials: parts.map(p => p[0]).join('').slice(0, 2).toUpperCase(),
    avatarColor: '#E2DED0',
  };
}

function participantFromLend(l: LendRecord): ThreadParticipant {
  return {
    id: l.borrowerId,
    name: l.borrowerName,
    handle: '@' + l.borrowerName.toLowerCase().replace(/[^a-z]/g, ''),
    initials: l.borrowerInitials,
    avatarColor: l.borrowerAvatarColor,
  };
}

const TABS = ['Active', 'Upcoming', 'History'] as const;
type Tab = typeof TABS[number];

// ── countdown ─────────────────────────────────────────────────────────────────

type CountdownIcon = 'alert-circle-outline' | 'warning-outline' | 'time-outline';
type CountdownConfig = { label: string; urgent: boolean; icon: CountdownIcon };

function getCountdownConfig(endDate: string): CountdownConfig {
  const d = getDaysUntil(endDate);
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`,  urgent: true,  icon: 'alert-circle-outline' };
  if (d === 0) return { label: 'Due today',                urgent: true,  icon: 'warning-outline' };
  if (d === 1) return { label: 'Due tomorrow',             urgent: true,  icon: 'warning-outline' };
  return       { label: `${d} days left`,                  urgent: false, icon: 'time-outline' };
}

// ── CountdownPill ─────────────────────────────────────────────────────────────

function CountdownPill({ config }: { config: CountdownConfig }) {
  return (
    <View style={[s.pill, config.urgent ? s.pillUrgent : s.pillNormal]}>
      <Ionicons name={config.icon} size={11} color={config.urgent ? '#A0392B' : '#3A3A00'} />
      <Text style={[s.pillText, { color: config.urgent ? '#A0392B' : '#3A3A00' }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ── ActionBtn ─────────────────────────────────────────────────────────────────

type BtnVariant = 'outline' | 'ghost' | 'yellow';

const BTN_STYLES: Record<BtnVariant, { borderColor: string; bg: string; textColor: string }> = {
  outline: { borderColor: '#14120C', bg: 'transparent',   textColor: '#14120C' },
  ghost:   { borderColor: '#E2DED0', bg: 'transparent',   textColor: '#7A7762' },
  yellow:  { borderColor: '#C8C820', bg: '#FFFFAD',       textColor: '#3A3A00' },
};

function ActionBtn({ label, variant, onPress }: { label: string; variant: BtnVariant; onPress: () => void }) {
  const v = BTN_STYLES[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.actionBtn, { borderColor: v.borderColor, backgroundColor: v.bg }]}
    >
      <Text style={[s.actionBtnText, { color: v.textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── SectionDivider ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={s.sectionDivider}>
      <Text style={s.sectionDividerText}>{label}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyText}>{message}</Text>
    </View>
  );
}

// ── ActiveBorrowCard ──────────────────────────────────────────────────────────

function ActiveBorrowCard({
  borrow, onMarkReturned,
}: { borrow: BorrowRecord; onMarkReturned: (id: string) => void }) {
  const nav = useNavigation<DashNavProp>();
  const countdown = getCountdownConfig(borrow.endDate);
  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.cardBody}
        onPress={() => nav.navigate('ExchangeDetail', { exchangeId: borrow.id, mode: 'borrowing' })}
        activeOpacity={0.7}
      >
        <View style={[s.itemThumb, { backgroundColor: borrow.itemThumbColor }]}>
          <Ionicons name="shirt-outline" size={20} color="#14120C" style={{ opacity: 0.2 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardItemName}>{borrow.itemName}</Text>
          <Text style={s.cardSubtext}>Borrowed from {borrow.lenderName}</Text>
          <CountdownPill config={countdown} />
        </View>
      </TouchableOpacity>
      <View style={s.cardFooter}>
        <ActionBtn label="Message" variant="outline"
          onPress={() => nav.navigate('ChatThread', { pendingOtherUser: participantFromBorrow(borrow) })} />
        {!countdown.urgent && (
          <ActionBtn label="Extend" variant="ghost"
            onPress={() => nav.navigate('MakeOffer', { threadId: borrow.threadId, pricePerDay: 0 })} />
        )}
        <ActionBtn
          label={countdown.urgent ? 'Mark Returned' : 'Return'}
          variant="yellow"
          onPress={() => onMarkReturned(borrow.id)}
        />
      </View>
    </View>
  );
}

// ── LendingCard ───────────────────────────────────────────────────────────────

function LendingCard({
  lend, onNudge,
}: { lend: LendRecord; onNudge: (id: string) => void }) {
  const nav = useNavigation<DashNavProp>();
  const countdown = getCountdownConfig(lend.endDate);
  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.cardBody}
        onPress={() => nav.navigate('ExchangeDetail', { exchangeId: lend.id, mode: 'lending' })}
        activeOpacity={0.7}
      >
        <View style={[s.itemThumb, { backgroundColor: lend.itemThumbColor }]}>
          <Ionicons name="shirt-outline" size={20} color="#14120C" style={{ opacity: 0.2 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardItemName}>{lend.itemName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <View style={[s.borrowerAvatar, { backgroundColor: lend.borrowerAvatarColor }]}>
              <Text style={s.borrowerInitials}>{lend.borrowerInitials}</Text>
            </View>
            <Text style={s.cardSubtext}>Lent to {lend.borrowerName}</Text>
          </View>
          <CountdownPill config={countdown} />
        </View>
        <Text style={s.priceTag}>${lend.pricePerDay}/day</Text>
      </TouchableOpacity>
      <View style={s.cardFooter}>
        <ActionBtn label="Message" variant="outline"
          onPress={() => nav.navigate('ChatThread', { pendingOtherUser: participantFromLend(lend) })} />
        <ActionBtn
          label="Nudge Return"
          variant={countdown.urgent ? 'yellow' : 'ghost'}
          onPress={() => onNudge(lend.id)}
        />
      </View>
    </View>
  );
}

// ── UpcomingBorrowRow ─────────────────────────────────────────────────────────

function UpcomingBorrowRow({
  borrow, onEdit, onCancel,
}: { borrow: BorrowRecord; onEdit: () => void; onCancel: () => void }) {
  return (
    <View style={s.card}>
      <View style={s.cardBody}>
        <View style={[s.upcomingThumb, { backgroundColor: borrow.itemThumbColor }]}>
          <Ionicons name="shirt-outline" size={20} color="#14120C" style={{ opacity: 0.2 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardItemName}>{borrow.itemName}</Text>
          <Text style={s.cardSubtext}>
            From {borrow.lenderName}
          </Text>
          <Text style={s.cardSubtext}>
            {formatDate(borrow.startDate)} – {formatDate(borrow.endDate)}
          </Text>
        </View>
      </View>
      <View style={s.cardFooter}>
        <ActionBtn label="Edit Dates" variant="outline" onPress={onEdit} />
        <ActionBtn label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

// ── HistoryRow ────────────────────────────────────────────────────────────────

function HistoryRow({ borrow, onRate }: { borrow: BorrowRecord; onRate: (b: BorrowRecord) => void }) {
  const nav = useNavigation<DashNavProp>();
  return (
    <TouchableOpacity
      style={s.histRow}
      onPress={() => nav.navigate('ExchangeDetail', { exchangeId: borrow.id, mode: 'borrowing' })}
      activeOpacity={0.7}
    >
      <View style={[s.histThumb, { backgroundColor: borrow.itemThumbColor }]}>
        <Ionicons name="shirt-outline" size={14} color="#14120C" style={{ opacity: 0.15 }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.histName}>{borrow.itemName}</Text>
        <Text style={s.histMeta}>
          From {borrow.lenderName} · {formatDate(borrow.startDate)}–{formatDate(borrow.endDate)}
        </Text>
      </View>
      {borrow.rating ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="star" size={10} color="#C8C820" />
          <Text style={s.ratedText}>{borrow.rating.toFixed(1)}</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => onRate(borrow)} style={s.rateBtn}>
          <Text style={s.rateBtnText}>Rate</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── LendingHistoryRow ─────────────────────────────────────────────────────────

function LendingHistoryRow({ lend }: { lend: LendRecord }) {
  const nav = useNavigation<DashNavProp>();
  const earned = lend.pricePerDay * getDays(lend.startDate, lend.endDate);
  return (
    <TouchableOpacity
      style={s.histRow}
      onPress={() => nav.navigate('ExchangeDetail', { exchangeId: lend.id, mode: 'lending' })}
      activeOpacity={0.7}
    >
      <View style={[s.histThumb, { backgroundColor: lend.itemThumbColor, opacity: 0.7 }]}>
        <Ionicons name="shirt-outline" size={14} color="#14120C" style={{ opacity: 0.15 }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.histName}>{lend.itemName}</Text>
        <Text style={s.histMeta}>
          To {lend.borrowerName} · {formatDate(lend.startDate)}–{formatDate(lend.endDate)}
        </Text>
      </View>
      <Text style={s.earnedAmount}>+${earned}</Text>
    </TouchableOpacity>
  );
}

// ── BorrowsDashboardScreen ────────────────────────────────────────────────────

export default function BorrowsDashboardScreen() {
  const nav = useNavigation<DashNavProp>();
  const { borrows, lends, updateBorrowStatus, cancelBorrow } = useBorrows();
  const { findThreadByUser, createDirectThread, sendMessage } = useMessages();
  const [mode, setMode]           = useState<'borrowing' | 'lending'>('borrowing');
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  function handleModeChange(m: 'borrowing' | 'lending') {
    setMode(m);
    setActiveTab('Active');
  }

  const dataSource: (BorrowRecord | LendRecord)[] = mode === 'borrowing' ? borrows : lends;

  const filteredRecords = dataSource.filter(r => {
    if (activeTab === 'Active')   return r.status === 'active';
    if (activeTab === 'Upcoming') return r.status === 'upcoming';
    return r.status === 'completed';
  });


  function handleMarkReturned(borrowId: string) {
    updateBorrowStatus(borrowId, 'completed');
  }

  async function sendReturnNudge(lendId: string) {
    const lend = lends.find(l => l.id === lendId);
    if (!lend) return;
    const participant = participantFromLend(lend);
    try {
      const thread = findThreadByUser(lend.borrowerId) ?? await createDirectThread(participant);
      await sendMessage(thread.id, {
        type: 'text',
        text: `Hey! Just a friendly reminder — your rental of ${lend.itemName} is due ${formatDate(lend.endDate)}.`,
      });
      nav.navigate('ChatThread', { threadId: thread.id });
    } catch (e) {
      Alert.alert('Could not send reminder', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function handleRate(_borrow: BorrowRecord) {
    // rating flow placeholder
  }

  const modeOptions = [
    { key: 'borrowing' as const, label: 'Borrowing', icon: 'tshirt-crew-outline' as const },
    { key: 'lending'   as const, label: 'Lending',   icon: 'hanger'              as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFBF4' }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Top bar ────────────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={18} color="#14120C" />
              <Text style={s.backLabel}>Profile</Text>
            </TouchableOpacity>
            <Text style={s.pageHeading}>Borrows</Text>
            <View style={{ width: 70 }} />
          </View>

          {/* ── Mode toggle ─────────────────────────────────────────────────── */}
          <View style={s.modeToggle}>
            {modeOptions.map((opt, i) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleModeChange(opt.key)}
                style={[
                  s.modeBtn,
                  mode === opt.key && s.modeBtnActive,
                  i === 0 && s.modeBtnLeft,
                ]}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={14}
                  color={mode === opt.key ? '#3A3A00' : '#7A7762'}
                />
                <Text style={[s.modeBtnText, mode === opt.key && s.modeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Sub-tabs ────────────────────────────────────────────────────── */}
          <View style={s.tabRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[s.tab, activeTab === tab && s.tabActive]}
              >
                <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>


          {/* ── Active ──────────────────────────────────────────────────────── */}
          {activeTab === 'Active' && (
            <>
              <SectionDivider label={mode === 'borrowing' ? 'Active Borrows' : 'Currently Lent Out'} />
              {filteredRecords.length === 0
                ? <EmptyState message={mode === 'borrowing' ? 'No active borrows.' : 'Nothing lent out right now.'} />
                : filteredRecords.map(r =>
                    mode === 'borrowing'
                      ? <ActiveBorrowCard key={r.id} borrow={r as BorrowRecord} onMarkReturned={handleMarkReturned} />
                      : <LendingCard     key={r.id} lend={r as LendRecord}     onNudge={sendReturnNudge} />
                  )
              }
            </>
          )}

          {/* ── Upcoming ────────────────────────────────────────────────────── */}
          {activeTab === 'Upcoming' && (
            <>
              <SectionDivider label="Upcoming" />
              {filteredRecords.length === 0
                ? <EmptyState message="Nothing scheduled yet." />
                : filteredRecords.map(r =>
                    mode === 'borrowing'
                      ? <UpcomingBorrowRow
                          key={r.id}
                          borrow={r as BorrowRecord}
                          onEdit={() => nav.navigate('ChatThread', { threadId: (r as BorrowRecord).threadId })}
                          onCancel={() => Alert.alert(
                            'Cancel Borrow',
                            `Cancel your upcoming borrow of "${r.itemName}"?`,
                            [
                              { text: 'Keep It', style: 'cancel' },
                              { text: 'Cancel Borrow', style: 'destructive', onPress: () => cancelBorrow(r.id) },
                            ],
                          )}
                        />
                      : <LendingCard      key={r.id} lend={r as LendRecord}     onNudge={sendReturnNudge} />
                  )
              }
            </>
          )}

          {/* ── History ─────────────────────────────────────────────────────── */}
          {activeTab === 'History' && (
            <>
              <SectionDivider label="Recent History" />
              {filteredRecords.length === 0
                ? <EmptyState message="No history yet." />
                : filteredRecords.map(r =>
                    mode === 'borrowing'
                      ? <HistoryRow       key={r.id} borrow={r as BorrowRecord} onRate={handleRate} />
                      : <LendingHistoryRow key={r.id} lend={r as LendRecord} />
                  )
              }
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#E2DED0',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontFamily: 'Inter_300Light', fontSize: 13, color: '#14120C' },
  pageHeading: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 14,
    letterSpacing: 1.4, textTransform: 'uppercase', color: '#14120C',
  },

  modeToggle: {
    flexDirection: 'row', marginHorizontal: 18, marginTop: 14,
    borderWidth: 1.5, borderColor: '#14120C', borderRadius: 2, overflow: 'hidden',
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, backgroundColor: 'transparent',
  },
  modeBtnActive: { backgroundColor: '#FFFFAD' },
  modeBtnLeft: { borderRightWidth: 1.5, borderRightColor: '#14120C' },
  modeBtnText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 10,
    letterSpacing: 0.8, textTransform: 'uppercase', color: '#7A7762',
  },
  modeBtnTextActive: { color: '#3A3A00' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 18, marginTop: 12, gap: 6,
  },
  tab: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 2,
    borderWidth: 1, borderColor: '#E2DED0',
  },
  tabActive: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  tabText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 0.8, textTransform: 'uppercase', color: '#7A7762',
  },
  tabTextActive: { color: '#3A3A00' },

  summaryStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 2,
    borderWidth: 1, borderColor: '#E2DED0',
  },
  statPillValue: { fontFamily: 'Barlow_800ExtraBold', fontSize: 18, color: '#14120C', lineHeight: 20 },
  statPillLabel: {
    fontFamily: 'Inter_300Light', fontSize: 8,
    letterSpacing: 0.8, textTransform: 'uppercase', color: '#7A7762', marginTop: 2,
  },

  earningsBanner: {
    marginHorizontal: 18, marginBottom: 4,
    backgroundColor: '#14120C', borderRadius: 2, padding: 14,
  },
  earnLabel: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase', color: '#FFFFAD', marginBottom: 4,
  },
  earnAmount: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 28, letterSpacing: -0.5,
    color: '#FDFBF4', lineHeight: 30, marginBottom: 2,
  },
  earnSub: { fontFamily: 'Inter_300Light', fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  sectionDivider: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#E2DED0', marginBottom: 10,
  },
  sectionDividerText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 1.4, textTransform: 'uppercase', color: '#7A7762',
  },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: 'Inter_300Light', fontSize: 13, color: '#7A7762' },

  card: {
    marginHorizontal: 18, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#14120C', borderRadius: 2, overflow: 'hidden',
  },
  cardBody: { flexDirection: 'row', gap: 11, padding: 11 },
  cardFooter: {
    backgroundColor: '#F0EDE0',
    borderTopWidth: 0.5, borderTopColor: '#E2DED0',
    paddingVertical: 9, paddingHorizontal: 12,
    flexDirection: 'row', gap: 8,
  },
  itemThumb: {
    width: 56, height: 66, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cardItemName: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 13,
    letterSpacing: 0.3, color: '#14120C', marginBottom: 3,
  },
  cardSubtext: { fontFamily: 'Inter_300Light', fontSize: 10, color: '#7A7762', marginBottom: 7 },
  borrowerAvatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  borrowerInitials: { fontFamily: 'Inter_600SemiBold', fontSize: 7, color: '#14120C' },
  priceTag: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#14120C', alignSelf: 'flex-start' },

  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 2, borderWidth: 1.5 },
  actionBtnText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', borderWidth: 1,
  },
  pillNormal: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  pillUrgent: { backgroundColor: '#FDE4E0', borderColor: '#E8A398' },
  pillText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  upcomingRow: {
    marginHorizontal: 18, marginBottom: 2,
    flexDirection: 'row', gap: 11, alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#E2DED0',
  },
  upcomingThumb: { width: 44, height: 52, borderRadius: 2 },

  histRow: {
    marginHorizontal: 18,
    flexDirection: 'row', gap: 11, alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#E2DED0',
  },
  histThumb: { width: 36, height: 42, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  histName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#14120C', marginBottom: 2 },
  histMeta: { fontFamily: 'Inter_300Light', fontSize: 10, color: '#7A7762' },
  rateBtn: {
    borderWidth: 1, borderColor: '#C8C820', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  rateBtnText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 0.6, textTransform: 'uppercase', color: '#3A3A00',
  },
  ratedText: { fontFamily: 'Inter_300Light', fontSize: 10, color: '#7A7762' },
  earnedAmount: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#14120C' },
});
