// User/Profile type
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  website?: string;
  about?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Service type (formerly Business)
export interface Service {
  id: string;
  name: string;
  description?: string;
  category?: string; // This is using a custom type in your DB
  logo_url?: string;
  owner_id: string;
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  view_count?: number;
  purchase_count?: number;
  created_at: string;
  updated_at?: string;
  owner?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

// Offer type (formerly called Service)
export interface Offer {
  id: string;
  service_id: string;  // renamed from offer_id
  title: string;
  description: string;
  price: number;
  category: string;
  image_urls: string[];
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  
  // Relations (optional)
  service?: Service;
}

// For polymorphic relations
export interface Bookmark {
  id: string;
  user_id: string;
  bookmarkable_id: string;
  bookmarkable_type: 'service' | 'offer';
  created_at: string;
}

export interface View {
  id: string;
  user_id: string;
  viewable_id: string;
  viewable_type: 'service' | 'offer';
  created_at: string;
}

// Define core database types
export interface User {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  about?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Business {
  id: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  name: string;
  description: string;
  category: string;
  logo_url: string | null;
  image_urls: string[];
  status: 'active' | 'inactive' | 'pending';
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  view_count: number;
  rating_avg: number | null;
  rating_count: number;
  owner?: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name: string;
      avatar_url: string;
    }
  };
}

export interface Bookmark {
  id: string;
  created_at: string;
  user_id: string;
  service_id: string;
  note: string | null;
}

// API response types
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: PaginationInfo;
  error?: {
    message: string;
    details?: string;
  };
  warning?: string;
}

// Common component prop types
export interface ServiceCardProps {
  service: Service;
  isBookmarked?: boolean;
  onBookmarkToggle?: (serviceId: string) => void;
}

export interface BusinessCardProps {
  business: Business;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
} 