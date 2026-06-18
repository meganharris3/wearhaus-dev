import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const MOCK_PROFILE = {
  display_name: 'Maya Chen',
  items_listed: 4,
  rentals_completed: 12,
  rating: 4.9,
};

const SETTINGS_ITEMS = [
  'Edit Profile',
  'Notifications',
  'Payment Methods',
  'Shipping Addresses',
  'Privacy',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

export default function ProfileScreen() {
  const initials = getInitials(MOCK_PROFILE.display_name);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Page header */}
        <Text style={styles.pageHeader}>PROFILE</Text>

        {/* Dark banner */}
        <View style={styles.banner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.bannerName}>{MOCK_PROFILE.display_name}</Text>
          <Text style={styles.bannerHandle}>@maya.chen</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{MOCK_PROFILE.items_listed}</Text>
            <Text style={styles.statLabel}>ITEMS LISTED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={[styles.statNumber, styles.statNumberAccent]}>
              {MOCK_PROFILE.rentals_completed}
            </Text>
            <Text style={styles.statLabel}>RENTALS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{MOCK_PROFILE.rating}</Text>
            <Text style={styles.statLabel}>RATING</Text>
          </View>
        </View>

        {/* Quick actions grid */}
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickActionCard}>
            <Text style={styles.quickActionTitle}>MY CLOSET</Text>
            <Text style={styles.quickActionSub}>View your listings</Text>
          </Pressable>
          <Pressable style={styles.quickActionCard}>
            <Text style={styles.quickActionTitle}>BORROWS</Text>
            <Text style={styles.quickActionSub}>Active borrows: 0</Text>
          </Pressable>
        </View>

        {/* Settings section label */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>

        {/* Settings list */}
        <View>
          {SETTINGS_ITEMS.map((item, index) => (
            <Pressable key={item} style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>{item}</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={theme.colors.muted}
              />
            </Pressable>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
  },

  // Page header
  pageHeader: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 20,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 0,
  },

  // Dark banner
  banner: {
    backgroundColor: theme.colors.ink,
    padding: 24,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: theme.colors.yellow,
    backgroundColor: '#2A2820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 20,
    color: theme.colors.ivory,
  },
  bannerName: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 16,
    color: theme.colors.ivory,
    marginTop: 8,
  },
  bannerHandle: {
    fontFamily: theme.fonts.interLight,
    fontSize: 13,
    color: theme.colors.yellow,
    marginTop: 2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.ivory,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.ink,
    paddingVertical: 16,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: theme.colors.ivoryMid,
  },
  statNumber: {
    fontFamily: theme.fonts.interSemiBold,
    fontSize: 22,
    color: theme.colors.ink,
  },
  statNumberAccent: {
    color: theme.colors.yellowBorder,
  },
  statLabel: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  quickActionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: theme.borderRadius,
    padding: 16,
    backgroundColor: theme.colors.ivory,
  },
  quickActionTitle: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 13,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionSub: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4,
  },

  // Settings section
  sectionLabel: {
    fontFamily: theme.fonts.barlowBold,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 20,
    paddingBottom: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ivoryMid,
  },
  settingsLabel: {
    fontFamily: theme.fonts.interRegular,
    fontSize: 14,
    color: theme.colors.ink,
  },
});
