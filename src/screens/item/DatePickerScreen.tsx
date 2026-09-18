import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import WearCalendar from '../../components/WearCalendar';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AvailabilityRange, ThreadParticipant } from '../../types';
import {
  parseDate, formatRange, formatDateShort,
  diffInDays, addMonths,
} from '../../utils/dateUtils';
import { useRequests } from '../../context/RequestsContext';
import { useMessages } from '../../context/MessagesContext';

type Props = NativeStackScreenProps<AppStackParamList, 'DatePicker'>;

export default function DatePickerScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const av = item.availability;

  const bookedRanges: AvailabilityRange[] = [
    ...(av?.bookedRanges ?? []),
    ...(av?.blockedRanges ?? []), // borrower sees both as unavailable
  ];

  const { addRequest } = useRequests();
  const { createThread } = useMessages();
  const [month, setMonth]                 = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd]     = useState<Date | null>(null);

  function handleMonthChange(dir: 'prev' | 'next') {
    setMonth((m) => addMonths(m, dir === 'next' ? 1 : -1));
  }

  function handleSelectStart(d: Date) {
    setSelectedStart(d);
    setSelectedEnd(null);
  }
  function handleSelectEnd(d: Date) { setSelectedEnd(d); }

  const hasRange = selectedStart != null && selectedEnd != null;

  // Booking summary
  const days       = hasRange ? diffInDays(selectedStart!, selectedEnd!) : 0;
  const dailyRate  = item.price_per_day / 100;
  const subtotal   = +(dailyRate * days).toFixed(2);
  const serviceFee = +(subtotal * 0.07).toFixed(2);
  const deposit    = +(dailyRate * 1.5).toFixed(2);
  const total      = +(subtotal + serviceFee + deposit).toFixed(2);

  function handleRequest() {
    if (!hasRange) return;

    addRequest({
      borrowerName: 'You',
      itemName: item.name,
      days,
      dateRange: formatRange(selectedStart!, selectedEnd!),
      direction: 'outgoing',
      ownerName: item.owner?.display_name,
      total,
    });

    const otherUser: ThreadParticipant = {
      id: item.owner?.id ?? 'unknown',
      name: item.owner?.display_name ?? 'Lender',
      handle: (item.owner?.display_name ?? 'lender').toLowerCase().replace(/\s+/g, ''),
      initials: (item.owner?.display_name ?? 'L')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      avatarColor: '#F0EDE0',
    };

    const thread = createThread({
      item,
      otherUser,
      payload: {
        lenderId: item.owner?.id ?? 'unknown',
        lenderFirstName: (item.owner?.display_name ?? 'Lender').split(' ')[0],
        borrowerId: 'me',
        borrowerFirstName: 'You',
        item: {
          name: item.name,
          size: item.size_label ?? '',
          condition: item.condition ?? 'Good condition',
          thumbColor: '#D8D4C8',
          photo: item.photo_url ?? null,
        },
        startDate: formatDateShort(selectedStart!),
        endDate: formatDateShort(selectedEnd!),
        days,
        pricePerDay: dailyRate,
        pickupMethod: 'Campus Pickup',
        total,
        status: 'pending',
      },
    });

    navigation.navigate('ChatThread', { threadId: thread.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.topTitle}>PICK DATES</Text>
        <Pressable
          style={[styles.nextBtn, !hasRange && styles.nextBtnDisabled]}
          disabled={!hasRange}
          onPress={handleRequest}
        >
          <Text style={styles.nextBtnText}>REQUEST</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Item strip */}
        <BorrowerItemStrip item={item} />

        {/* Legend */}
        <SectionHeader label="Calendar" />
        <View style={styles.legendRow}>
          {[
            { label: 'Available', color: theme.colors.ivoryDark, border: theme.colors.ivoryMid },
            { label: 'Unavailable', color: theme.colors.ink },
            { label: 'Your dates', color: theme.colors.yellow, border: theme.colors.yellowBorder },
          ].map(({ label, color, border }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color },
                border ? { borderWidth: 1, borderColor: border } : undefined]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        <WearCalendar
          mode="borrower"
          bookedRanges={bookedRanges}
          blockedRanges={[]}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onSelectStart={handleSelectStart}
          onSelectEnd={handleSelectEnd}
          month={month}
          onMonthChange={handleMonthChange}
        />

        {/* Range pill */}
        {selectedStart && (
          <View style={styles.rangePill}>
            <Text style={styles.rangePillText}>
              {selectedEnd
                ? formatRange(selectedStart, selectedEnd)
                : `${formatDateShort(selectedStart)} – select end date`}
            </Text>
            {hasRange && (
              <Text style={styles.rangePillMeta}>
                {days} day{days !== 1 ? 's' : ''} · Tap to change
              </Text>
            )}
          </View>
        )}

        {/* Booking summary */}
        {hasRange && (
          <>
            <SectionHeader label="Booking Summary" />
            <View style={styles.summaryCard}>
              <SummaryRow label={`${days} days × $${dailyRate.toFixed(2)}/day`} value={`$${subtotal.toFixed(2)}`} />
              <SummaryRow label="Service fee (7%)" value={`$${serviceFee.toFixed(2)}`} />
              <SummaryRow label="Refundable deposit" value={`$${deposit.toFixed(2)}`} />
              <View style={styles.summaryDivider} />
              <SummaryRow label="Total" value={`$${total.toFixed(2)}`} bold />
            </View>
          </>
        )}

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <Pressable
            style={[styles.ctaBtn, !hasRange && styles.ctaBtnDisabled]}
            disabled={!hasRange}
            onPress={handleRequest}
          >
            <Text style={[styles.ctaBtnText, !hasRange && styles.ctaBtnTextDisabled]}>
              REQUEST TO BORROW
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function BorrowerItemStrip({ item }: { item: import('../../types').Item }) {
  return (
    <View style={stripStyles.row}>
      {item.photo_url
        ? <Image source={{ uri: item.photo_url }} style={stripStyles.thumb} />
        : <View style={[stripStyles.thumb, { backgroundColor: theme.colors.ivoryMid }]} />
      }
      <View style={stripStyles.info}>
        <Text style={stripStyles.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
        <Text style={stripStyles.meta}>
          {[item.owner?.display_name, item.size_label, item.location_label]
            .filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={sumStyles.row}>
      <Text style={[sumStyles.label, bold && sumStyles.labelBold]}>{label}</Text>
      <Text style={[sumStyles.value, bold && sumStyles.valueBold]}>{value}</Text>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: theme.colors.ink,
  },
  backText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 10,
    letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.muted,
  },
  topTitle: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 18,
    letterSpacing: 0.8, textTransform: 'uppercase', color: theme.colors.ink,
  },
  nextBtn: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.yellowText,
  },

  sectionHeader: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.ivoryMid,
    paddingHorizontal: 18, paddingVertical: 8, marginTop: 12,
  },
  sectionHeaderText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    color: theme.colors.ink, letterSpacing: 1.5,
  },

  legendRow: {
    flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 10, gap: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendLabel: {
    fontFamily: theme.fonts.interLight, fontSize: 9, color: theme.colors.muted,
  },

  rangePill: {
    marginHorizontal: 18, marginTop: 10, padding: 12,
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rangePillText: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.yellowText,
  },
  rangePillMeta: {
    fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.yellowText,
  },

  summaryCard: {
    marginHorizontal: 18, marginTop: 2,
    borderWidth: 1, borderColor: theme.colors.ivoryMid, borderRadius: 2,
    overflow: 'hidden',
  },
  summaryDivider: { height: 1, backgroundColor: theme.colors.ivoryMid, marginVertical: 4 },

  // Sent badge (top bar)
  sentBadge: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sentBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.yellowText,
  },

  // Success card
  successCard: {
    marginHorizontal: 18,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    padding: 20,
    gap: 6,
  },
  successTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 16,
    color: theme.colors.ink,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  successMeta: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  successTotal: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 12,
  },
  successActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  viewReqBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewReqText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.ivory,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  doneBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneBtnText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  ctaWrap: { marginHorizontal: 18, marginTop: 20 },
  ctaBtn: {
    backgroundColor: theme.colors.ink, borderRadius: 2,
    paddingVertical: 14, alignItems: 'center',
  },
  ctaBtnDisabled: { backgroundColor: theme.colors.ivoryMid },
  ctaBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 12,
    letterSpacing: 1.4, textTransform: 'uppercase', color: theme.colors.ivory,
  },
  ctaBtnTextDisabled: { color: theme.colors.muted },
});

const stripStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  thumb: { width: 44, height: 52, borderRadius: 2, resizeMode: 'cover' as const },
  info:  { flex: 1 },
  name: {
    fontFamily: theme.fonts.interSemiBold, fontSize: 13,
    color: theme.colors.ink, letterSpacing: 0.3,
  },
  meta: {
    fontFamily: theme.fonts.interLight, fontSize: 11,
    color: theme.colors.muted, marginTop: 2,
  },
});

const sumStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  label:      { fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.muted },
  labelBold:  { fontFamily: theme.fonts.interSemiBold, fontSize: 16, color: theme.colors.ink },
  value:      { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  valueBold:  { fontFamily: theme.fonts.interSemiBold, fontSize: 16, color: theme.colors.ink },
});
