import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import StatusTag from '../../components/StatusTag';
import { useAuth } from '../../context/AuthContext';
import { useInteractions } from '../../context/InteractionsContext';
import { useMessages } from '../../context/MessagesContext';
import type { ThreadParticipant } from '../../types';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { Comment } from '../../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ItemDetail'>;

function getInitials(name: string): string {
  return name.split(' ').map((n) => n.charAt(0).toUpperCase()).join('').slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentRow({ comment }: { comment: Comment }) {
  const initials = getInitials(comment.authorName);
  return (
    <View style={commentStyles.row}>
      <View style={commentStyles.avatar}>
        <Text style={commentStyles.avatarText}>{initials}</Text>
      </View>
      <View style={commentStyles.bubble}>
        <View style={commentStyles.bubbleHeader}>
          <Text style={commentStyles.authorName}>{comment.authorName}</Text>
          <Text style={commentStyles.timestamp}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={commentStyles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

export default function ItemDetailScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const { isFavorited, toggleFavorite, favoriteCount, getComments, loadComments, addComment } = useInteractions();
  const { findThreadByUser } = useMessages();
  const { item } = route.params;

  const [commentText, setCommentText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const priceFormatted = `$${(item.price_per_day / 100).toFixed(2)}/day`;
  const ownerName      = item.owner?.display_name ?? 'Unknown';
  const ownerInitials  = getInitials(ownerName);
  const ownerRating    = item.owner?.rating ?? 4.9;
  const isOwner        = item.owner_id === 'me' || (user != null && item.owner_id === user.id);
  const favorited      = isFavorited(item.id);
  const likes          = favoriteCount(item.id);
  const comments       = getComments(item.id);

  const photoList: string[] =
    item.photo_urls?.length ? item.photo_urls : item.photo_url ? [item.photo_url] : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef  = useRef<FlatList<string>>(null);
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const PHOTO_HEIGHT = SCREEN_WIDTH * (4 / 3);

  function goTo(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  }

  useEffect(() => {
    loadComments(item.id).catch((e) => console.warn('Failed to load comments', e));
  }, [item.id, loadComments]);

  const handleSendComment = useCallback(async () => {
    const text = commentText;
    if (!text.trim()) return;
    setCommentText('');
    try {
      await addComment(item.id, text);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setCommentText(text); // give the text back so nothing is lost
      Alert.alert('Could not post comment', e instanceof Error ? e.message : 'Please try again.');
    }
  }, [commentText, item.id, addComment]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>
          {isOwner && (
            <Pressable onPress={() => navigation.navigate('AddItem', { item })} style={styles.editBtn}>
              <Text style={styles.editBtnText}>EDIT</Text>
            </Pressable>
          )}
        </View>

        {/* Photo swiper */}
        <View style={styles.photoContainer}>
          {photoList.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={photoList}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
              getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
              onMomentumScrollEnd={(e) => {
                setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
              renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }} resizeMode="cover" />
              )}
            />
          ) : (
            <View style={styles.photoPlaceholder} />
          )}

          <View style={styles.tagWrapper}><StatusTag status={item.status} /></View>

          {photoList.length > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{activeIndex + 1} / {photoList.length}</Text>
            </View>
          )}
          {photoList.length > 1 && activeIndex > 0 && (
            <Pressable style={[styles.arrowBtn, styles.arrowLeft]} onPress={() => goTo(activeIndex - 1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.ivory} />
            </Pressable>
          )}
          {photoList.length > 1 && activeIndex < photoList.length - 1 && (
            <Pressable style={[styles.arrowBtn, styles.arrowRight]} onPress={() => goTo(activeIndex + 1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.ivory} />
            </Pressable>
          )}
          {photoList.length > 1 && (
            <View style={styles.dotsRow}>
              {photoList.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title + heart */}
          <View style={styles.titleRow}>
            <Text style={styles.itemName} numberOfLines={3}>{item.name.toUpperCase()}</Text>
            <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={10} style={styles.heartBtn}>
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={26}
                color={favorited ? '#CC2D2D' : theme.colors.ink}
              />
              <Text style={[styles.likesCount, favorited && styles.likesCountActive]}>{likes}</Text>
            </Pressable>
          </View>

          <Text style={styles.lenderText}>Listed by {ownerName}</Text>
          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceFormatted}</Text>
            <View style={styles.sizeBadge}>
              <Text style={styles.sizeBadgeText}>{item.size_label}</Text>
            </View>
          </View>
          <Text style={styles.location}>{item.location_label}</Text>
          <View style={styles.divider} />

          {(item.size_label || item.condition || item.occasion_tags?.length) && (
            <>
              <Text style={styles.descriptionLabel}>SIZE & CONDITION</Text>
              <View style={styles.tagRow}>
                {item.size_label && <View style={styles.tag}><Text style={styles.tagText}>{item.size_label}</Text></View>}
                {item.condition   && <View style={styles.tag}><Text style={styles.tagText}>{item.condition}</Text></View>}
                {item.occasion_tags?.map((tag) => (
                  <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {item.list_for_rental && (item.max_duration || item.pickup_method) && (
            <>
              <Text style={styles.descriptionLabel}>RENTAL SETTINGS</Text>
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{priceFormatted}</Text></View>
                {item.max_duration  && <View style={styles.tag}><Text style={styles.tagText}>MAX {item.max_duration}</Text></View>}
                {item.pickup_method && <View style={styles.tag}><Text style={styles.tagText}>{item.pickup_method}</Text></View>}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {isOwner && (
            <Pressable style={styles.actionRow} onPress={() => navigation.navigate('Availability', { item })}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.ink} />
              <Text style={styles.actionRowText}>Manage Availability</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </Pressable>
          )}
          {isOwner && (
            <Pressable style={styles.actionRow} onPress={() => navigation.navigate('AddItem', { item })}>
              <Ionicons name="create-outline" size={16} color={theme.colors.ink} />
              <Text style={styles.actionRowText}>Edit Item</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
            </Pressable>
          )}

          <Text style={styles.descriptionLabel}>DESCRIPTION</Text>
          <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
          <View style={styles.divider} />

          {/* Lender card */}
          <View style={styles.lenderCard}>
            <View style={styles.lenderAvatar}>
              <Text style={styles.lenderAvatarText}>{ownerInitials}</Text>
            </View>
            <View style={styles.lenderInfo}>
              <Text style={styles.lenderName}>{ownerName}</Text>
              <Text style={styles.lenderRating}>⭐ {ownerRating}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Comments */}
          <Text style={styles.descriptionLabel}>
            COMMENTS{comments.length > 0 ? ` · ${comments.length}` : ''}
          </Text>

          {comments.length === 0 && (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          )}

          {comments.map((c) => <CommentRow key={c.id} comment={c} />)}

        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Fixed bottom: comment input + CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaContainer}>
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment…"
            placeholderTextColor={theme.colors.muted}
            value={commentText}
            onChangeText={setCommentText}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
            multiline={false}
          />
          <Pressable
            onPress={handleSendComment}
            disabled={!commentText.trim()}
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            hitSlop={8}
          >
            <Ionicons name="arrow-up-circle" size={28} color={commentText.trim() ? theme.colors.ink : theme.colors.ivoryMid} />
          </Pressable>
        </View>

        <View style={styles.ctaDivider} />

        {isOwner ? (
          <Pressable style={styles.ctaManage} onPress={() => navigation.navigate('Availability', { item })}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.ivory} />
            <Text style={styles.ctaManageText}>MANAGE AVAILABILITY</Text>
          </Pressable>
        ) : (
          <View style={styles.ctaRow}>
            <Pressable
              style={styles.messageBtn}
              onPress={() => {
                const existing = findThreadByUser(item.owner_id);
                if (existing) {
                  navigation.navigate('ChatThread', { threadId: existing.id });
                } else {
                  const ownerParticipant: ThreadParticipant = {
                    id: item.owner_id,
                    name: ownerName,
                    handle: ownerName.toLowerCase().replace(/\s+/g, ''),
                    initials: ownerInitials,
                    avatarColor: '#F0EDE0',
                  };
                  navigation.navigate('ChatThread', { pendingItem: item, pendingOtherUser: ownerParticipant });
                }
              }}
            >
              <Ionicons name="chatbubble-outline" size={15} color={theme.colors.ink} />
              <Text style={styles.messageBtnText}>MESSAGE</Text>
            </Pressable>
            <Pressable style={styles.requestBtn} onPress={() => navigation.navigate('DatePicker', { item })}>
              <Text style={styles.requestBtnText}>REQUEST</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { flex: 1 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
  },
  backBtn: { flex: 1 },
  backText: {
    fontFamily: theme.fonts.barlowBold, fontSize: 11,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingHorizontal: 12, paddingVertical: 5,
  },
  editBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 1.5,
  },

  photoContainer: {
    width: '100%', aspectRatio: 3 / 4,
    backgroundColor: theme.colors.ivoryMid, position: 'relative', overflow: 'hidden',
  },
  photoPlaceholder: { flex: 1, backgroundColor: theme.colors.ivoryMid },
  tagWrapper: { position: 'absolute', top: 12, left: 12 },
  counterBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(20,18,12,0.55)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  counterText: { fontFamily: theme.fonts.interSemiBold, fontSize: 11, color: theme.colors.ivory, letterSpacing: 0.3 },
  arrowBtn: {
    position: 'absolute', top: '50%', marginTop: -18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(20,18,12,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  arrowLeft:  { left: 12 },
  arrowRight: { right: 12 },
  dotsRow: { position: 'absolute', bottom: 12, flexDirection: 'row', alignSelf: 'center', gap: 5 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(253,251,244,0.45)' },
  dotActive: { backgroundColor: theme.colors.ivory, width: 16, borderRadius: 3 },

  content: { padding: theme.spacing.md },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 22,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 1.5,
  },
  heartBtn: { alignItems: 'center', paddingTop: 2 },
  likesCount: {
    fontFamily: theme.fonts.interRegular, fontSize: 11,
    color: theme.colors.muted, marginTop: 2,
  },
  likesCountActive: { color: '#CC2D2D' },
  lenderText: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.muted, marginBottom: 14 },
  divider: { height: 1, backgroundColor: theme.colors.ivoryMid, marginVertical: 14 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  price: { fontFamily: theme.fonts.interSemiBold, fontSize: 18, color: theme.colors.ink },
  sizeBadge: { borderWidth: 1, borderColor: theme.colors.ink, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  sizeBadgeText: { fontFamily: theme.fonts.interSemiBold, fontSize: 11, color: theme.colors.ink },
  location: { fontFamily: theme.fonts.interLight, fontSize: 12, color: theme.colors.muted, marginTop: 2 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, marginBottom: 14,
    borderWidth: 1, borderColor: theme.colors.ivoryMid, borderRadius: 2, paddingHorizontal: 12,
  },
  actionRowText: { flex: 1, fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },

  descriptionLabel: {
    fontFamily: theme.fonts.barlowBold, fontSize: 10,
    color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag: {
    borderWidth: 1, borderColor: theme.colors.ink, borderRadius: 2,
    paddingHorizontal: 9, paddingVertical: 5, backgroundColor: theme.colors.ivoryDark,
  },
  tagText: { fontFamily: theme.fonts.barlowBold, fontSize: 10, color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.ink, lineHeight: 20 },

  lenderCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lenderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.yellow, alignItems: 'center', justifyContent: 'center' },
  lenderAvatarText: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink },
  lenderInfo: { flex: 1 },
  lenderName: { fontFamily: theme.fonts.interSemiBold, fontSize: 13, color: theme.colors.ink },
  lenderRating: { fontFamily: theme.fonts.interRegular, fontSize: 12, color: theme.colors.muted, marginTop: 1 },

  noComments: { fontFamily: theme.fonts.interLight, fontSize: 13, color: theme.colors.muted, marginBottom: 16 },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: theme.colors.ivory,
  },
  ctaDivider: { height: 1, backgroundColor: theme.colors.ivoryMid, marginVertical: 8 },
  commentInput: {
    flex: 1,
    fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.ink,
    paddingVertical: 6,
  },
  sendBtn: {},
  sendBtnDisabled: { opacity: 0.4 },

  ctaRow: {
    flexDirection: 'row', gap: 10,
  },
  messageBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 52, borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: 2, backgroundColor: theme.colors.ivory,
  },
  messageBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    color: theme.colors.ink, textTransform: 'uppercase', letterSpacing: 1,
  },
  requestBtn: {
    flex: 2, height: 52, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.yellow, borderWidth: 1.5,
    borderColor: theme.colors.yellowBorder, borderRadius: 2,
  },
  requestBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 14,
    color: theme.colors.yellowText, textTransform: 'uppercase', letterSpacing: 1,
  },

  ctaContainer: {
    backgroundColor: theme.colors.ivory, paddingHorizontal: theme.spacing.md,
    paddingTop: 8, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid,
  },
  ctaButton: {
    backgroundColor: theme.colors.yellow, borderWidth: 1.5, borderColor: theme.colors.yellowBorder,
    borderRadius: 2, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 14,
    color: theme.colors.yellowText, textTransform: 'uppercase', letterSpacing: 1,
  },
  ctaManage: {
    backgroundColor: theme.colors.ink, borderRadius: 2,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaManageText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 14,
    color: theme.colors.ivory, textTransform: 'uppercase', letterSpacing: 1,
  },
});

const commentStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: theme.colors.ivoryDark,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: theme.fonts.interSemiBold, fontSize: 10, color: theme.colors.ink },
  bubble: { flex: 1 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 3 },
  authorName: { fontFamily: theme.fonts.interSemiBold, fontSize: 12, color: theme.colors.ink },
  timestamp:  { fontFamily: theme.fonts.interLight, fontSize: 10, color: theme.colors.muted },
  commentText: { fontFamily: theme.fonts.interRegular, fontSize: 13, color: theme.colors.ink, lineHeight: 18 },
});
