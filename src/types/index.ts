/**
 * @fileoverview Main type exports for the application
 * @module types
 */

// Database types
export type { Database } from './database';

// Shared types
export type { Size, Variant, ColorScheme } from './shared';
export type { LoadingState, ValidationState } from './shared';
export type { BaseProps, LoadingProps, ValidationProps } from './shared';

// API types
export type { ApiResponse, PaginationInfo } from './api';

// Database entity types
export type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Souk,
  SoukInsert,
  SoukUpdate,
  Category,
  CategoryInsert,
  CategoryUpdate,
  Offer,
  OfferInsert,
  OfferUpdate,
  Bookmark,
  BookmarkInsert,
  BookmarkUpdate,
  View,
  ViewInsert,
  ViewUpdate,
} from './database';

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

// Auth types
export type UserRole = 'customer' | 'souk_owner' | 'halal_reviewer' | 'admin';
export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  profile?: Profile;
};

export interface Souk {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
