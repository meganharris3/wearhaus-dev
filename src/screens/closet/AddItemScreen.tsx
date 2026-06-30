import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { AppStackParamList } from '../../navigation/AppStack';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../theme';
import Chip from '../../components/Chip';
import Toggle from '../../components/Toggle';
import { useCloset } from '../../context/ClosetContext';
import { useAuth } from '../../context/AuthContext';
import { useHauses } from '../../context/HausesContext';
import { uploadPhotos } from '../../services/storageService';
import VisibilityToggle from '../../components/VisibilityToggle';
import type { VisibilityMode } from '../../types';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const CATEGORIES  = ['Tops', 'Outerwear', 'Dresses', 'Bottoms', 'Accessories', 'Shoes'];
const SIZES       = ['XS', 'S', 'M', 'L', 'XL', 'One Size'];
const CONDITIONS  = ['Like New', 'Good', 'Fair'];
const OCCASIONS   = ['Formal', 'Date Night', 'Festival', 'Casual', 'Going Out'];
const DURATIONS   = ['1 day', '2 days', '3 days', '5 days', '1 week'];
const PICKUPS     = ['Campus Pickup', 'Ship', 'Both'];


export default function AddItemScreen() {
  const navigation = useNavigation();
  const { addItem, updateItem } = useCloset();
  const { user } = useAuth();
  const { hauses } = useHauses();
  const route = useRoute<RouteProp<AppStackParamList, 'AddItem'>>();
  const existingItem = route.params?.item;
  const isEditMode = !!existingItem;

  const [photos, setPhotos]           = useState<(string | null)[]>(() => {
    const base: (string | null)[] = Array(6).fill(null);
    if (existingItem?.photo_urls?.length) {
      existingItem.photo_urls.slice(0, 6).forEach((url, i) => { base[i] = url; });
    } else if (existingItem?.photo_url) {
      base[0] = existingItem.photo_url;
    }
    return base;
  });
  const [name, setName]               = useState(() => existingItem?.name ?? '');
  const [description, setDescription] = useState(() => existingItem?.description ?? '');
  const [category, setCategory]       = useState<string | null>(() => existingItem?.category ?? null);
  const [size, setSize]               = useState<string | null>(() => existingItem?.size_label ?? null);
  const [condition, setCondition]     = useState<string | null>(null);
  const [occasionTags, setOccasionTags] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    if (!existingItem?.category) return [];
    return CATEGORIES.includes(existingItem.category) ? [] : [existingItem.category];
  });
  const [customOccasions, setCustomOccasions] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [occasionInput, setOccasionInput] = useState('');
  const [listForRental, setListForRental] = useState(
    () => !existingItem || existingItem.price_per_day > 0,
  );
  const [pricePerDay, setPricePerDay] = useState(
    () => existingItem && existingItem.price_per_day > 0
      ? (existingItem.price_per_day / 100).toFixed(2)
      : '',
  );
  const [maxDuration, setMaxDuration] = useState('3 days');
  const [pickup, setPickup]           = useState('Campus Pickup');
  const [hausSharing, setHausSharing] = useState<Record<string, boolean>>(() => {
    const existing = existingItem?.haus_visibility ?? {};
    return Object.fromEntries(hauses.map((h) => [h.id, existing[h.id] ?? false]));
  });
  const [visibility, setVisibility]   = useState<VisibilityMode>(
    () => (existingItem as (typeof existingItem & { visibility?: VisibilityMode }))?.visibility ?? 'public',
  );
  const [nameError, setNameError]     = useState(false);
  const [photoError, setPhotoError]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function pickImage(slot: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: slot === 0 ? [3, 4] : [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const next = [...photos];
      next[slot] = result.assets[0].uri;
      setPhotos(next);
      setPhotoError(false);
    }
  }

  function toggleRental() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setListForRental((v) => !v);
  }

  function toggleOccasion(tag: string) {
    setOccasionTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function addCustomCategory() {
    const tag = categoryInput.trim();
    if (!tag) return;
    const all = [...CATEGORIES, ...customCategories];
    if (all.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setCategory(tag);
      setCategoryInput('');
      return;
    }
    setCustomCategories((prev) => [...prev, tag]);
    setCategory(tag);
    setCategoryInput('');
  }

  function removeCustomCategory(tag: string) {
    setCustomCategories((prev) => prev.filter((t) => t !== tag));
    if (category === tag) setCategory(null);
  }

  function addCustomOccasion() {
    const tag = occasionInput.trim();
    if (!tag) return;
    const all = [...OCCASIONS, ...customOccasions];
    if (all.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      if (!occasionTags.includes(tag)) {
        setOccasionTags((prev) => [...prev, tag]);
      }
      setOccasionInput('');
      return;
    }
    setCustomOccasions((prev) => [...prev, tag]);
    setOccasionTags((prev) => [...prev, tag]);
    setOccasionInput('');
  }

  function removeCustomOccasion(tag: string) {
    setCustomOccasions((prev) => prev.filter((t) => t !== tag));
    setOccasionTags((prev) => prev.filter((t) => t !== tag));
  }

  function validate(): boolean {
    let ok = true;
    if (!name.trim()) { setNameError(true); ok = false; }
    if (!photos[0])   { setPhotoError(true); ok = false; }
    return ok;
  }

  function buildItem(status: 'available' | 'draft', allUrls: string[]) {
    return {
      id: String(Date.now()),
      owner_id: 'me',
      name: name.trim(),
      description,
      photo_url:       allUrls[0],
      photo_urls:      allUrls,
      category:        category ?? 'other',
      size_label:      size ?? '—',
      price_per_day:   listForRental && pricePerDay ? Math.round(parseFloat(pricePerDay) * 100) : 0,
      status,
      location_label:  'My Campus',
      visibility,
      haus_visibility: hausSharing,
      owner: { id: 'me', display_name: 'You' },
    } as const;
  }

  async function saveItem(status: 'available' | 'draft') {
    setIsUploading(true);
    try {
      // Upload any local URIs; remote https:// URLs pass through unchanged
      let allUrls: string[];
      if (user?.id) {
        const uploaded = await uploadPhotos(photos, user.id);
        allUrls = uploaded.filter(Boolean) as string[];
      } else {
        allUrls = photos.filter(Boolean) as string[];
      }

      if (isEditMode && existingItem) {
        await updateItem({
          ...existingItem,
          name:            name.trim(),
          description,
          photo_url:       allUrls[0],
          photo_urls:      allUrls,
          category:        category ?? existingItem.category ?? 'other',
          size_label:      size ?? existingItem.size_label ?? '—',
          price_per_day:   listForRental && pricePerDay
            ? Math.round(parseFloat(pricePerDay) * 100)
            : 0,
          status,
          visibility,
          haus_visibility: hausSharing,
        });
      } else {
        await addItem(buildItem(status, allUrls));
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleList() {
    if (!validate()) return;
    await saveItem('available');
  }

  async function handleDraft() {
    if (!name.trim()) { setNameError(true); return; }
    await saveItem('draft');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Upload overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="small" color={theme.colors.ink} />
            <Text style={styles.uploadText}>SAVING…</Text>
          </View>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isUploading}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.topTitle}>{isEditMode ? 'EDIT ITEM' : 'ADD ITEM'}</Text>
        <Pressable onPress={handleList} style={styles.saveBtn} disabled={isUploading}>
          <Text style={styles.saveBtnText}>SAVE</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── PHOTOS ── */}
        <SectionHeader label="Photos" />

        {/* Row 1: large cover + 2 stacked thumbs */}
        <View style={styles.photosRow}>
          <Pressable
            onPress={() => pickImage(0)}
            style={[styles.primarySlot, photoError && styles.slotError]}
          >
            {photos[0] ? (
              <Image source={{ uri: photos[0] }} style={styles.primarySlotImg} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color={theme.colors.muted} />
                <Text style={styles.slotLabel}>ADD COVER{'\n'}PHOTO</Text>
              </>
            )}
          </Pressable>

          <View style={styles.secondarySlots}>
            {[1, 2].map((slot) => (
              <Pressable key={slot} onPress={() => pickImage(slot)} style={styles.secondarySlot}>
                {photos[slot] ? (
                  <Image source={{ uri: photos[slot]! }} style={styles.secondarySlotImg} />
                ) : (
                  <Ionicons name="add" size={18} color={theme.colors.ivoryMid} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Row 2: 3 equal thumbs */}
        <View style={styles.photoSecondRow}>
          {[3, 4, 5].map((slot) => (
            <Pressable key={slot} onPress={() => pickImage(slot)} style={styles.secondaryRowSlot}>
              {photos[slot] ? (
                <Image source={{ uri: photos[slot]! }} style={styles.secondaryRowSlotImg} />
              ) : (
                <Ionicons name="add" size={18} color={theme.colors.ivoryMid} />
              )}
            </Pressable>
          ))}
        </View>

        {photoError && <Text style={styles.fieldError}>Cover photo is required</Text>}
        <Text style={styles.photoCaption}>
          Add up to 6 photos. First photo is your cover.
        </Text>

        {/* ── ITEM DETAILS ── */}
        <SectionHeader label="Item Details" />

        <Text style={styles.fieldLabel}>ITEM NAME</Text>
        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          value={name}
          onChangeText={(t) => { setName(t); setNameError(false); }}
          placeholder="e.g. Oversized Blazer"
          placeholderTextColor={theme.colors.muted}
        />
        {nameError && <Text style={styles.fieldError}>Item name is required</Text>}

        <Text style={styles.fieldLabel}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe fit, material, any wear…"
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
          {customCategories.map((c) => (
            <CustomChip key={c} label={c} selected={category === c}
              onPress={() => setCategory(category === c ? null : c)}
              onRemove={() => removeCustomCategory(c)} />
          ))}
        </View>
        <AddTagInput
          value={categoryInput}
          onChangeText={setCategoryInput}
          onAdd={addCustomCategory}
          placeholder="Add custom category…"
        />

        {/* ── SIZE & CONDITION ── */}
        <SectionHeader label="Size & Condition" />

        <Text style={styles.fieldLabel}>SIZE</Text>
        <View style={styles.chipWrap}>
          {SIZES.map((s) => (
            <Chip key={s} label={s} selected={size === s} onPress={() => setSize(size === s ? null : s)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>CONDITION</Text>
        <View style={styles.chipWrap}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={c} selected={condition === c} onPress={() => setCondition(condition === c ? null : c)} />
          ))}
        </View>

        <Text style={styles.fieldLabel}>OCCASION TAGS</Text>
        <View style={styles.chipWrap}>
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} selected={occasionTags.includes(o)} onPress={() => toggleOccasion(o)} />
          ))}
          {customOccasions.map((o) => (
            <CustomChip key={o} label={o} selected={occasionTags.includes(o)}
              onPress={() => toggleOccasion(o)}
              onRemove={() => removeCustomOccasion(o)} />
          ))}
        </View>
        <AddTagInput
          value={occasionInput}
          onChangeText={setOccasionInput}
          onAdd={addCustomOccasion}
          placeholder="Add custom occasion…"
        />

        {/* ── RENTAL SETTINGS ── */}
        <SectionHeader label="Rental Settings" />

        <ToggleRow
          label="List for Rental"
          subtitle="Make this item available to borrow"
          value={listForRental}
          onToggle={toggleRental}
        />

        {listForRental && (
          <>
            <Text style={styles.fieldLabel}>PRICE / DAY</Text>
            <View style={styles.priceRow}>
              <Text style={styles.dollarPrefix}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={pricePerDay}
                onChangeText={setPricePerDay}
                placeholder="0.00"
                placeholderTextColor={theme.colors.muted}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.fieldLabel}>MAX DURATION</Text>
            <View style={styles.chipWrap}>
              {DURATIONS.map((d) => (
                <Chip key={d} label={d} selected={maxDuration === d} onPress={() => setMaxDuration(d)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>PICKUP / EXCHANGE</Text>
            <View style={styles.chipWrap}>
              {PICKUPS.map((p) => (
                <Chip key={p} label={p} selected={pickup === p} onPress={() => setPickup(p)} />
              ))}
            </View>
          </>
        )}

        {/* ── VISIBILITY ── */}
        <SectionHeader label="Visibility" />
        <View style={styles.visibilitySection}>
          <Text style={styles.visibilityCaption}>Who can see and borrow this item?</Text>
          <VisibilityToggle value={visibility} onChange={setVisibility} />

          <Text style={styles.hausShareLabel}>SHARE TO HAUSES</Text>
          {hauses.length === 0 ? (
            <Text style={styles.noHausesText}>You haven't joined any Hauses yet.</Text>
          ) : (
            hauses.map((haus) => (
              <View key={haus.id} style={styles.hausRow}>
                <View style={styles.hausAvatar}>
                  <Text style={styles.hausAvatarText}>
                    {haus.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.hausInfo}>
                  <Text style={styles.hausName}>{haus.name}</Text>
                  <Text style={styles.hausMeta}>
                    {haus.member_count} member{haus.member_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Toggle
                  value={hausSharing[haus.id] ?? false}
                  onToggle={() => setHausSharing((prev) => ({ ...prev, [haus.id]: !prev[haus.id] }))}
                />
              </View>
            ))
          )}
        </View>

        {/* ── BOTTOM CTAs ── */}
        <View style={styles.ctaStack}>
          <Pressable style={styles.ctaList} onPress={handleList} disabled={isUploading}>
            <Text style={styles.ctaListText}>{isEditMode ? 'UPDATE ITEM' : 'LIST ITEM'}</Text>
          </Pressable>
          {!isEditMode && (
            <Pressable style={styles.ctaDraft} onPress={handleDraft} disabled={isUploading}>
              <Text style={styles.ctaDraftText}>SAVE AS DRAFT</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddTagInput({
  value, onChangeText, onAdd, placeholder,
}: {
  value: string; onChangeText: (v: string) => void;
  onAdd: () => void; placeholder: string;
}) {
  return (
    <View style={addTagStyles.row}>
      <TextInput
        style={addTagStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        returnKeyType="done"
        onSubmitEditing={onAdd}
      />
      <Pressable style={addTagStyles.btn} onPress={onAdd}>
        <Ionicons name="add" size={16} color={theme.colors.ivory} />
      </Pressable>
    </View>
  );
}

function CustomChip({
  label, selected, onPress, onRemove,
}: {
  label: string; selected: boolean; onPress: () => void; onRemove: () => void;
}) {
  return (
    <View style={customChipStyles.wrap}>
      <Pressable
        onPress={onPress}
        style={[customChipStyles.chip, selected && customChipStyles.chipSelected]}
      >
        <Text style={[customChipStyles.label, selected && customChipStyles.labelSelected]}>
          {label.toUpperCase()}
        </Text>
      </Pressable>
      <Pressable onPress={onRemove} style={customChipStyles.remove} hitSlop={6}>
        <Ionicons name="close" size={9} color={selected ? theme.colors.yellowText : theme.colors.muted} />
      </Pressable>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

function ToggleRow({
  label, subtitle, value, onToggle,
}: {
  label: string; subtitle: string; value: boolean; onToggle: () => void;
}) {
  return (
    <View style={toggleRowStyles.row}>
      <View style={toggleRowStyles.text}>
        <Text style={toggleRowStyles.label}>{label}</Text>
        <Text style={toggleRowStyles.subtitle}>{subtitle}</Text>
      </View>
      <Toggle value={value} onToggle={onToggle} />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.ivoryDark,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ivoryMid,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    marginBottom: 16,
  },
  label: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 11,
    color: theme.colors.ink,
    letterSpacing: 1.5,
  },
});

const toggleRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
    marginBottom: 4,
  },
  text: { flex: 1, paddingRight: 12 },
  label: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13,
    color: theme.colors.ink,
  },
  subtitle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  backBtn: { flex: 1 },
  backText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 12,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  saveBtn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  saveBtnText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 12,
    color: theme.colors.yellowText,
    backgroundColor: theme.colors.yellow,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Photos
  photosRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: 10,
    marginBottom: 8,
  },
  primarySlot: {
    width: 110,
    height: 130,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  slotError: { borderColor: '#C0392B' },
  primarySlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  slotLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 9,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  secondarySlots: { gap: 10, justifyContent: 'flex-start' },
  photoSecondRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  secondaryRowSlot: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secondaryRowSlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  secondarySlot: {
    width: 64,
    height: 60,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivoryDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secondarySlotImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoCaption: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11,
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 16,
  },

  // Fields
  fieldLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: theme.spacing.md,
    marginBottom: 6,
  },
  fieldError: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: '#C0392B',
    paddingHorizontal: theme.spacing.md,
    marginTop: 2,
    marginBottom: 8,
  },
  input: {
    marginHorizontal: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ivory,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: theme.fonts.interRegular,
    fontSize: 13,
    color: theme.colors.ink,
    marginBottom: 16,
  },
  inputError: { borderColor: '#C0392B' },
  inputMulti: { height: 72, paddingTop: 10 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: 16,
  },
  dollarPrefix: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 14,
    color: theme.colors.ink,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },

  // Upload overlay
  uploadOverlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    backgroundColor: 'rgba(253,251,244,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.ivory,
    borderWidth: 1.5, borderColor: theme.colors.ink,
    borderRadius: 2, paddingHorizontal: 20, paddingVertical: 14,
  },
  uploadText: {
    fontFamily: theme.fonts.barlowExtraBold, fontSize: 11,
    letterSpacing: 1.5, color: theme.colors.ink,
  },

  // Visibility section
  visibilitySection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 16,
  },
  visibilityCaption: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11, color: '#7A7762',
    lineHeight: 16, marginBottom: 10,
  },
  hausShareLabel: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 9, letterSpacing: 1.8,
    textTransform: 'uppercase', color: '#7A7762',
    marginTop: 16, marginBottom: 8,
  },
  hausRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 10,
  },
  hausAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.ivoryDark,
    borderWidth: 1, borderColor: theme.colors.ivoryMid,
    alignItems: 'center', justifyContent: 'center',
  },
  hausAvatarText: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 10, color: theme.colors.muted,
  },
  hausInfo: { flex: 1 },
  hausName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 13, color: theme.colors.ink,
  },
  hausMeta: {
    fontFamily: theme.fonts.interLight,
    fontSize: 11, color: theme.colors.muted, marginTop: 1,
  },
  noHausesText: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12, color: theme.colors.muted,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    marginBottom: 8,
  },

  // CTAs
  ctaStack: {
    gap: 10,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 24,
  },
  ctaList: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaListText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ivory,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  ctaDraft: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDraftText: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 13,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});

const addTagStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.ivoryMid,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: theme.fonts.interLight,
    fontSize: 12,
    color: theme.colors.ink,
    backgroundColor: theme.colors.ivory,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const customChipStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: theme.colors.ivoryMid,
    borderRightWidth: 0,
    borderTopLeftRadius: theme.borderRadius,
    borderBottomLeftRadius: theme.borderRadius,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: theme.colors.yellow,
    borderColor: theme.colors.yellowBorder,
  },
  label: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelSelected: {
    color: theme.colors.yellowText,
  },
  remove: {
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: theme.colors.ivoryMid,
    borderTopRightRadius: theme.borderRadius,
    borderBottomRightRadius: theme.borderRadius,
    paddingHorizontal: 5,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});
