import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useRequests, Request, RequestStatus } from '../../context/RequestsContext';

type FilterTab = 'All' | 'Borrows' | 'Friends' | 'Activity';
const FILTER_TABS: FilterTab[] = ['All', 'Borrows', 'Friends', 'Activity'];

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending:  'BORROW REQUEST',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
};

const STATUS_COLOR: Record<RequestStatus, string> = {
  pending:  theme.colors.muted,
  accepted: theme.colors.yellowBorder,
  declined: '#9A9888',
};

function filterNotifs(notifs: Request[], tab: FilterTab): Request[] {
  switch (tab) {
    case 'All':      return notifs;
    case 'Borrows':  return notifs.filter((n) =>
                       n.type === 'borrow_request' || n.type === 'borrow_accepted'
                     );
    case 'Friends':  return notifs.filter((n) =>
                       n.type === 'friend_request' || n.type === 'friend_accepted'
                     );
    case 'Activity': return notifs.filter((n) =>
                       n.type === 'return_reminder' || n.type === 'review_prompt'
                     );
    default:         return notifs;
  }
}

export default function RequestsScreen() {
  const navigation = useNavigation();
  const { requests, pendingCount, acceptRequest, declineRequest } = useRequests();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const filtered = useMemo(() => filterNotifs(requests, activeTab), [requests, activeTab]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>NOTIFICATIONS</Text>
        {pendingCount > 0 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{pendingCount} New</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestItem
            request={item}
            onAccept={() => acceptRequest(item.id)}
            onDecline={() => declineRequest(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO REQUESTS HERE</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function RequestItem({
  request,
  onAccept,
  onDecline,
}: {
  request: Request;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const isPending  = request.status === 'pending';
  const isAccepted = request.status === 'accepted';

  return (
    <View style={itemStyles.row}>
      {/* Unread dot */}
      <View style={[itemStyles.dot, request.read ? itemStyles.dotRead : itemStyles.dotUnread]} />

      {/* Content */}
      <View style={itemStyles.content}>
        {/* Top row: type label + time */}
        <View style={itemStyles.topRow}>
          <Text style={[itemStyles.typeLabel, { color: STATUS_COLOR[request.status] }]}>
            {STATUS_LABEL[request.status]}
          </Text>
          <Text style={itemStyles.time}>{request.createdAt}</Text>
        </View>

        {/* Body */}
        <Text style={itemStyles.body}>
          <Text style={itemStyles.bodyBold}>{request.borrowerName}</Text>
          {isPending
            ? ` wants to borrow your ${request.itemName} for ${request.days} day${(request.days ?? 1) > 1 ? 's' : ''}.`
            : isAccepted
            ? ` is borrowing your ${request.itemName}. Due back ${request.dueBack ?? 'TBD'}.`
            : ` requested your ${request.itemName}.`}
        </Text>

        {/* Date pill — pending only */}
        {isPending && request.dateRange && (
          <View style={itemStyles.datePill}>
            <Text style={itemStyles.datePillText}>{request.dateRange}</Text>
          </View>
        )}

        {/* Action buttons — pending */}
        {isPending && (
          <View style={itemStyles.actions}>
            <Pressable style={itemStyles.acceptBtn} onPress={onAccept}>
              <Text style={itemStyles.acceptText}>ACCEPT</Text>
            </Pressable>
            <Pressable style={itemStyles.declineBtn} onPress={onDecline}>
              <Text style={itemStyles.declineText}>DECLINE</Text>
            </Pressable>
          </View>
        )}

        {/* View details — accepted */}
        {isAccepted && (
          <Pressable style={itemStyles.detailsBtn}>
            <Text style={itemStyles.detailsText}>VIEW DETAILS</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.ink,
    gap: 10,
  },
  backBtn: { marginRight: 4 },
  backText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 22,
    color: theme.colors.ink,
    lineHeight: 24,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 18,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
    flex: 1,
  },
  newBadge: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.yellowText,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.ink,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius,
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  tabText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.8,
  },
  tabTextActive: { color: theme.colors.yellowText },

  listContent: { paddingBottom: 40 },

  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 1,
  },
});

const itemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.ivoryMid,
    gap: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  dotUnread: {
    backgroundColor: theme.colors.yellowBorder,
  },
  dotRead: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: theme.fonts.interLight,
    fontSize: 10,
    color: theme.colors.muted,
  },
  body: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.ink,
    lineHeight: 19,
    marginBottom: 8,
  },
  bodyBold: {
    fontFamily: theme.fonts.interSemiBold,
  },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.ivoryDark,
    borderWidth: 0.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  datePillText: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 10,
    color: theme.colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: theme.colors.yellow,
    borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  acceptText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.yellowText,
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  declineText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  detailsText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10,
    color: theme.colors.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
