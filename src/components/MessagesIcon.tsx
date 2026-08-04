import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { theme } from '../theme';
import { useMessages } from '../context/MessagesContext';
import type { AppStackParamList } from '../navigation/AppStack';

export default function MessagesIcon({ color }: { color?: string } = {}) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { unreadCount } = useMessages();
  const iconColor   = color ?? theme.colors.ink;
  const borderColor = color ?? theme.colors.ink;

  return (
    <Pressable
      onPress={() => navigation.navigate('Messages')}
      style={[styles.btn, { borderColor }]}
      hitSlop={6}
    >
      <Ionicons name="chatbubbles-outline" size={18} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38, height: 38,
    borderWidth: 1,
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
