import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import ItemDetailScreen from '../screens/item/ItemDetailScreen';
import type { Item } from '../types';

export type AppStackParamList = {
  Tabs: undefined;
  ItemDetail: { item: Item };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"       component={AppTabs} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
    </Stack.Navigator>
  );
}
