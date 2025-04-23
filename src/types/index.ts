import type { Database } from './database';

// Re-export types from database.ts
export type { Database } from './database';

// Type helpers for database tables
export type Souk = Database['public']['Tables']['souks']['Row'];
export type SoukInsert = Database['public']['Tables']['souks']['Insert'];
export type SoukUpdate = Database['public']['Tables']['souks']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Offer = Database['public']['Tables']['offers']['Row'];
export type OfferInsert = Database['public']['Tables']['offers']['Insert'];
export type OfferUpdate = Database['public']['Tables']['offers']['Update'];

export type Bookmark = Database['public']['Tables']['bookmarks']['Row'];
export type BookmarkInsert = Database['public']['Tables']['bookmarks']['Insert'];
export type BookmarkUpdate = Database['public']['Tables']['bookmarks']['Update'];

export type View = Database['public']['Tables']['views']['Row'];
export type ViewInsert = Database['public']['Tables']['views']['Insert'];
export type ViewUpdate = Database['public']['Tables']['views']['Update'];

// Common API response types
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
export interface SoukCardProps {
  souk: Souk;
  isBookmarked?: boolean;
  onBookmarkToggle?: (soukId: string) => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
} 