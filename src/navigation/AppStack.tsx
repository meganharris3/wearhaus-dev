import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import ItemDetailScreen from '../screens/item/ItemDetailScreen';
import AvailabilityScreen from '../screens/item/AvailabilityScreen';
import DatePickerScreen from '../screens/item/DatePickerScreen';
import AddItemScreen from '../screens/closet/AddItemScreen';
import RequestsScreen from '../screens/closet/RequestsScreen';
import CreateHausScreen from '../screens/hauses/CreateHausScreen';
import HausDetailScreen from '../screens/hauses/HausDetailScreen';
import FriendsScreen from '../screens/profile/FriendsScreen';
import FriendProfileScreen from '../screens/profile/FriendProfileScreen';
import ChatThreadScreen from '../screens/messages/ChatThreadScreen';
import MakeOfferScreen from '../screens/messages/MakeOfferScreen';
import { RequestsProvider } from '../context/RequestsContext';
import { HausesProvider } from '../context/HausesContext';
import { ClosetProvider } from '../context/ClosetContext';
import { FriendsProvider } from '../context/FriendsContext';
import { MessagesProvider } from '../context/MessagesContext';
import type { Item, Haus } from '../types';

export type AppStackParamList = {
  Tabs: undefined;
  ItemDetail: { item: Item };
  Availability: { item: Item };
  DatePicker: { item: Item };
  AddItem: { item?: Item } | undefined;
  Requests: undefined;
  CreateHaus: undefined;
  HausDetail: { haus: Haus };
  Friends: undefined;
  FriendProfile: { userId: string; name: string };
  ChatThread: { threadId: string };
  MakeOffer: { threadId: string; pricePerDay: number };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <MessagesProvider>
    <FriendsProvider>
    <ClosetProvider>
    <HausesProvider>
      <RequestsProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs"          component={AppTabs} />
          <Stack.Screen name="ItemDetail"    component={ItemDetailScreen} />
          <Stack.Screen name="Availability"  component={AvailabilityScreen} />
          <Stack.Screen name="DatePicker"    component={DatePickerScreen} />
          <Stack.Screen name="AddItem"       component={AddItemScreen} />
          <Stack.Screen name="Requests"      component={RequestsScreen} />
          <Stack.Screen name="CreateHaus"    component={CreateHausScreen} />
          <Stack.Screen name="HausDetail"    component={HausDetailScreen} />
          <Stack.Screen name="Friends"       component={FriendsScreen} />
          <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
          <Stack.Screen name="ChatThread"    component={ChatThreadScreen} />
          <Stack.Screen name="MakeOffer"     component={MakeOfferScreen} />
        </Stack.Navigator>
      </RequestsProvider>
    </HausesProvider>
    </ClosetProvider>
    </FriendsProvider>
    </MessagesProvider>
  );
}
