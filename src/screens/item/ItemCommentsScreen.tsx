import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import CommentThread from '../../components/CommentThread';
import { useInteractions } from '../../context/InteractionsContext';
import type { AppStackParamList } from '../../navigation/AppStack';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'ItemComments'>;

export default function ItemCommentsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { item } = route.params;
  const { getComments, loadComments, addComment } = useInteractions();

  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const comments = getComments(item.id);

  useEffect(() => {
    loadComments(item.id).catch((e) => console.warn('Failed to load comments', e));
  }, [item.id, loadComments]);

  async function handleSend() {
    const text = commentText.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setCommentText('');
    try {
      await addComment(item.id, text);
    } catch (e) {
      setCommentText(text); // give the text back so nothing is lost
      Alert.alert('Could not post comment', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleReply(parentCommentId: string, text: string) {
    await addComment(item.id, text, parentCommentId);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={() => navigation.goBack()} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>COMMENTS{comments.length > 0 ? ` · ${comments.length}` : ''}</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </View>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CommentThread comments={comments} onReply={handleReply} />
          </ScrollView>

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment…"
              placeholderTextColor={theme.colors.muted}
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!isSending}
            />
            <Pressable onPress={handleSend} disabled={!commentText.trim() || isSending} hitSlop={8}>
              <Ionicons
                name="arrow-up-circle"
                size={28}
                color={commentText.trim() ? theme.colors.ink : theme.colors.ivoryMid}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: theme.colors.ivory,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 2,
    borderColor: theme.colors.ink,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 3,
    backgroundColor: theme.colors.ivoryMid,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11, letterSpacing: 1.5,
    color: theme.colors.muted,
  },
  itemName: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 15,
    color: theme.colors.ink,
    marginTop: 2,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 18, paddingBottom: 8 },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: theme.fonts.interRegular,
    fontSize: 13, color: theme.colors.ink,
  },
});
