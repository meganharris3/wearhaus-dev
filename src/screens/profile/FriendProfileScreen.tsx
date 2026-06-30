import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import type { AppStackParamList } from '../../navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'FriendProfile'>;

export default function FriendProfileScreen({ route }: Props) {
  const navigation = useNavigation();
  const { name } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backLabel}>← BACK</Text>
        </Pressable>
        <Text style={styles.title}>{name.toUpperCase()}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.comingSoon}>COMING SOON</Text>
        <Text style={styles.sub}>Full friend profile view in a future sprint.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.ivory },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  backBtn: { width: 60 },
  backLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 11, color: theme.colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  title: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 15, color: theme.colors.ink,
    textTransform: 'uppercase', letterSpacing: 2,
  },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  comingSoon: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 14, color: theme.colors.muted,
    textTransform: 'uppercase', letterSpacing: 2,
  },
  sub: {
    fontFamily: theme.fonts.interLight,
    fontSize: 12, color: theme.colors.muted,
  },
});
