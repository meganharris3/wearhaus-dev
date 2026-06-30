import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../theme';
import { useRequests } from '../context/RequestsContext';
import type { AppStackParamList } from '../navigation/AppStack';

export default function NotificationBell({ color }: { color?: string } = {}) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { pendingCount } = useRequests();
  const iconColor   = color ?? theme.colors.ink;
  const borderColor = color ?? theme.colors.ink;

  return (
    <Pressable
      onPress={() => navigation.navigate('Requests')}
      style={[styles.btn, { borderColor }]}
      hitSlop={6}
    >
      <Ionicons name="notifications-outline" size={18} color={iconColor} />
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38, height: 38,
    borderWidth: 2,
    borderRadius: theme.borderRadius,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: theme.colors.yellow,
    borderWidth: 2, borderColor: theme.colors.ivory,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: {
    fontFamily: theme.fonts.barlowExtraBold,
    fontSize: 8, color: theme.colors.yellowText,
  },
});
