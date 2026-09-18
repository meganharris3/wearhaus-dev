import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, Image,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { useMessages } from '../../context/MessagesContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { ChatMessage, BorrowRequestPayload, CounterOfferPayload, Thread, Item } from '../../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChatThread'>;

const CURRENT_USER = 'me';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── BorrowRequestCard sub-components ────────────────────────────────────────

function RequestHeader({ status }: { status: BorrowRequestPayload['status'] }) {
  const config = {
    pending:   { iconBg: '#FFFFAD', icon: 'calendar-outline' as const, iconColor: '#3A3A00', pillBg: '#FFFFAD', pillColor: '#3A3A00', label: 'Pending'  },
    accepted:  { iconBg: '#14120C', icon: 'checkmark'        as const, iconColor: '#FFFFAD', pillBg: '#14120C', pillColor: '#FFFFAD', label: 'Accepted' },
    declined:  { iconBg: '#E2DED0', icon: 'close'            as const, iconColor: '#7A7762', pillBg: '#E2DED0', pillColor: '#7A7762', label: 'Declined' },
    countered: { iconBg: '#F0EDE0', icon: 'swap-horizontal'  as const, iconColor: '#14120C', pillBg: '#F0EDE0', pillColor: '#14120C', label: 'Countered'},
  }[status];

  return (
    <View style={cardStyles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={[cardStyles.iconBadge, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon} size={13} color={config.iconColor} />
        </View>
        <Text style={cardStyles.headerTitle}>Borrow Request</Text>
      </View>
      <View style={[cardStyles.statusPill, { backgroundColor: config.pillBg }]}>
        <Text style={[cardStyles.statusPillText, { color: config.pillColor }]}>{config.label}</Text>
      </View>
    </View>
  );
}

function ItemStrip({ item }: { item: BorrowRequestPayload['item'] }) {
  return (
    <View style={cardStyles.itemStrip}>
      <View style={[cardStyles.itemThumb, { backgroundColor: item.thumbColor }]}>
        {item.photo
          ? <Image source={{ uri: item.photo }} style={cardStyles.itemThumbImg} resizeMode="cover" />
          : <Ionicons name="shirt-outline" size={16} color="#14120C" style={{ opacity: 0.2 }} />
        }
      </View>
      <View>
        <Text style={cardStyles.itemName}>{item.name}</Text>
        <Text style={cardStyles.itemMeta}>{item.size} · {item.condition}</Text>
      </View>
    </View>
  );
}

function FactsList({ payload }: { payload: BorrowRequestPayload }) {
  const facts: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [
    { icon: 'calendar-outline', label: 'Dates',   value: `${formatDate(payload.startDate)} – ${formatDate(payload.endDate)}` },
  ];
  if (payload.status === 'pending' || payload.status === 'countered') {
    facts.push(
      { icon: 'time-outline',     label: 'Duration', value: `${payload.days} day${payload.days !== 1 ? 's' : ''}` },
      { icon: 'pricetag-outline', label: 'Rate',     value: `$${payload.pricePerDay}/day` },
    );
  }
  facts.push({ icon: 'location-outline', label: 'Pickup', value: payload.pickupMethod });

  return (
    <View style={cardStyles.factsList}>
      {facts.map((f) => (
        <View key={f.label} style={cardStyles.factRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={f.icon} size={12} color="#7A7762" />
            <Text style={cardStyles.factLabel}>{f.label}</Text>
          </View>
          <Text style={cardStyles.factValue}>{f.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TotalRow({ total }: { total: number }) {
  return (
    <View style={cardStyles.totalRow}>
      <Text style={cardStyles.totalLabel}>Total</Text>
      <Text style={cardStyles.totalValue}>${total}</Text>
    </View>
  );
}

function LenderActions({
  onAccept, onDecline, onCounter,
}: { onAccept: () => void; onDecline: () => void; onCounter: () => void }) {
  return (
    <View style={cardStyles.actions}>
      <TouchableOpacity onPress={onDecline} style={cardStyles.btnGhost}>
        <Text style={cardStyles.btnGhostText}>Decline</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCounter} style={cardStyles.btnInk}>
        <Text style={cardStyles.btnInkText}>Counter</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onAccept} style={cardStyles.btnYellow}>
        <Text style={cardStyles.btnYellowText}>Accept</Text>
      </TouchableOpacity>
    </View>
  );
}

function BorrowerWaiting({ lenderFirstName, onCancel }: { lenderFirstName: string; onCancel: () => void }) {
  return (
    <>
      <View style={cardStyles.waitingBox}>
        <View style={cardStyles.waitingDot} />
        <Text style={cardStyles.waitingText}>
          Waiting for <Text style={{ fontFamily: theme.fonts.interSemiBold }}>{lenderFirstName}</Text> to respond
        </Text>
      </View>
      <View style={cardStyles.cancelWrap}>
        <TouchableOpacity onPress={onCancel} style={cardStyles.btnGhost}>
          <Text style={cardStyles.btnGhostText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function BorrowerConfirmed({ payload }: { payload: BorrowRequestPayload }) {
  return (
    <View style={cardStyles.confirmedWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="checkmark-circle" size={14} color="#C8C820" />
        <Text style={cardStyles.confirmedTitle}>You're all set for pickup</Text>
      </View>
      <Text style={cardStyles.confirmedSub}>
        Meet {payload.lenderFirstName} at {payload.pickupMethod} on {formatDate(payload.startDate)}
      </Text>
    </View>
  );
}

function LenderConfirmed({ payload }: { payload: BorrowRequestPayload }) {
  return (
    <View style={cardStyles.confirmedWrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="checkmark-circle" size={14} color="#C8C820" />
        <Text style={cardStyles.confirmedTitle}>You accepted this request</Text>
      </View>
      <Text style={cardStyles.confirmedSub}>
        Meet {payload.borrowerFirstName} at {payload.pickupMethod} on {formatDate(payload.startDate)}
      </Text>
    </View>
  );
}

function DeclinedNote({ isLender }: { isLender: boolean }) {
  return (
    <View style={cardStyles.confirmedWrap}>
      <Text style={{ fontFamily: theme.fonts.interRegular, fontSize: 11, color: '#7A7762' }}>
        {isLender ? 'You declined this request' : 'This request was declined'}
      </Text>
    </View>
  );
}

function BorrowRequestCard({
  msg,
  onAccept,
  onDecline,
  onCounter,
  onCancel,
}: {
  msg: ChatMessage;
  onAccept: () => void;
  onDecline: () => void;
  onCounter: () => void;
  onCancel: () => void;
}) {
  const payload = msg.payload as BorrowRequestPayload;
  const isLender   = CURRENT_USER === payload.lenderId;
  const isBorrower = CURRENT_USER === payload.borrowerId;

  return (
    <View style={cardStyles.shell}>
      <RequestHeader status={payload.status} />
      <ItemStrip item={payload.item} />
      <View style={cardStyles.divider} />
      <FactsList payload={payload} />
      <TotalRow total={payload.total} />

      {payload.status === 'pending' && isLender && (
        <LenderActions onAccept={onAccept} onDecline={onDecline} onCounter={onCounter} />
      )}
      {payload.status === 'pending' && isBorrower && (
        <BorrowerWaiting lenderFirstName={payload.lenderFirstName} onCancel={onCancel} />
      )}
      {payload.status === 'accepted' && isBorrower && <BorrowerConfirmed payload={payload} />}
      {payload.status === 'accepted' && isLender   && <LenderConfirmed payload={payload} />}
      {payload.status === 'declined' && <DeclinedNote isLender={isLender} />}

      <Text style={cardStyles.timestamp}>{msg.timestamp}</Text>
    </View>
  );
}

// ─── Other message renderers ───────────────────────────────────────────────────

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
          <Pressable style={[styles.cardBtn, styles.cardBtnPrimary]} onPress={() => {}}>
            <Text style={styles.cardBtnPrimaryText}>ACCEPT</Text>
          </Pressable>
          <Pressable
            style={[styles.cardBtn, styles.cardBtnSecondary]}
            onPress={() => navigation.navigate('MakeOffer', { threadId: thread.id, pricePerDay: payload.pricePerDay })}
          >
            <Text style={styles.cardBtnSecondaryText}>COUNTER</Text>
          </Pressable>
        </View>
      )}
      <Text style={[styles.timestamp, { marginTop: 6 }]}>{msg.timestamp}</Text>
    </View>
  );
}

function ItemMentionCard({ item }: { item: Item }) {
  return (
    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
      <View style={styles.itemMentionCard}>
        <Text style={styles.itemMentionLabel}>ASKING ABOUT</Text>
        <View style={styles.itemMentionBody}>
          <View style={styles.itemMentionThumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemMentionName}>{item.name.toUpperCase()}</Text>
            <Text style={styles.itemMentionMeta}>
              {item.size_label} · ${(item.price_per_day / 100).toFixed(2)}/day
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.timestamp}>Just now</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatThreadScreen({ route, navigation }: Props) {
  const { threadId: initialThreadId, pendingItem, pendingOtherUser } = route.params;
  const { getThread, markRead, sendMessage, updateRequestStatus, createDirectThread } = useMessages();
  const [inputText, setInputText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(initialThreadId);

  const thread = activeThreadId ? getThread(activeThreadId) : undefined;
  const isNewThread = !thread;

  const displayItem = thread?.item ?? pendingItem;
  const displayOtherUser = thread?.otherUser ?? pendingOtherUser;

  useEffect(() => {
    if (activeThreadId) markRead(activeThreadId);
  }, [activeThreadId]);

  if (!displayOtherUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.ivory }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: theme.fonts.interLight, color: theme.colors.muted }}>Thread not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    let targetId = activeThreadId;
    if (!targetId && pendingOtherUser) {
      const newThread = createDirectThread(pendingOtherUser, pendingItem);
      targetId = newThread.id;
      setActiveThreadId(newThread.id);
      if (pendingItem) {
        sendMessage(targetId, { type: 'item_mention', senderId: CURRENT_USER, text: pendingItem.name, timestamp: 'Just now' });
      }
    }
    if (!targetId) return;
    sendMessage(targetId, { type: 'text', senderId: CURRENT_USER, text, timestamp: 'Just now' });
    setInputText('');
  }

  function handleAccept(msg: ChatMessage) {
    if (!activeThreadId) return;
    const payload = msg.payload as BorrowRequestPayload;
    updateRequestStatus(activeThreadId, msg.id, 'accepted');
    sendMessage(activeThreadId, {
      type: 'system', senderId: 'system',
      text: `${payload.lenderFirstName} accepted the request`,
      timestamp: 'Just now',
    });
  }

  function handleDecline(msg: ChatMessage) {
    if (!activeThreadId) return;
    const payload = msg.payload as BorrowRequestPayload;
    updateRequestStatus(activeThreadId, msg.id, 'declined');
    sendMessage(activeThreadId, {
      type: 'system', senderId: 'system',
      text: `${payload.lenderFirstName} declined the request`,
      timestamp: 'Just now',
    });
  }

  function handleCounter(msg: ChatMessage) {
    if (!activeThreadId) return;
    const payload = msg.payload as BorrowRequestPayload;
    navigation.navigate('MakeOffer', {
      threadId: activeThreadId,
      pricePerDay: Math.round(payload.pricePerDay * 100),
    });
  }

  function handleCancel(msg: ChatMessage) {
    if (!activeThreadId) return;
    updateRequestStatus(activeThreadId, msg.id, 'declined');
    sendMessage(activeThreadId, {
      type: 'system', senderId: 'system',
      text: 'Request cancelled',
      timestamp: 'Just now',
    });
  }

  function renderMessage(msg: ChatMessage) {
    switch (msg.type) {
      case 'text':
        return <TextBubble key={msg.id} msg={msg} />;
      case 'system':
        return <SystemMessage key={msg.id} msg={msg} />;
      case 'item_mention':
        return displayItem ? <ItemMentionCard key={msg.id} item={displayItem} /> : null;
      case 'borrow_request':
        return (
          <BorrowRequestCard
            key={msg.id}
            msg={msg}
            onAccept={() => handleAccept(msg)}
            onDecline={() => handleDecline(msg)}
            onCounter={() => handleCounter(msg)}
            onCancel={() => handleCancel(msg)}
          />
        );
      case 'counter_offer':
        return thread ? <CounterOfferCard key={msg.id} msg={msg} thread={thread} navigation={navigation} /> : null;
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
            <View style={[styles.headerAvatar, { backgroundColor: displayOtherUser.avatarColor }]}>
              <Text style={styles.headerAvatarText}>{displayOtherUser.initials}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{displayOtherUser.name}</Text>
              <Text style={styles.headerHandle}>@{displayOtherUser.handle}</Text>
            </View>
          </View>
          <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.muted} />
        </View>

        {/* Item context bar */}
        {displayItem && (
          <View style={styles.itemBar}>
            <View style={styles.itemBarThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemBarName}>{displayItem.name.toUpperCase()}</Text>
              <Text style={styles.itemBarMeta}>{displayItem.size_label} · {displayItem.category}</Text>
            </View>
            <Text style={styles.itemBarPrice}>${(displayItem.price_per_day / 100).toFixed(2)}/day</Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          data={[...(thread?.messages ?? [])].reverse()}
          inverted
          keyExtractor={(msg) => msg.id}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item: msg }) => renderMessage(msg)}
        />

        {/* "Replying to listing" strip */}
        {isNewThread && displayItem && (
          <View style={styles.replyContext}>
            <View style={styles.replyAccentBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyContextLabel}>REPLYING TO LISTING</Text>
              <Text style={styles.replyContextItem}>{displayItem.name.toUpperCase()}</Text>
              <Text style={styles.replyContextMeta}>
                {displayItem.size_label} · ${(displayItem.price_per_day / 100).toFixed(2)}/day
              </Text>
            </View>
            <View style={styles.replyContextThumb} />
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {thread && thread.item && (
            <Pressable
              style={styles.offerBtn}
              onPress={() => navigation.navigate('MakeOffer', {
                threadId: thread.id,
                pricePerDay: thread.item!.price_per_day,
              })}
            >
              <Ionicons name="pricetag-outline" size={13} color={theme.colors.ink} />
              <Text style={styles.offerBtnText}>OFFER</Text>
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${displayOtherUser.name.split(' ')[0]}…`}
            placeholderTextColor={theme.colors.muted}
            multiline
            autoFocus={isNewThread}
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="arrow-up" size={16} color={theme.colors.ivory} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── BorrowRequestCard styles ─────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  shell: {
    borderWidth: 1.5,
    borderColor: '#14120C',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FDFBF4',
    marginBottom: 10,
    maxWidth: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#14120C',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  itemStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  itemThumb: {
    width: 40,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemThumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  itemName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#14120C',
    marginBottom: 1,
  },
  itemMeta: {
    fontFamily: 'Inter_300Light',
    fontSize: 10,
    color: '#7A7762',
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E2DED0',
    marginHorizontal: 14,
  },
  factsList: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  factLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#7A7762',
  },
  factValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#14120C',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 14,
    marginTop: 2,
    paddingTop: 9,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#14120C',
  },
  totalLabel: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#14120C',
  },
  totalValue: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 20,
    color: '#14120C',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  btnBase: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnYellow: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFAD',
  },
  btnYellowText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: '#3A3A00',
  },
  btnGhost: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2DED0',
  },
  btnGhostText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: '#7A7762',
  },
  btnInk: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#14120C',
  },
  btnInkText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: '#14120C',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#F0EDE0',
    borderWidth: 1,
    borderColor: '#E2DED0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8C820',
  },
  waitingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#14120C',
  },
  cancelWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  confirmedWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  confirmedTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#14120C',
  },
  confirmedSub: {
    fontFamily: 'Inter_300Light',
    fontSize: 10,
    color: '#7A7762',
    marginTop: 4,
    paddingLeft: 20,
  },
  timestamp: {
    fontFamily: 'Inter_300Light',
    fontSize: 9,
    color: '#7A7762',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});

// ─── Thread / layout styles ───────────────────────────────────────────────────

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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 10, color: theme.colors.ink },
  headerName: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  headerHandle: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted },

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
  itemBarThumb: { width: 36, height: 44, backgroundColor: theme.colors.ivoryMid, borderRadius: 2 },
  itemBarName: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 12, color: theme.colors.ink, letterSpacing: 0.8 },
  itemBarMeta: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted, marginTop: 2 },
  itemBarPrice: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink },

  messagesList: { padding: 16, paddingBottom: 8 },

  bubbleMine: { backgroundColor: '#14120C', borderRadius: 2, padding: 8, paddingHorizontal: 11, maxWidth: '75%' },
  bubbleTheirs: { backgroundColor: '#F0EDE0', borderWidth: 0.5, borderColor: '#E2DED0', borderRadius: 2, padding: 8, paddingHorizontal: 11, maxWidth: '75%' },
  bubbleTextMine: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: '#FDFBF4' },
  bubbleTextTheirs: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: '#14120C' },
  timestamp: { fontFamily: theme.fonts.interLight, fontSize: 9, color: theme.colors.muted, marginTop: 3 },

  systemMsg: { backgroundColor: '#F0EDE0', borderWidth: 0.5, borderColor: '#E2DED0', borderRadius: 2, paddingHorizontal: 10, paddingVertical: 4 },
  systemText: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted, textAlign: 'center' },

  // CounterOfferCard (legacy styles preserved)
  card: { borderWidth: 1.5, borderColor: theme.colors.ivoryMid, borderRadius: 2, padding: 14, marginBottom: 10, maxWidth: '85%', backgroundColor: theme.colors.ivory },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 10, color: theme.colors.ink, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardLabel: { fontFamily: theme.fonts.interLight, fontSize: 11, color: theme.colors.muted },
  cardValue: { fontFamily: theme.fonts.interRegular, fontSize: 11, color: theme.colors.ink },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  cardBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2, borderWidth: 1.5 },
  cardBtnPrimary: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  cardBtnPrimaryText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 9, color: theme.colors.ivory, letterSpacing: 1, textTransform: 'uppercase' },
  cardBtnSecondary: { backgroundColor: '#FFFFAD', borderColor: '#C8C820' },
  cardBtnSecondaryText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 9, color: '#3A3A00', letterSpacing: 1, textTransform: 'uppercase' },

  inputBar: { borderTopWidth: 1.5, borderTopColor: theme.colors.ink, backgroundColor: theme.colors.ivory, flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 12, gap: 8 },
  offerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8 },
  offerBtnText: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 9, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { flex: 1, maxHeight: 80, borderWidth: 1, borderColor: theme.colors.ivoryMid, borderRadius: 2, fontFamily: theme.fonts.interLight, fontSize: 13, color: theme.colors.ink, paddingHorizontal: 10, paddingVertical: 8 },
  sendBtn: { width: 34, height: 34, backgroundColor: theme.colors.ink, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },

  itemMentionCard: { borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: 2, padding: 10, maxWidth: '75%', backgroundColor: theme.colors.ivory },
  itemMentionLabel: { fontFamily: theme.fonts.barlowBold, fontSize: 8, color: theme.colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  itemMentionBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemMentionThumb: { width: 30, height: 38, backgroundColor: theme.colors.ivoryMid, borderRadius: 1 },
  itemMentionName: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 11, color: theme.colors.ink, letterSpacing: 0.6 },
  itemMentionMeta: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted, marginTop: 2 },

  replyContext: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.ivoryDark, borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid },
  replyAccentBar: { width: 3, height: 38, backgroundColor: theme.colors.ink, borderRadius: 2 },
  replyContextLabel: { fontFamily: theme.fonts.barlowBold, fontSize: 8, color: theme.colors.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 },
  replyContextItem: { fontFamily: theme.fonts.barlowExtraBold, fontSize: 12, color: theme.colors.ink, letterSpacing: 0.5 },
  replyContextMeta: { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted, marginTop: 1 },
  replyContextThumb: { width: 30, height: 38, backgroundColor: theme.colors.ivoryMid, borderRadius: 1 },
});
