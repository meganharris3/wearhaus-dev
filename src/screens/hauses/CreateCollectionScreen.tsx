import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useHausCollections } from '../../context/HausCollectionsContext';
import type { AppStackParamList } from '../../navigation/AppStack';

type Nav   = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'CreateCollection'>;

export default function CreateCollectionScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { hausId } = route.params;

  const { createHausCollection } = useHausCollections();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      const collection = await createHausCollection(hausId, trimmed);
      // Dismiss modal then push detail
      navigation.goBack();
      navigation.navigate('CollectionDetail', { collectionId: collection.id });
    } catch {
      setIsCreating(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Handle bar */}
      <View style={s.handleWrap}>
        <View style={s.handle} />
      </View>

      {/* Top row */}
      <View style={s.topBar}>
        <Text style={s.title}>NEW COLLECTION</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={20} color={theme.colors.ink} />
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        <Text style={s.label}>Collection Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Gameday, Interview, Dresses"
          placeholderTextColor={theme.colors.muted}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          style={s.input}
        />
        <Text style={s.hint}>Members can browse and add their shared pieces to any collection.</Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || isCreating}
          style={[s.createBtn, (!name.trim() || isCreating) && s.createBtnDisabled]}
        >
          <Text style={s.createBtnText}>{isCreating ? 'Creating…' : 'Create Collection'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },

  handleWrap: { alignItems: 'center', paddingTop: 10 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.ivoryMid,
  },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1.5, borderBottomColor: theme.colors.ink,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 16,
    letterSpacing: 1, color: theme.colors.ink,
  },

  body: {
    paddingHorizontal: 18, paddingTop: 24,
  },
  label: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 10,
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: theme.colors.ink, marginBottom: 8,
  },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: theme.fonts.interRegular, fontSize: 15,
    color: theme.colors.ink, marginBottom: 10,
  },
  hint: {
    fontFamily: theme.fonts.interLight, fontSize: 11,
    color: theme.colors.muted, lineHeight: 17,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18,
    borderTopWidth: 1, borderTopColor: theme.colors.ivoryMid,
    backgroundColor: theme.colors.ivory,
  },
  createBtn: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius, paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 13,
    letterSpacing: 1, textTransform: 'uppercase', color: theme.colors.ivory,
  },
});
