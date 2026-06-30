import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useMessages } from '../../context/MessagesContext';
import WearCalendar from '../../components/WearCalendar';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { CounterOfferPayload } from '../../types';
import { formatDateShort, addMonths } from '../../utils/dateUtils';

type Props = NativeStackScreenProps<AppStackParamList, 'MakeOffer'>;

export default function MakeOfferScreen({ route, navigation }: Props) {
  const { threadId, pricePerDay } = route.params;
  const { sendMessage } = useMessages();

  const [priceInput, setPriceInput]       = useState('');
  const [note, setNote]                   = useState('');
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd]     = useState<Date | null>(null);
  const [month, setMonth]                 = useState(new Date());

  const canSend = priceInput.trim().length > 0;

  function handleSend() {
    if (!canSend) return;
    const payload: CounterOfferPayload = {
      pricePerDay: Math.round(parseFloat(priceInput) * 100),
      dates: selectedStart && selectedEnd
        ? { start: formatDateShort(selectedStart), end: formatDateShort(selectedEnd) }
        : { start: '—', end: '—' },
      note: note.trim() || undefined,
    };
    sendMessage(threadId, {
      type: 'counter_offer',
      senderId: 'me',
      payload,
      timestamp: 'Just now',
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.topTitle}>MAKE OFFER</Text>
        <Pressable
          style={[styles.sendTopBtn, !canSend && styles.sendTopBtnDisabled]}
          disabled={!canSend}
          onPress={handleSend}
        >
          <Text style={styles.sendTopBtnText}>SEND</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader label="OFFER DETAILS" />

        {/* Price input */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>PRICE PER DAY</Text>
          <View style={styles.priceInputRow}>
            <Text style={styles.priceDollar}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.colors.muted}
            />
          </View>
          <Text style={styles.priceHint}>Original: ${(pricePerDay / 100).toFixed(2)}/day</Text>
        </View>

        <SectionHeader label="DATE RANGE" />

        <WearCalendar
          mode="borrower"
          bookedRanges={[]}
          blockedRanges={[]}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          onSelectStart={(d) => { setSelectedStart(d); setSelectedEnd(null); }}
          onSelectEnd={(d) => setSelectedEnd(d)}
          month={month}
          onMonthChange={(dir) => setMonth(addMonths(month, dir === 'next' ? 1 : -1))}
        />

        <SectionHeader label="NOTE (OPTIONAL)" />

        <View style={styles.noteSection}>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Add a note…"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        {/* Bottom send button */}
        <View style={styles.ctaSection}>
          <Pressable
            style={[styles.ctaBtn, !canSend && styles.ctaBtnDisabled]}
            disabled={!canSend}
            onPress={handleSend}
          >
            <Text style={[styles.ctaBtnText, !canSend && styles.ctaBtnTextDisabled]}>
              SEND OFFER
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
  },
  backText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.muted,
  },
  topTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.ink,
  },
  sendTopBtn: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sendTopBtnDisabled: { opacity: 0.4 },
  sendTopBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.yellowText,
  },

  sectionHeader: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ivoryMid,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 12,
  },
  sectionHeaderText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.ink,
    letterSpacing: 1.5,
  },

  priceSection: {
    paddingHorizontal: 18,
    marginTop: 12,
    gap: 6,
  },
  priceLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceDollar: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 16,
    color: theme.colors.ink,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontFamily: theme.fonts.interLight,
    fontSize: 16,
    color: theme.colors.ink,
  },
  priceHint: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 4,
  },

  noteSection: {
    paddingHorizontal: 18,
    marginTop: 8,
  },
  noteInput: {
    height: 80,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.ink,
    padding: 10,
    textAlignVertical: 'top',
  },

  ctaSection: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
  },
  ctaBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBtnDisabled: { backgroundColor: theme.colors.ivoryMid },
  ctaBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  ctaBtnTextDisabled: { color: theme.colors.muted },
});
