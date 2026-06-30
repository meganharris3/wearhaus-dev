import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  Image, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import Toggle from '../../components/Toggle';
import WearCalendar from '../../components/WearCalendar';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { AvailabilityRange } from '../../types';
import {
  parseDate, formatRange, formatDateShort,
  addMonths,
} from '../../utils/dateUtils';

type Props = NativeStackScreenProps<AppStackParamList, 'Availability'>;

export default function AvailabilityScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const av = item.availability;

  const [isAvailable, setIsAvailable]     = useState(av?.isAvailable ?? true);
  const [instantBorrow, setInstantBorrow] = useState(av?.instantBorrow ?? false);
  const [bookedRanges]                    = useState<AvailabilityRange[]>(av?.bookedRanges ?? []);
  const [blockedRanges, setBlockedRanges] = useState<AvailabilityRange[]>(av?.blockedRanges ?? []);

  const [month, setMonth]               = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd]     = useState<Date | null>(null);

  function handleMonthChange(dir: 'prev' | 'next') {
    setMonth((m) => addMonths(m, dir === 'next' ? 1 : -1));
  }

  function handleSelectStart(d: Date) {
    setSelectedStart(d);
    setSelectedEnd(null);
  }

  function handleSelectEnd(d: Date) {
    setSelectedEnd(d);
  }

  function handleUnblockRequest(range: AvailabilityRange) {
    Alert.alert(
      'Unblock dates?',
      `${formatRange(parseDate(range.start), parseDate(range.end))} will become available again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => setBlockedRanges((prev) => prev.filter((r) => r.id !== range.id)),
        },
      ],
    );
  }

  function handleBlockSelected() {
    if (!selectedStart || !selectedEnd) return;
    const newRange: AvailabilityRange = {
      id: `bl-${Date.now()}`,
      start: toDateStr(selectedStart),
      end: toDateStr(selectedEnd),
    };
    setBlockedRanges((prev) => [...prev, newRange]);
    setSelectedStart(null);
    setSelectedEnd(null);
  }

  function handleSave() {
    navigation.goBack();
  }

  const allRanges: Array<{ range: AvailabilityRange; type: 'booked' | 'blocked' }> = [
    ...bookedRanges.map((r) => ({ range: r, type: 'booked' as const })),
    ...blockedRanges.map((r) => ({ range: r, type: 'blocked' as const })),
  ].sort((a, b) => a.range.start.localeCompare(b.range.start));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← MY CLOSET</Text>
        </Pressable>
        <Text style={styles.topTitle}>AVAILABILITY</Text>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>SAVE</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Item strip */}
        <ItemStrip item={item} />

        {/* Toggles */}
        <SectionHeader label="Settings" />
        <ToggleRow
          label="Available to rent"
          sub="Show as available in explore"
          value={isAvailable}
          onToggle={() => setIsAvailable((v) => !v)}
        />
        <ToggleRow
          label="Instant borrow"
          sub="No approval needed"
          value={instantBorrow}
          onToggle={() => setInstantBorrow((v) => !v)}
        />

        {/* Legend */}
        <SectionHeader label="Calendar" />
        <Legend items={[
          { label: 'Available', color: theme.colors.ivoryDark, border: theme.colors.ivoryMid },
          { label: 'Booked', color: theme.colors.ink },
          { label: 'Blocked', color: theme.colors.ivoryMid },
          { label: 'Selected', color: theme.colors.yellow, border: theme.colors.yellowBorder },
        ]} />

        {/* Calendar */}
        <WearCalendar
          mode="lender"
          bookedRanges={bookedRanges}
          blockedRanges={blockedRanges}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onSelectStart={handleSelectStart}
          onSelectEnd={handleSelectEnd}
          month={month}
          onMonthChange={handleMonthChange}
          onUnblockRequest={handleUnblockRequest}
        />

        {/* Block action row */}
        {selectedStart && (
          <View style={styles.blockRow}>
            <Text style={styles.blockRowText}>
              {selectedEnd
                ? `${formatRange(selectedStart, selectedEnd)} selected. Block to prevent requests.`
                : `${formatDateShort(selectedStart)} – select end date`}
            </Text>
            {selectedStart && selectedEnd && (
              <Pressable style={styles.blockBtn} onPress={handleBlockSelected}>
                <Text style={styles.blockBtnText}>BLOCK</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Range list */}
        {allRanges.length > 0 && (
          <>
            <SectionHeader label="Bookings & Blocks" />
            {allRanges.map(({ range, type }) => (
              <RangeRow
                key={range.id}
                range={range}
                type={type}
                onUnblock={() =>
                  setBlockedRanges((prev) => prev.filter((r) => r.id !== range.id))
                }
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ItemStrip({ item }: { item: import('../../types').Item }) {
  const price = `$${(item.price_per_day / 100).toFixed(2)}/day`;
  return (
    <View style={stripStyles.row}>
      {item.photo_url
        ? <Image source={{ uri: item.photo_url }} style={stripStyles.thumb} />
        : <View style={[stripStyles.thumb, { backgroundColor: theme.colors.ivoryMid }]} />
      }
      <View style={stripStyles.info}>
        <Text style={stripStyles.name} numberOfLines={1}>{item.name.toUpperCase()}</Text>
        <Text style={stripStyles.meta}>{item.size_label}</Text>
      </View>
      <Text style={stripStyles.price}>{price}</Text>
    </View>
  );
}

function ToggleRow({ label, sub, value, onToggle }: {
  label: string; sub: string; value: boolean; onToggle: () => void;
}) {
  return (
    <View style={trStyles.row}>
      <View style={trStyles.text}>
        <Text style={trStyles.label}>{label}</Text>
        <Text style={trStyles.sub}>{sub}</Text>
      </View>
      <Toggle value={value} onToggle={onToggle} />
    </View>
  );
}

function Legend({ items }: {
  items: Array<{ label: string; color: string; border?: string }>;
}) {
  return (
    <View style={styles.legendRow}>
      {items.map(({ label, color, border }) => (
        <View key={label} style={styles.legendItem}>
          <View style={[
            styles.legendDot,
            { backgroundColor: color },
            border ? { borderWidth: 1, borderColor: border } : undefined,
          ]} />
          <Text style={styles.legendLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function RangeRow({ range, type, onUnblock }: {
  range: AvailabilityRange;
  type: 'booked' | 'blocked';
  onUnblock?: () => void;
}) {
  const start = parseDate(range.start);
  const end   = parseDate(range.end);
  return (
    <View style={[rrStyles.row, type === 'booked' && rrStyles.rowBooked]}>
      <View style={rrStyles.info}>
        <Text style={rrStyles.range}>{formatRange(start, end)}</Text>
        <Text style={rrStyles.sub}>
          {type === 'booked'
            ? `Rented · ${range.borrower ?? 'Unknown'}`
            : 'Blocked by you'}
        </Text>
      </View>
      {type === 'booked' ? (
        <View style={rrStyles.activeBadge}>
          <Text style={rrStyles.activeBadgeText}>ACTIVE</Text>
        </View>
      ) : (
        <Pressable style={rrStyles.unblockBtn} onPress={onUnblock}>
          <Text style={rrStyles.unblockBtnText}>UNBLOCK</Text>
        </Pressable>
      )}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  saveBtn: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  saveBtnText: {
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
    flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 10,
    gap: 16, flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: {
    fontFamily: theme.fonts.interLight, fontSize: 9, color: theme.colors.muted,
  },
  blockRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginTop: 12, padding: 12,
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
    gap: 10,
  },
  blockRowText: {
    flex: 1, fontFamily: theme.fonts.interLight, fontSize: 11,
    color: theme.colors.yellowText, lineHeight: 16,
  },
  blockBtn: {
    borderWidth: 1.5, borderColor: theme.colors.yellowBorder,
    borderRadius: 2, paddingHorizontal: 10, paddingVertical: 6,
  },
  blockBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase', color: theme.colors.yellowText,
  },
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
  price: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
});

const trStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  text: { flex: 1, paddingRight: 12 },
  label: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  sub:   { fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted, marginTop: 2 },
});

const rrStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  rowBooked: { borderLeftWidth: 2, borderLeftColor: theme.colors.ink },
  info: { flex: 1 },
  range: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  sub:   { fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  activeBadge: {
    backgroundColor: theme.colors.ink, borderRadius: 2,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activeBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 8,
    color: theme.colors.ivory, letterSpacing: 1,
  },
  unblockBtn: {
    borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: 2,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  unblockBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 8,
    color: theme.colors.ink, letterSpacing: 1, textTransform: 'uppercase',
  },
});
