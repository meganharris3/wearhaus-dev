import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/home/ExploreScreen';
import ClosetScreen from '../screens/closet/ClosetScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import {
  TAB_ICONS, TAB_ACTIVE_COLOR, TAB_INACTIVE_COLOR, tabBarStyle, tabBarLabelStyle,
  type TabName,
} from './tabBarConfig';

export type AppTabsParamList = {
  Home: undefined;
  Explore: { campusId?: string } | undefined;
  Closet: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: tabBarStyle(insets.bottom),
        tabBarLabelStyle,
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as TabName];
          if (!icons) return null;
          const [filled, outline] = icons;
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Closet"  component={ClosetScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
