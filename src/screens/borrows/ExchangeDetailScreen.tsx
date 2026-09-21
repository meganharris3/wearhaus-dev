import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useBorrows, getDaysUntil, getDays, formatDate,
} from '../../context/BorrowsContext';
import type { BorrowRecord, LendRecord } from '../../context/BorrowsContext';
import { useMessages } from '../../context/MessagesContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { ThreadParticipant } from '../../types';

type Nav   = NavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'ExchangeDetail'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

type StatusConfig = { label: string; bg: string; textColor: string };

function getStatusConfig(exchange: BorrowRecord | LendRecord): StatusConfig {
  if (exchange.status === 'active') {
    const d = getDaysUntil(exchange.endDate);
    const suffix = d <= 0 ? 'due today' : d === 1 ? '1 day left' : `${d} days left`;
    return { label: `Active · ${suffix}`, bg: '#FFFFAD', textColor: '#3A3A00' };
  }
  if (exchange.status === 'upcoming') {
    return { label: `Upcoming · Starts ${formatDate(exchange.startDate)}`, bg: '#FDFBF4', textColor: '#14120C' };
  }
  return { label: 'Completed', bg: '#14120C', textColor: '#FDFBF4' };
}

// ── PhotoHero ─────────────────────────────────────────────────────────────────

function PhotoHero({
  exchange, onBack, onMessage,
}: { exchange: BorrowRecord | LendRecord; onBack: () => void; onMessage: () => void }) {
  const statusConfig = getStatusConfig(exchange);
  return (
    <View>
      <View style={[
        s.hero,
        { backgroundColor: exchange.itemThumbColor, opacity: exchange.status === 'completed' ? 0.85 : 1 },
      ]}>
        <Ionicons name="shirt-outline" size={56} color="#14120C" style={{ opacity: 0.1 }} />
      </View>

      <View style={s.heroButtons}>
        <TouchableOpacity onPress={onBack} style={s.floatBtn}>
          <Ionicons name="chevron-back" size={16} color="#14120C" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onMessage} style={s.floatBtn}>
          <Ionicons name="chatbubble-outline" size={15} color="#14120C" />
        </TouchableOpacity>
      </View>

      <View style={[s.statusPill, { backgroundColor: statusConfig.bg }]}>
        <Text style={[s.statusPillText, { color: statusConfig.textColor }]}>
          {statusConfig.label}
        </Text>
      </View>
    </View>
  );
}

// ── TitleBlock ────────────────────────────────────────────────────────────────

function TitleBlock({ exchange }: { exchange: BorrowRecord | LendRecord }) {
  return (
    <View style={s.titleBlock}>
      <View style={s.titleRow}>
        <Text style={s.titleName} numberOfLines={2}>{exchange.itemName}</Text>
        <View style={s.titlePrice}>
          <Text style={s.titlePriceNum}>${exchange.pricePerDay}</Text>
          <Text style={s.titlePriceUnit}>/day</Text>
        </View>
      </View>
      {(exchange.itemSize || exchange.itemCondition) && (
        <Text style={s.titleMeta}>
          {[exchange.itemSize, exchange.itemCondition].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
}

// ── PartyRow ──────────────────────────────────────────────────────────────────

interface Party { role: string; name: string; avatarColor: string; initials: string }

function PartyRow({ party, onMessage }: { party: Party; onMessage: () => void }) {
  return (
    <TouchableOpacity onPress={onMessage} style={s.partyRow}>
      <View style={[s.partyAvatar, { backgroundColor: party.avatarColor }]}>
        <Text style={s.partyInitials}>{party.initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.partyRole}>{party.role}</Text>
        <Text style={s.partyName}>{party.name}</Text>
      </View>
      <Ionicons name="chatbubble-outline" size={16} color="#7A7762" />
    </TouchableOpacity>
  );
}

// ── InfoList ──────────────────────────────────────────────────────────────────

function InfoList({ exchange }: { exchange: BorrowRecord | LendRecord }) {
  const rows: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    {
      icon: 'calendar-outline',
      label: 'Dates',
      value: `${formatDate(exchange.startDate)} – ${formatDate(exchange.endDate)}`,
    },
  ];
  if (exchange.pickupMethod) {
    rows.push({ icon: 'location-outline', label: 'Pickup', value: exchange.pickupMethod });
  }
  return (
    <View style={s.infoList}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[s.infoRow, i < rows.length - 1 && s.infoRowBorder]}
        >
          <View style={s.infoIcon}>
            <Ionicons name={row.icon} size={14} color="#7A7762" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoLabel}>{row.label}</Text>
            <Text style={s.infoValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── TimelineSimple ────────────────────────────────────────────────────────────

function TimelineSimple({ exchange }: { exchange: BorrowRecord | LendRecord }) {
  const steps = [
    {
      label: 'Request accepted',
      date: exchange.acceptedAt ? formatDate(exchange.acceptedAt) : '—',
      done: true,
    },
    {
      label: `Pickup${exchange.pickupMethod ? ` — ${exchange.pickupMethod}` : ''}`,
      date: formatDate(exchange.startDate),
      done: false,
    },
    { label: 'Return due', date: formatDate(exchange.endDate), done: false },
  ];

  return (
    <View style={s.timeline}>
      {steps.map((step, i) => (
        <View key={step.label}>
          <View style={s.timelineStep}>
            <View style={[s.timelineDot, step.done ? s.timelineDotDone : s.timelineDotPending]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.timelineStepLabel, { color: step.done ? '#14120C' : '#7A7762' }]}>
                {step.label}
              </Text>
              <Text style={s.timelineStepDate}>{step.date}</Text>
            </View>
          </View>
          {i < steps.length - 1 && <View style={s.timelineConnector} />}
        </View>
      ))}
    </View>
  );
}

// ── TotalCard ─────────────────────────────────────────────────────────────────

function TotalCard({ exchange, mode }: { exchange: BorrowRecord | LendRecord; mode: 'borrowing' | 'lending' }) {
  const [expanded, setExpanded] = useState(false);
  const isEarning = mode === 'lending';
  const days      = getDays(exchange.startDate, exchange.endDate);
  const subtotal  = exchange.pricePerDay * days;
  const serviceFee = Math.round(subtotal * 0.07);
  const deposit    = isEarning ? 0 : Math.round(exchange.pricePerDay * 1.5);
  const total      = isEarning ? subtotal : subtotal + serviceFee + deposit;

  const cardBg    = isEarning ? '#FFFFAD' : '#14120C';
  const headColor = isEarning ? '#3A3A00' : '#FFFFAD';
  const bigColor  = isEarning ? '#3A3A00' : '#FDFBF4';
  const linkColor = isEarning ? 'rgba(58,58,0,0.6)' : '#908D7A';
  const rowLabel  = isEarning ? 'rgba(58,58,0,0.6)' : '#908D7A';
  const rowValue  = isEarning ? '#3A3A00' : '#C8C5B8';
  const divider   = isEarning ? 'rgba(58,58,0,0.15)' : '#2E2C22';

  return (
    <View style={[s.totalCard, { backgroundColor: cardBg }]}>
      <View style={s.totalCardTop}>
        <Text style={[s.totalCardLabel, { color: headColor }]}>
          {isEarning ? "You'll Earn" : 'Total Paid'}
        </Text>
        <TouchableOpacity onPress={() => setExpanded(e => !e)}>
          <Text style={[s.totalCardBreakdownLink, { color: linkColor }]}>Breakdown</Text>
        </TouchableOpacity>
      </View>
      <Text style={[s.totalCardAmount, { color: bigColor }]}>
        ${isEarning ? subtotal : total}
      </Text>

      {expanded && (
        <View style={[s.breakdown, { borderTopColor: divider }]}>
          <BreakdownRow
            label={`$${exchange.pricePerDay} × ${days} day${days > 1 ? 's' : ''}`}
            value={`$${subtotal}`}
            labelColor={rowLabel} valueColor={rowValue}
          />
          {isEarning ? (
            <BreakdownRow
              label="Service fee (paid by borrower)"
              value={`$${serviceFee}`}
              labelColor={rowLabel} valueColor={rowValue}
            />
          ) : (
            <>
              <BreakdownRow label="Service fee" value={`$${serviceFee}`} labelColor={rowLabel} valueColor={rowValue} />
              <BreakdownRow label="Deposit (refundable)" value={`$${deposit}`} labelColor={rowLabel} valueColor={rowValue} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

function BreakdownRow({
  label, value, labelColor, valueColor,
}: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <View style={s.breakdownRow}>
      <Text style={[s.breakdownLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[s.breakdownValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ── ActionsFlat ───────────────────────────────────────────────────────────────

function ActionsFlat({
  exchange, mode, onMarkReturned, onNudgeReturn, onViewChat,
}: {
  exchange: BorrowRecord | LendRecord;
  mode: 'borrowing' | 'lending';
  onMarkReturned: () => void;
  onNudgeReturn: () => void;
  onViewChat: () => void;
}) {
  if (exchange.status === 'active') {
    return (
      <View style={s.actions}>
        <TouchableOpacity
          onPress={mode === 'borrowing' ? onMarkReturned : onNudgeReturn}
          style={s.actionPrimary}
        >
          <Text style={s.actionPrimaryText}>
            {mode === 'borrowing' ? 'Mark Returned' : 'Nudge Return'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  // upcoming
  return (
    <View style={s.actions}>
      <TouchableOpacity onPress={onViewChat} style={s.actionGhost}>
        <Text style={s.actionGhostText}>View Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── RatingSimple ──────────────────────────────────────────────────────────────

function RatingSimple({
  exchange, mode, onRate,
}: { exchange: BorrowRecord | LendRecord; mode: 'borrowing' | 'lending'; onRate: () => void }) {
  if (mode === 'lending') return null;

  const borrow = exchange as BorrowRecord;

  if (!borrow.rating) {
    return (
      <TouchableOpacity onPress={onRate} style={s.rateBtn}>
        <Text style={s.rateBtnText}>Rate This Exchange</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.ratingDisplay}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Ionicons
            key={i}
            name="star"
            size={16}
            color={i <= (borrow.rating ?? 0) ? '#C8C820' : '#E2DED0'}
          />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.ratingText}>You rated {borrow.rating!.toFixed(1)}</Text>
        {borrow.ratingComment && (
          <Text style={s.ratingComment}>"{borrow.ratingComment}"</Text>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ExchangeDetailScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { exchangeId, mode } = route.params;

  const { borrows, lends, updateBorrowStatus } = useBorrows();
  const { findThreadByUser, createDirectThread, sendMessage } = useMessages();

  const exchange: BorrowRecord | LendRecord | undefined =
    mode === 'borrowing'
      ? borrows.find(b => b.id === exchangeId)
      : lends.find(l => l.id === exchangeId);

  if (!exchange) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FDFBF4' }} edges={['top']}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 16 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', color: '#7A7762' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Inter_300Light', color: '#7A7762' }}>Exchange not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBorrowing = mode === 'borrowing';
  const borrow = isBorrowing ? exchange as BorrowRecord : null;
  const lend   = !isBorrowing ? exchange as LendRecord : null;

  const otherParty: Party = isBorrowing
    ? {
        role: 'Borrowed from',
        name: borrow!.lenderName,
        avatarColor: borrow!.lenderAvatarColor ?? '#E2DED0',
        initials: getInitials(borrow!.lenderName),
      }
    : {
        role: 'Lending to',
        name: lend!.borrowerName,
        avatarColor: lend!.borrowerAvatarColor,
        initials: lend!.borrowerInitials,
      };

  function handleMarkReturned() {
    updateBorrowStatus(exchangeId, 'completed');
    nav.goBack();
  }

  async function handleNudgeReturn() {
    if (!lend) return;
    const participant: ThreadParticipant = {
      id:          lend.borrowerId,
      name:        lend.borrowerName,
      handle:      '@' + lend.borrowerName.toLowerCase().replace(/[^a-z]/g, ''),
      initials:    lend.borrowerInitials,
      avatarColor: lend.borrowerAvatarColor,
    };
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

  const threadId = exchange.threadId;
  const goToChat = () => nav.navigate('ChatThread', { threadId });

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      <PhotoHero
        exchange={exchange}
        onBack={() => nav.goBack()}
        onMessage={goToChat}
      />
      <TitleBlock exchange={exchange} />
      <PartyRow party={otherParty} onMessage={goToChat} />

      {exchange.status === 'upcoming'
        ? <TimelineSimple exchange={exchange} />
        : <InfoList exchange={exchange} />
      }

      <TotalCard exchange={exchange} mode={mode} />

      {exchange.status === 'completed'
        ? <RatingSimple exchange={exchange} mode={mode} onRate={() => {}} />
        : <ActionsFlat
            exchange={exchange}
            mode={mode}
            onMarkReturned={handleMarkReturned}
            onNudgeReturn={handleNudgeReturn}
            onViewChat={goToChat}
          />
      }

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDFBF4' },

  // PhotoHero
  hero: {
    height: 190,
    alignItems: 'center', justifyContent: 'center',
  },
  heroButtons: {
    position: 'absolute', top: 14, left: 0, right: 0,
    paddingHorizontal: 14,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  floatBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(253,251,244,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    position: 'absolute', bottom: 12, left: 16,
    borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5,
  },
  statusPillText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 1, textTransform: 'uppercase',
  },

  // TitleBlock
  titleBlock: {
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2DED0',
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  titleName: {
    flex: 1,
    fontFamily: 'Barlow_800ExtraBold', fontSize: 21,
    letterSpacing: 0.4, textTransform: 'uppercase',
    color: '#14120C', lineHeight: 22, marginRight: 12,
  },
  titlePrice: { alignItems: 'flex-end' },
  titlePriceNum: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 18, color: '#14120C',
  },
  titlePriceUnit: {
    fontFamily: 'Inter_300Light', fontSize: 10, color: '#7A7762',
  },
  titleMeta: {
    fontFamily: 'Inter_300Light', fontSize: 11, color: '#7A7762',
  },

  // PartyRow
  partyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E2DED0',
  },
  partyAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  partyInitials: {
    fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#14120C',
  },
  partyRole: {
    fontFamily: 'Inter_400Regular', fontSize: 9, color: '#7A7762',
  },
  partyName: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#14120C',
  },

  // InfoList
  infoList: { paddingHorizontal: 18 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11,
  },
  infoRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E2DED0' },
  infoIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0EDE0',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular', fontSize: 9, color: '#7A7762',
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#14120C',
  },

  // TimelineSimple
  timeline: { paddingHorizontal: 18, paddingBottom: 4 },
  timelineStep: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9,
  },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineDotDone:    { backgroundColor: '#C8C820' },
  timelineDotPending: { backgroundColor: '#E2DED0' },
  timelineConnector: {
    width: 1, height: 16, backgroundColor: '#E2DED0', marginLeft: 3.5,
  },
  timelineStepLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  timelineStepDate:  { fontFamily: 'Inter_300Light', fontSize: 10, color: '#7A7762' },

  // TotalCard
  totalCard: {
    marginHorizontal: 18, marginVertical: 16,
    borderRadius: 16, padding: 18,
  },
  totalCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  totalCardLabel: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 9,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  totalCardBreakdownLink: {
    fontFamily: 'Inter_400Regular', fontSize: 9, textDecorationLine: 'underline',
  },
  totalCardAmount: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 32,
    letterSpacing: -0.6, lineHeight: 34,
  },
  breakdown: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4,
  },
  breakdownLabel: { fontFamily: 'Inter_300Light', fontSize: 10 },
  breakdownValue: { fontFamily: 'Inter_400Regular', fontSize: 10 },

  // Actions
  actions: { paddingHorizontal: 18, paddingBottom: 18 },
  actionPrimary: {
    backgroundColor: '#FFFFAD', borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  actionPrimaryText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 12,
    letterSpacing: 1, textTransform: 'uppercase', color: '#3A3A00',
  },
  actionGhost: {
    paddingVertical: 8, alignItems: 'center',
  },
  actionGhostText: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: '#7A7762',
  },

  // Rating
  rateBtn: {
    marginHorizontal: 18, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#14120C', borderRadius: 14,
    paddingVertical: 11, alignItems: 'center',
  },
  rateBtnText: {
    fontFamily: 'Barlow_800ExtraBold', fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: '#14120C',
  },
  ratingDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  ratingText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#14120C',
  },
  ratingComment: {
    fontFamily: 'Inter_300Light', fontStyle: 'italic',
    fontSize: 11, color: '#7A7762', marginTop: 2,
  },
});
