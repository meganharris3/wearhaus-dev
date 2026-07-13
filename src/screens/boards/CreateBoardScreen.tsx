import React, { useState } from 'react';
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
import VisibilityToggle from '../../components/VisibilityToggle';
import { useBoards } from '../../context/BoardsContext';
import { useAuth } from '../../context/AuthContext';
import type { AppStackParamList } from '../../navigation/AppStack';
import type { CoverStyle, VisibilityMode } from '../../types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'CreateBoard'>;

const COVER_STYLES: { key: CoverStyle; label: string }[] = [
  { key: 'mosaic', label: 'Mosaic' },
  { key: 'single', label: 'Single' },
  { key: 'stack',  label: 'Stack'  },
];

function CoverPreview({ coverStyle, active }: { coverStyle: CoverStyle; active: boolean }) {
  const cell = { backgroundColor: active ? '#C8C820' : '#E2DED0' };
  const dim = { width: '100%' as const, height: 44 };

  if (coverStyle === 'single') {
    return <View style={[dim, { backgroundColor: active ? '#FFFFAD' : '#F0EDE0' }]} />;
  }
  if (coverStyle === 'stack') {
    return (
      <View style={[dim, { overflow: 'hidden' }]}>
        <View style={{ flex: 1, backgroundColor: active ? '#FFFFAD' : '#F0EDE0', borderBottomWidth: 1, borderBottomColor: active ? '#C8C820' : '#E2DED0' }} />
        <View style={{ flex: 1, backgroundColor: active ? '#C8C820' : '#E2DED0' }} />
      </View>
    );
  }
  // mosaic
  return (
    <View style={[dim, { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' }]}>
      {[0,1,2,3].map((i) => (
        <View key={i} style={{
          width: '50%', height: '50%',
          backgroundColor: i % 2 === 0 ? (active ? '#FFFFAD' : '#F0EDE0') : (active ? '#C8C820' : '#E2DED0'),
          borderRightWidth: i % 2 === 0 ? 0.5 : 0,
          borderBottomWidth: i < 2 ? 0.5 : 0,
          borderColor: active ? '#C8C820' : '#E2DED0',
        }} />
      ))}
    </View>
  );
}

export default function CreateBoardScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { boards, addBoard, updateBoard, deleteBoard } = useBoards();
  const { user } = useAuth();

  const editId = route.params?.boardId;
  const existingBoard = editId ? boards.find((b) => b.id === editId) : undefined;
  const isEdit = !!existingBoard;

  const [boardName,   setBoardName]   = useState(existingBoard?.name        ?? '');
  const [visibility,  setVisibility]  = useState<VisibilityMode>(existingBoard?.visibility  ?? 'public');
  const [coverStyle,  setCoverStyle]  = useState<CoverStyle>(existingBoard?.coverStyle  ?? 'mosaic');

  function handleSave() {
    const name = boardName.trim();
    if (!name) {
      Alert.alert('Name required', 'Give your board a name.');
      return;
    }

    if (isEdit && existingBoard) {
      updateBoard({ ...existingBoard, name, visibility, coverStyle });
      navigation.goBack();
    } else {
      const newBoard = {
        id: `board_${Date.now()}`,
        name,
        visibility,
        coverStyle,
        itemIds: [],
        createdAt: new Date().toISOString(),
        ownerId: user?.id ?? 'me',
      };
      addBoard(newBoard);
      navigation.replace('BoardDetail', { boardId: newBoard.id });
    }
  }

  function handleDelete() {
    if (!editId) return;
    Alert.alert(
      'Delete board?',
      `"${existingBoard?.name}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => { deleteBoard(editId); navigation.goBack(); },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={() => navigation.goBack()} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.title}>{isEdit ? 'EDIT BOARD' : 'NEW BOARD'}</Text>
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
            {/* Name */}
            <Text style={styles.fieldLabel}>BOARD NAME</Text>
            <TextInput
              value={boardName}
              onChangeText={setBoardName}
              placeholder="e.g. Festival Fits"
              placeholderTextColor={theme.colors.muted}
              autoFocus={!isEdit}
              style={styles.nameInput}
            />

            {/* Visibility */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>VISIBILITY</Text>
            <VisibilityToggle value={visibility} onChange={setVisibility} />

            {/* Cover style */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>COVER STYLE</Text>
            <View style={styles.coverRow}>
              {COVER_STYLES.map((opt) => {
                const active = coverStyle === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setCoverStyle(opt.key)}
                    style={[styles.coverOption, active && styles.coverOptionActive]}
                  >
                    <CoverPreview coverStyle={opt.key} active={active} />
                    <Text style={[styles.coverLabel, active && styles.coverLabelActive]}>
                      {opt.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Create / Save */}
            <Pressable style={styles.createBtn} onPress={handleSave}>
              <Text style={styles.createBtnText}>
                {isEdit ? 'SAVE CHANGES' : 'CREATE BOARD'}
              </Text>
            </Pressable>

            {/* Delete (edit only) */}
            {isEdit && (
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={14} color="#C0392B" />
                <Text style={styles.deleteBtnText}>DELETE BOARD</Text>
              </Pressable>
            )}
          </ScrollView>
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
  dismiss: {
    flex: 1,
  },
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
    backgroundColor: '#E2DED0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.ivoryMid,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 16, letterSpacing: 1.5,
    color: theme.colors.ink,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 32 },

  fieldLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 1.5,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: theme.fonts.interLight,
    fontSize: 14, color: theme.colors.ink,
  },

  coverRow: { flexDirection: 'row', gap: 8 },
  coverOption: {
    flex: 1,
    borderWidth: 1.5, borderColor: '#E2DED0',
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
  },
  coverOptionActive: { borderWidth: 2, borderColor: '#C8C820' },
  coverLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8, letterSpacing: 1,
    textAlign: 'center',
    color: '#7A7762',
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  coverLabelActive: {
    color: '#3A3A00',
    backgroundColor: '#FFFFAD',
  },

  createBtn: {
    marginTop: 24,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13, letterSpacing: 1.5,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
  },

  deleteBtn: {
    marginTop: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#C0392B',
    borderRadius: theme.borderRadius, backgroundColor: '#FFF0EE',
  },
  deleteBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 10, letterSpacing: 1, color: '#C0392B',
  },
});
