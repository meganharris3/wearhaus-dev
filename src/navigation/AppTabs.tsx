import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import HomeScreen from '../screens/home/HomeScreen';
import ClosetScreen from '../screens/closet/ClosetScreen';
import HausesScreen from '../screens/hauses/HausesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import { useMessages } from '../context/MessagesContext';

export type AppTabsParamList = {
  Home: undefined;
  Closet: undefined;
  Messages: undefined;
  Hauses: undefined;
  Profile: undefined;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IconName, IconName]> = {
  Home:    ['home',          'home-outline'],
  Closet:  ['shirt',         'shirt-outline'],
  Hauses:  ['people',        'people-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

function MessagesTabIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
  const { unreadCount } = useMessages();
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute', top: 0, right: -2,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: '#C8C820',
        }} />
      )}
    </View>
  );
}

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
      <Tab.Screen name="Closet"  component={ClosetScreen} />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: (props) => <MessagesTabIcon {...props} /> }}
      />
      <Tab.Screen name="Hauses"   component={HausesScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}
