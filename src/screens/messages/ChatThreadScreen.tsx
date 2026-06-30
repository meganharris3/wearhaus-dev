import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useMessages } from '../../context/MessagesContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { ChatMessage, BorrowRequestPayload, CounterOfferPayload, Thread } from '../../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatThread'>;

const CURRENT_USER = 'me';

// ─── Message renderers ─────────────────────────────────────────────────────────

function TextBubble({ msg }: { msg: ChatMessage }) {
  const isMine = msg.senderId === CURRENT_USER;
  return (
    <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <View style={isMine ? styles.bubbleMine : styles.bubbleTheirs}>
        <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{msg.text}</Text>
      </View>
      <Text style={styles.timestamp}>{msg.timestamp}</Text>
    </View>
  );
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 12 }}>
      <View style={styles.systemMsg}>
        <Text style={styles.systemText}>{msg.text}</Text>
      </View>
    </View>
  );
}

function BorrowRequestCard({
  msg,
  thread,
  navigation,
  updateRequestStatus,
}: {
  msg: ChatMessage;
  thread: Thread;
  navigation: Props['navigation'];
  updateRequestStatus: (threadId: string, messageId: string, status: BorrowRequestPayload['status']) => void;
}) {
  const payload = msg.payload as BorrowRequestPayload;
  const isLender = thread.item.owner_id === CURRENT_USER;
  const isMine = msg.senderId === CURRENT_USER;

  return (
    <View style={[styles.card, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>BORROW REQUEST</Text>
        <StatusPill status={payload.status} />
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Dates</Text>
        <Text style={styles.cardValue}>{payload.dates.start} – {payload.dates.end}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Duration</Text>
        <Text style={styles.cardValue}>{payload.duration} day{payload.duration !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Rate</Text>
        <Text style={styles.cardValue}>${(payload.pricePerDay / 100).toFixed(2)}/day</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Pickup</Text>
        <Text style={styles.cardValue}>{payload.pickup}</Text>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardRow}>
        <Text style={[styles.cardLabel, { fontFamily: theme.fonts.interSemiBold }]}>Total</Text>
        <Text style={[styles.cardValue, { fontFamily: theme.fonts.interSemiBold }]}>${(payload.total / 100).toFixed(2)}</Text>
      </View>

      {payload.status === 'pending' && isLender && (
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnPrimary]}
            onPress={() => updateRequestStatus(thread.id, msg.id, 'accepted')}
          >
            <Text style={styles.cardBtnPrimaryText}>ACCEPT</Text>
          </Pressable>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnSecondary]}
            onPress={() => navigation.navigate('MakeOffer', {
              threadId: thread.id,
              pricePerDay: payload.pricePerDay,
            })}
          >
            <Text style={styles.cardBtnSecondaryText}>COUNTER</Text>
          </Pressable>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnDecline]}
            onPress={() => updateRequestStatus(thread.id, msg.id, 'declined')}
          >
            <Text style={styles.cardBtnDeclineText}>DECLINE</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.timestamp, { marginTop: 6 }]}>{msg.timestamp}</Text>
    </View>
  );
}

function ConfirmedCard({ msg }: { msg: ChatMessage }) {
  const payload = msg.payload as BorrowRequestPayload;
  return (
    <View style={[styles.card, styles.cardConfirmed, { alignSelf: 'center' }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.colors.ivory }]}>RENTAL CONFIRMED</Text>
        <Ionicons name="checkmark-circle" size={16} color="#C8C820" />
      </View>
      <View style={styles.cardRow}>
        <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>Dates</Text>
        <Text style={[styles.cardValue, { color: theme.colors.ivory }]}>{payload.dates.start} – {payload.dates.end}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>Duration</Text>
        <Text style={[styles.cardValue, { color: theme.colors.ivory }]}>{payload.duration} day{payload.duration !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>Total</Text>
        <Text style={[styles.cardValue, { color: theme.colors.ivory }]}>${(payload.total / 100).toFixed(2)}</Text>
      </View>
      <Text style={[styles.timestamp, { marginTop: 6 }]}>{msg.timestamp}</Text>
    </View>
  );
}

function CounterOfferCard({
  msg,
  thread,
  navigation,
}: {
  msg: ChatMessage;
  thread: Thread;
  navigation: Props['navigation'];
}) {
  const payload = msg.payload as CounterOfferPayload;
  const isMine = msg.senderId === CURRENT_USER;

  return (
    <View style={[styles.card, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>COUNTER OFFER</Text>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>New Rate</Text>
        <Text style={styles.cardValue}>${(payload.pricePerDay / 100).toFixed(2)}/day</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Dates</Text>
        <Text style={styles.cardValue}>{payload.dates.start} – {payload.dates.end}</Text>
      </View>
      {payload.note && (
        <View style={[styles.cardRow, { flexDirection: 'column', gap: 2 }]}>
          <Text style={styles.cardLabel}>Note</Text>
          <Text style={[styles.cardValue, { flexShrink: 1 }]}>{payload.note}</Text>
        </View>
      )}

      {!isMine && (
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnPrimary]}
            onPress={() => {/* accept counter */}}
          >
            <Text style={styles.cardBtnPrimaryText}>ACCEPT</Text>
          </Pressable>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnSecondary]}
            onPress={() => navigation.navigate('MakeOffer', {
              threadId: thread.id,
              pricePerDay: payload.pricePerDay,
            })}
          >
            <Text style={styles.cardBtnSecondaryText}>COUNTER</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.timestamp, { marginTop: 6 }]}>{msg.timestamp}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: BorrowRequestPayload['status'] }) {
  const configs: Record<BorrowRequestPayload['status'], { label: string; bg: string; text: string }> = {
    pending:   { label: 'PENDING',   bg: '#FFFFAD', text: '#3A3A00' },
    accepted:  { label: 'ACCEPTED',  bg: '#C8C820', text: '#14120C' },
    declined:  { label: 'DECLINED',  bg: theme.colors.ivoryMid, text: theme.colors.muted },
    countered: { label: 'COUNTERED', bg: theme.colors.ivoryDark, text: theme.colors.ink },
  };
  const cfg = configs[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatThreadScreen({ route, navigation }: Props) {
  const { threadId } = route.params;
  const { getThread, markRead, sendMessage, updateRequestStatus } = useMessages();
  const [inputText, setInputText] = useState('');

  const threadOrUndef = getThread(threadId);

  useEffect(() => {
    markRead(threadId);
  }, [threadId]);

  if (!threadOrUndef) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.ivory }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: theme.fonts.interLight, color: theme.colors.muted }}>
            Thread not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const thread: Thread = threadOrUndef;
  const item = thread.item;

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(threadId, {
      type: 'text',
      senderId: CURRENT_USER,
      text,
      timestamp: 'Just now',
    });
    setInputText('');
  }

  function renderMessage(msg: ChatMessage) {
    switch (msg.type) {
      case 'text':
        return <TextBubble key={msg.id} msg={msg} />;
      case 'system':
        return <SystemMessage key={msg.id} msg={msg} />;
      case 'borrow_request':
        return (
          <BorrowRequestCard
            key={msg.id}
            msg={msg}
            thread={thread}
            navigation={navigation}
            updateRequestStatus={updateRequestStatus}
          />
        );
      case 'confirmed':
        return <ConfirmedCard key={msg.id} msg={msg} />;
      case 'counter_offer':
        return (
          <CounterOfferCard
            key={msg.id}
            msg={msg}
            thread={thread}
            navigation={navigation}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.ivory }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.ink} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.headerAvatar, { backgroundColor: thread.otherUser.avatarColor }]}>
              <Text style={styles.headerAvatarText}>{thread.otherUser.initials}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{thread.otherUser.name}</Text>
              <Text style={styles.headerHandle}>@{thread.otherUser.handle}</Text>
            </View>
          </View>
          <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.muted} />
        </View>

        {/* Item context bar */}
        <View style={styles.itemBar}>
          <View style={styles.itemBarThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemBarName}>{item.name.toUpperCase()}</Text>
            <Text style={styles.itemBarMeta}>{item.size_label} · {item.category}</Text>
          </View>
          <Text style={styles.itemBarPrice}>${(item.price_per_day / 100).toFixed(2)}/day</Text>
        </View>

        {/* Messages */}
        <FlatList
          data={[...thread.messages].reverse()}
          inverted
          keyExtractor={(msg) => msg.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item: msg }) => renderMessage(msg)}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <Pressable
            style={styles.offerBtn}
            onPress={() => navigation.navigate('MakeOffer', {
              threadId: thread.id,
              pricePerDay: item.price_per_day,
            })}
          >
            <Ionicons name="pricetag-outline" size={13} color={theme.colors.ink} />
            <Text style={styles.offerBtnText}>OFFER</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message…"
            placeholderTextColor={theme.colors.muted}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="arrow-up" size={16} color={theme.colors.ivory} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.ink,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    color: theme.colors.ink,
  },
  headerName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  headerHandle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
  },

  itemBar: {
    backgroundColor: '#F0EDE0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2DED0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemBarThumb: {
    width: 36,
    height: 44,
    backgroundColor: theme.colors.ivoryMid,
    borderRadius: 2,
  },
  itemBarName: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    color: theme.colors.ink,
    letterSpacing: 0.8,
  },
  itemBarMeta: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 2,
  },
  itemBarPrice: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 12,
    color: theme.colors.ink,
  },

  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },

  bubbleMine: {
    backgroundColor: '#14120C',
    borderRadius: 2,
    padding: 8,
    paddingHorizontal: 11,
    maxWidth: '75%',
  },
  bubbleTheirs: {
    backgroundColor: '#F0EDE0',
    borderWidth: 0.5,
    borderColor: '#E2DED0',
    borderRadius: 2,
    padding: 8,
    paddingHorizontal: 11,
    maxWidth: '75%',
  },
  bubbleTextMine: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: '#FDFBF4',
  },
  bubbleTextTheirs: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: '#14120C',
  },
  timestamp: {
    fontFamily: theme.fonts.interLight,
    fontSize: 9,
    color: theme.colors.muted,
    marginTop: 3,
  },

  systemMsg: {
    backgroundColor: '#F0EDE0',
    borderWidth: 0.5,
    borderColor: '#E2DED0',
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  systemText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
    textAlign: 'center',
  },

  card: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    padding: 14,
    marginBottom: 10,
    maxWidth: '85%',
    backgroundColor: theme.colors.ivory,
  },
  cardConfirmed: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    color: theme.colors.ink,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardLabel: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
  },
  cardValue: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: theme.colors.ink,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.ivoryMid,
    marginVertical: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  cardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  cardBtnPrimary: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  cardBtnPrimaryText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.ivory,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardBtnSecondary: {
    backgroundColor: '#FFFFAD',
    borderColor: '#C8C820',
  },
  cardBtnSecondaryText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: '#3A3A00',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardBtnDecline: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.ivoryMid,
  },
  cardBtnDeclineText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  statusPill: {
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  inputBar: {
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.ink,
    backgroundColor: theme.colors.ivory,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offerBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    flex: 1,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
    borderRadius: 2,
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 34,
    height: 34,
    backgroundColor: theme.colors.ink,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
