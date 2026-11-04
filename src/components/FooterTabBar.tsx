import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../navigation/AppStack';
import {
  TAB_NAMES, TAB_ICONS, TAB_ACTIVE_COLOR, TAB_INACTIVE_COLOR, tabBarStyle, tabBarLabelStyle,
  type TabName,
} from '../navigation/tabBarConfig';

/**
 * The app's tab bar, for stack screens that cover the real one. Tapping a tab jumps back to
 * the tabs with that tab selected. `active` highlights the tab the screen belongs under.
 */
export default function FooterTabBar({ active }: { active?: TabName }) {
  const nav = useNavigation<NavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabBarStyle(insets.bottom), styles.row]} accessibilityRole="tablist">
      {TAB_NAMES.map((name) => {
        const focused = name === active;
        const color = focused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;
        const [filled, outline] = TAB_ICONS[name];
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={name}
            style={styles.tab}
            onPress={() => nav.navigate('Tabs', { screen: name })}
          >
            <Ionicons name={focused ? filled : outline} size={24} color={color} />
            <Text style={[tabBarLabelStyle, styles.label, { color }]}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 2 },
});
