import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import ItemDetailScreen from '../screens/item/ItemDetailScreen';
import AvailabilityScreen from '../screens/item/AvailabilityScreen';
import DatePickerScreen from '../screens/item/DatePickerScreen';
import AddItemScreen from '../screens/closet/AddItemScreen';
import RequestsScreen from '../screens/closet/RequestsScreen';
import HausesScreen from '../screens/hauses/HausesScreen';
import CreateHausScreen from '../screens/hauses/CreateHausScreen';
import HausDetailScreen from '../screens/hauses/HausDetailScreen';
import BoardDetailScreen from '../screens/boards/BoardDetailScreen';
import CreateBoardScreen from '../screens/boards/CreateBoardScreen';
import AddItemsToBoardScreen from '../screens/boards/AddItemsToBoardScreen';
import FriendsScreen from '../screens/profile/FriendsScreen';
import { UserProfileScreen } from '../screens/profile/ProfileScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatThreadScreen from '../screens/messages/ChatThreadScreen';
import MakeOfferScreen from '../screens/messages/MakeOfferScreen';
import BorrowsDashboardScreen from '../screens/borrows/BorrowsDashboardScreen';
import ExchangeDetailScreen from '../screens/borrows/ExchangeDetailScreen';
import CollectionDetailScreen from '../screens/hauses/CollectionDetailScreen';
import CreateCollectionScreen from '../screens/hauses/CreateCollectionScreen';
import AddItemsToCollectionScreen from '../screens/hauses/AddItemsToCollectionScreen';
import { RequestsProvider } from '../context/RequestsContext';
import { HausesProvider } from '../context/HausesContext';
import { HausCollectionsProvider } from '../context/HausCollectionsContext';
import { ClosetProvider } from '../context/ClosetContext';
import { BoardsProvider } from '../context/BoardsContext';
import { FriendsProvider } from '../context/FriendsContext';
import { MessagesProvider } from '../context/MessagesContext';
import { InteractionsProvider } from '../context/InteractionsContext';
import { BorrowsProvider } from '../context/BorrowsContext';
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
  CollectionDetail: { collectionId: string };
  CreateCollection: { hausId: string };
  AddItemsToCollection: { collectionId: string };
  BoardDetail: { boardId: string };
  CreateBoard: { boardId?: string } | undefined;
  AddItemsToBoard: { boardId: string };
  Hauses: undefined;
  Friends: undefined;
  FriendProfile: { userId: string };
  Messages: undefined;
  BorrowsDashboard: undefined;
  ExchangeDetail: { exchangeId: string; mode: 'borrowing' | 'lending' };
  ChatThread:
    | { threadId: string; pendingItem?: undefined; pendingOtherUser?: undefined }
    | { threadId?: undefined; pendingOtherUser: import('../types').ThreadParticipant; pendingItem?: import('../types').Item };
  MakeOffer: { threadId: string; pricePerDay: number };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  return (
    <BorrowsProvider>
  <InteractionsProvider>
    <MessagesProvider>
    <FriendsProvider>
    <ClosetProvider>
    <BoardsProvider>
    <HausesProvider>
    <HausCollectionsProvider>
      <RequestsProvider>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="Tabs"             component={AppTabs} />
          <Stack.Screen name="ItemDetail"       component={ItemDetailScreen} />
          <Stack.Screen name="Availability"     component={AvailabilityScreen} />
          <Stack.Screen name="DatePicker"       component={DatePickerScreen} />
          <Stack.Screen name="AddItem"          component={AddItemScreen} />
          <Stack.Screen name="Requests"         component={RequestsScreen} />
          <Stack.Screen name="CreateHaus"       component={CreateHausScreen} />
          <Stack.Screen name="HausDetail"           component={HausDetailScreen} />
          <Stack.Screen name="CollectionDetail"     component={CollectionDetailScreen} />
          <Stack.Screen name="CreateCollection"     component={CreateCollectionScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="AddItemsToCollection" component={AddItemsToCollectionScreen} />
          <Stack.Screen name="BoardDetail"      component={BoardDetailScreen} />
          <Stack.Screen name="CreateBoard"      component={CreateBoardScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="AddItemsToBoard"  component={AddItemsToBoardScreen} />
          <Stack.Screen name="Hauses"            component={HausesScreen} />
          <Stack.Screen name="Friends"           component={FriendsScreen} />
          <Stack.Screen name="FriendProfile"    component={UserProfileScreen} />
          <Stack.Screen name="Messages"        component={MessagesScreen} />
          <Stack.Screen name="BorrowsDashboard" component={BorrowsDashboardScreen} />
          <Stack.Screen name="ExchangeDetail"   component={ExchangeDetailScreen} />
          <Stack.Screen name="ChatThread"       component={ChatThreadScreen} />
          <Stack.Screen name="MakeOffer"        component={MakeOfferScreen} />
        </Stack.Navigator>
      </RequestsProvider>
    </HausCollectionsProvider>
    </HausesProvider>
    </BoardsProvider>
    </ClosetProvider>
    </FriendsProvider>
    </MessagesProvider>
    </InteractionsProvider>
  </BorrowsProvider>
  );
}
