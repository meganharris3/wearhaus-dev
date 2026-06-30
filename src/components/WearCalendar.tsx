import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import type { AvailabilityRange } from '../types';
import {
  MONTH_NAMES, DAY_HEADERS,
  startOfDay, isSameDay, isDateInRanges, rangeHasConflict,
  findRangeForDate, daysInMonth, firstDayOfMonth,
} from '../utils/dateUtils';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 36; // 18px each side
const CELL_W   = Math.floor((SCREEN_W - H_PAD) / 7);
const CELL_H   = CELL_W; // square cells

type DayState =
  | 'past'
  | 'booked'
  | 'blocked'
  | 'sel-start'
  | 'sel-mid'
  | 'sel-end'
  | 'sel-single'
  | 'today'
  | 'available';

export interface WearCalendarProps {
  mode: 'lender' | 'borrower';
  bookedRanges: AvailabilityRange[];
  blockedRanges: AvailabilityRange[];
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onSelectStart: (date: Date) => void;
  onSelectEnd: (date: Date) => void;
  month: Date;
  onMonthChange: (direction: 'prev' | 'next') => void;
  onUnblockRequest?: (range: AvailabilityRange) => void;
}

export default function WearCalendar({
  mode, bookedRanges, blockedRanges,
  selectedStart, selectedEnd,
  onSelectStart, onSelectEnd,
  month, onMonthChange,
  onUnblockRequest,
}: WearCalendarProps) {
  const year  = month.getFullYear();
  const monthIdx = month.getMonth();
  const today = startOfDay(new Date());

  const cells: (Date | null)[] = useMemo(() => {
    const offset = firstDayOfMonth(year, monthIdx);
    const count  = daysInMonth(year, monthIdx);
    const arr: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= count; d++) arr.push(new Date(year, monthIdx, d));
    // pad to complete last row
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, monthIdx]);

  function getDayState(date: Date): DayState {
    const d = startOfDay(date);

    if (d < today)                              return 'past';
    if (isDateInRanges(d, bookedRanges))        return 'booked';
    if (mode === 'lender' && isDateInRanges(d, blockedRanges)) return 'blocked';

    const hasStart = selectedStart != null;
    const hasEnd   = selectedEnd   != null;

    if (hasStart && hasEnd) {
      const s = startOfDay(selectedStart!);
      const e = startOfDay(selectedEnd!);
      if (isSameDay(d, s) && isSameDay(d, e)) return 'sel-single';
      if (isSameDay(d, s))  return 'sel-start';
      if (isSameDay(d, e))  return 'sel-end';
      if (d > s && d < e)   return 'sel-mid';
    } else if (hasStart) {
      if (isSameDay(d, startOfDay(selectedStart!))) return 'sel-start';
    }

    return isSameDay(d, today) ? 'today' : 'available';
  }

  function handlePress(date: Date) {
    const d = startOfDay(date);
    if (d < today) return;
    if (isDateInRanges(d, bookedRanges)) return;

    if (mode === 'lender' && isDateInRanges(d, blockedRanges)) {
      const range = findRangeForDate(d, blockedRanges);
      if (range) onUnblockRequest?.(range);
      return;
    }

    // Borrower also treats blocked as unavailable
    if (mode === 'borrower' && isDateInRanges(d, blockedRanges)) return;

    if (!selectedStart || (selectedStart && selectedEnd)) {
      onSelectStart(d);
    } else {
      // start selected, no end
      const s = startOfDay(selectedStart);
      if (isSameDay(d, s)) {
        // tapping same start = deselect
        onSelectStart(d);
        return;
      }
      if (d > s && !rangeHasConflict(s, d, bookedRanges)) {
        onSelectEnd(d);
      } else {
        // conflict or before start → reset with new start
        onSelectStart(d);
      }
    }
  }

  function renderDay(date: Date | null, idx: number) {
    if (!date) {
      return <View key={`empty-${idx}`} style={{ width: CELL_W, height: CELL_H }} />;
    }

    const state   = getDayState(date);
    const isToday = isSameDay(startOfDay(date), today);
    const tappable = state !== 'past' && state !== 'booked' &&
      (mode === 'lender' || state !== 'blocked');

    return (
      <Pressable
        key={date.toISOString()}
        onPress={() => tappable ? handlePress(date) : undefined}
        style={[
          dayCellStyle(state),
          { width: CELL_W, height: CELL_H },
        ]}
      >
        <Text style={dayTextStyle(state)}>{date.getDate()}</Text>
        {(isToday && state !== 'sel-start' && state !== 'sel-end' &&
          state !== 'sel-mid' && state !== 'sel-single') && (
          <View style={styles.todayDot} />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <Pressable onPress={() => onMonthChange('prev')} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={16} color={theme.colors.ink} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[monthIdx]} {year}
        </Text>
        <Pressable onPress={() => onMonthChange('next')} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.ink} />
        </Pressable>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.dayHeaders}>
        {DAY_HEADERS.map((h) => (
          <View key={h} style={{ width: CELL_W, alignItems: 'center' }}>
            <Text style={styles.dayHeader}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {cells.map((date, idx) => renderDay(date, idx))}
      </View>
    </View>
  );
}

// ─── Per-cell style helpers ───────────────────────────────────────────────────
function dayCellStyle(state: DayState) {
  const base: object = {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    position: 'relative' as const,
  };

  switch (state) {
    case 'past':
      return [base, { backgroundColor: 'transparent' }];
    case 'booked':
      return [base, { backgroundColor: theme.colors.ink, borderRadius: 2 }];
    case 'blocked':
      return [base, { backgroundColor: theme.colors.ivoryMid, borderRadius: 2 }];
    case 'sel-start':
      return [base, {
        backgroundColor: theme.colors.yellow,
        borderWidth: 1.5,
        borderColor: theme.colors.yellowBorder,
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }];
    case 'sel-end':
      return [base, {
        backgroundColor: theme.colors.yellow,
        borderWidth: 1.5,
        borderColor: theme.colors.yellowBorder,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
      }];
    case 'sel-single':
      return [base, {
        backgroundColor: theme.colors.yellow,
        borderWidth: 1.5,
        borderColor: theme.colors.yellowBorder,
        borderRadius: 2,
      }];
    case 'sel-mid':
      return [base, {
        backgroundColor: 'rgba(255,255,173,0.5)',
        borderRadius: 0,
      }];
    case 'today':
      return [base, { backgroundColor: theme.colors.ivoryDark }];
    default: // available
      return [base, { backgroundColor: theme.colors.ivoryDark }];
  }
}

function dayTextStyle(state: DayState) {
  const base = {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12,
    color: theme.colors.ink,
  };

  if (state === 'past' || state === 'blocked') {
    return { ...base, color: theme.colors.muted };
  }
  if (state === 'booked') {
    return { ...base, color: theme.colors.ivory };
  }
  if (state === 'sel-start' || state === 'sel-end' || state === 'sel-single') {
    return { ...base, color: theme.colors.yellowText };
  }
  return base;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 18,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.yellowBorder,
  },
});
