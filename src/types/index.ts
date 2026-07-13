export interface AvailabilityRange {
  id: string;
  start: string; // 'YYYY-MM-DD'
  end: string;
  borrower?: string;
}

export interface ItemAvailability {
  isAvailable: boolean;
  instantBorrow: boolean;
  bookedRanges: AvailabilityRange[];
  blockedRanges: AvailabilityRange[];
}

export type VisibilityMode = 'public' | 'friends' | 'hauses';
export type CoverStyle = 'mosaic' | 'single' | 'stack';

export interface Board {
  id: string;
  name: string;
  visibility: VisibilityMode;
  coverStyle: CoverStyle;
  itemIds: string[];
  createdAt: string;
  ownerId: string;
}

export interface Item {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  photo_url?: string;
  photo_urls?: string[];
  category: string;
  size_label: string;
  price_per_day: number;
  price_per_week?: number;
  list_for_rental?: boolean;
  max_duration?: string;
  pickup_method?: string;
  condition?: string;
  occasion_tags?: string[];
  status: 'available' | 'lent' | 'wash' | 'draft';
  location_label: string;
  created_at?: string;
  visibility?: VisibilityMode;
  haus_visibility?: Record<string, boolean>;
  availability?: ItemAvailability;
  owner?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    rating?: number;
    university?: string;
  };
}

export interface Friend {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarColor: string;
  itemsShared: number;
}

export interface FriendRequest {
  id: string;
  from: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    avatarColor: string;
    mutual: number;
  };
  status: 'pending';
}

export interface SuggestedFriend {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarColor: string;
  sharedHaus: string;
  mutual: number;
  requestStatus: null | 'pending';
}

export interface Haus {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  member_count: number;
  piece_count: number;
  items?: Item[];
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
  username?: string;
  avatar_url?: string;
  university?: string;
  bio?: string;
  items_listed: number;
  rentals_completed: number;
  rating: number;
}

export interface HausMembership {
  id: string;
  user_id: string;
  haus_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  user?: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>;
}

export type MessageType = 'text' | 'system' | 'borrow_request' | 'counter_offer' | 'confirmed';
export type ThreadStatus = 'pending_request' | 'counter_sent' | 'active_rental' | 'completed';

export interface BorrowRequestPayload {
  dates: { start: string; end: string };
  duration: number;
  pricePerDay: number;
  pickup: string;
  total: number;
  status: 'pending' | 'accepted' | 'declined' | 'countered';
}

export interface CounterOfferPayload {
  pricePerDay: number;
  dates: { start: string; end: string };
  note?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  type: MessageType;
  senderId: string;
  text?: string;
  payload?: BorrowRequestPayload | CounterOfferPayload;
  timestamp: string;
}

export interface ThreadParticipant {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarColor: string;
}

export interface Thread {
  id: string;
  otherUser: ThreadParticipant;
  item: Item;
  status: ThreadStatus;
  unread: boolean;
  lastMessage: string;
  lastMessageTime: string;
  messages: ChatMessage[];
}
