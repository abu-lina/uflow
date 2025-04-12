// Base business type from database
export type Business = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  view_count: number | null;
  purchase_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  category?: 'food' | 'beauty' | 'fashion' | 'health' | 'education' | 'travel' | 'other' | null;
};

// Business with owner information
export type BusinessWithOwner = Business & {
  owner: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// Available business categories
export const BUSINESS_CATEGORIES = [
  'food',
  'beauty',
  'fashion',
  'health',
  'education',
  'travel',
  'other'
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

// API response type for businesses listing
export interface BusinessesApiResponse {
  data: BusinessWithOwner[];
  count: number;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
} 