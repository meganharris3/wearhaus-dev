import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/home/ExploreScreen';
import ClosetScreen from '../screens/closet/ClosetScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

export type AppTabsParamList = {
  Home: undefined;
  Explore: undefined;
  Closet: undefined;
  Profile: undefined;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IconName, IconName]> = {
  Home:    ['home',          'home-outline'],
  Explore: ['compass',       'compass-outline'],
  Closet:  ['shirt',         'shirt-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};


const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.ivory,
          borderTopColor: theme.colors.ivoryMid,
          borderTopWidth: 1.5,
          height: 88,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.interRegular,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = ICONS[route.name];
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
