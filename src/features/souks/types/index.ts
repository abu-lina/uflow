import { SOUK_STATUS } from '@/config/constants';

// Base Types
interface BaseSouk {
  souk_id: string;
  title: string;
  description: string;
  logo_url?: string;
  category_id: string;
  contact_info?: {
    email?: string;
    phone?: string;
  };
  location?: {
    country?: string;
    street?: string;
    zip?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  social?: {
    instagram?: string;
    website?: string;
  };
}

// User Types
export interface SoukOwner {
  id: string;
  full_name: string;
  avatar_url: string;
}

// Souk Types
export interface SoukListItem extends BaseSouk {
  owner?: SoukOwner;
  view_count: number;
  bookmark_count: number;
  offer_count: number;
}

export interface Souk extends BaseSouk {
  owner_id: string;
  is_verified: boolean;
  metrics: {
    view_count: number;
    bookmark_count: number;
    offer_count: number;
  };
  timestamps: {
    created_at: string;
    updated_at: string;
  };
  status: typeof SOUK_STATUS[keyof typeof SOUK_STATUS];
}

// Offer Types
export interface Offer {
  offer_id: string;
  souk_id: string;
  title: string;
  description: string;
  price?: number;
  is_negotiable: boolean;
  status: 'active' | 'inactive' | 'sold';
  created_at: string;
  updated_at: string;
}

// Category Types
export interface Category {
  id: string;
  name_en: string;
  name_de: string;
  description?: string;
  icon?: string;
}

// Bookmark Types
export interface Bookmark {
  user_id: string;
  souk_id: string;
  created_at: string;
}

// View Types
export interface View {
  user_id: string;
  souk_id: string;
  viewed_at: string;
}

// Search and Pagination Types
export interface SearchParams {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
