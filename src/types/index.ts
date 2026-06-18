export interface Item {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  photo_url?: string;
  category: string;
  size_label: string;
  price_per_day: number;
  price_per_week?: number;
  status: 'available' | 'lent' | 'wash';
  location_label: string;
  created_at?: string;
  owner?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    rating?: number;
    university?: string;
  };
}

export interface Haus {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  member_count: number;
  piece_count: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
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
