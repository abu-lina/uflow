import type { ProviderBadgeWithType } from '@/types/badges';
import type { OpeningHours } from '@/types/openingHours';
import type { Location } from '@/types/location';

export interface FoodMenuItem {
  name_de: string;
  name_en?: string | null;
  description_de?: string | null;
  price_cents?: number | null;
  category?: string | null;
  sort_order?: number | null;
  is_available?: boolean;
}

/** Plan 196: A single row returned by the `search_food_near_me` RPC. */
export interface NearMeFoodResult {
  provider_id: string;
  provider_name: string;
  provider_images: string | { urls?: string[] } | null;
  category_id: string | null;
  category_name_de: string | null;
  category_name_en: string | null;
  category_images: Record<string, unknown> | null;
  address_city: string | null;
  opening_hours: OpeningHours | null;
  location_latitude: number | null;
  location_longitude: number | null;
  distance_km: number;
}

export interface Provider {
  provider_id: string;
  provider_name: string;
  provider_images: string | { urls?: string[] } | null;
  category_id: string | null;
  address_city: string | null;
  social_website: string | null;
  social_instagram: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_street: string | null;
  address_country: string | null;
  address_zip: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  offers_ids: string[];
  needs_ids: string[];
  show_address?: boolean;
  /** Maps to DB column: provider_description */
  description?: string | null;
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  bookmark_count?: number;
  provider_owner_id?: string | null;
  user_created_id?: string | null;
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  review_feedback?: string | null;
  badges?: ProviderBadgeWithType[];
  // Plan 089: section classification columns
  listing_type?: 'food' | 'store' | 'ummah' | null;
  muslim_owned?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
  children_friendly?: boolean;
  makes_donations?: boolean;
  has_parking?: boolean;
  economic_solidarity?: boolean;
  recommender_email?: string | null;
  import_source?: string | null;
  import_source_id?: string | null;
  import_source_url?: string | null;
  last_enriched_at?: string | null;
  enrichment_eligible?: boolean;
  // M-5 extension table columns (now in food_providers / store_providers; undefined when not joined)
  verification_method?: 'online' | 'onsite' | null;
  has_certificate?: boolean;
  // From food_providers extension table (joined in search queries)
  no_alcohol?: boolean;
  no_pork?: boolean;
  // From store_providers extension table (joined in search queries)
  no_gambling?: boolean;
  opening_hours?: OpeningHours | null;
  food_menu_items?: FoodMenuItem[];
  locations?: Location[];
}

export interface SearchResult {
  id: string;
  name: string;
  images: string | { urls?: string[] } | null;
  category_id: string | null;
  address_city: string | null;
  social_website: string | null;
  social_instagram: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_street: string | null;
  address_country: string | null;
  address_zip: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  offers_ids: string[];
  needs_ids: string[];
  offers?: Array<{ name_de: string }>;
  food_menu_items?: FoodMenuItem[];
  needs?: Array<{ name_de: string }>;
  badges?: ProviderBadgeWithType[];
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  type: 'provider';
  originalProvider?: Provider;
  /** Review status (Plan 058: included for admin requests) */
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  /** Review feedback (Plan 058: included for admin requests) */
  review_feedback?: string | null;
  // Plan 089: section classification fields (passed through from Provider)
  listing_type?: 'food' | 'store' | 'ummah' | null;
  muslim_owned?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
  children_friendly?: boolean;
  makes_donations?: boolean;
  has_parking?: boolean;
  economic_solidarity?: boolean;
  opening_hours?: OpeningHours | null;
  locations?: Location[];
}

/**
 * Transforms a provider to SearchResult format
 * Plan 058: Includes review_status and review_feedback when available
 */
export function transformProviderToSearchResult(provider: Provider): SearchResult {
  return {
    id: provider.provider_id,
    name: provider.provider_name,
    images:
      provider.provider_images == null
        ? null
        : typeof provider.provider_images === 'string'
          ? provider.provider_images
          : JSON.stringify(provider.provider_images),
    category_id: provider.category_id,
    address_city: provider.address_city,
    social_website: provider.social_website,
    social_instagram: provider.social_instagram,
    contact_email: provider.contact_email,
    contact_phone: provider.contact_phone,
    address_street: provider.address_street,
    address_country: provider.address_country,
    address_zip: provider.address_zip,
    location_latitude: provider.location_latitude,
    location_longitude: provider.location_longitude,
    created_at: provider.created_at,
    updated_at: provider.updated_at,
    offers_ids: provider.offers_ids,
    needs_ids: provider.needs_ids,
    offers: provider.offers,
    needs: provider.needs,
    badges: provider.badges,
    category: provider.category,
    type: 'provider' as const,
    originalProvider: provider,
    // Plan 058: Include review fields when available (admin mode)
    review_status: provider.review_status,
    review_feedback: provider.review_feedback,
    // Plan 089: section classification fields
    listing_type: provider.listing_type,
    muslim_owned: provider.muslim_owned,
    has_prayer_space: provider.has_prayer_space,
    family_friendly: provider.family_friendly,
    women_friendly: provider.women_friendly,
    children_friendly: provider.children_friendly,
    makes_donations: provider.makes_donations,
    has_parking: provider.has_parking,
    economic_solidarity: provider.economic_solidarity,
    opening_hours: provider.opening_hours ?? null,
    locations: provider.locations,
  };
}

/** Review status values for admin filtering (Plan 058) */
export type ReviewStatusFilter = 'approved' | 'pending' | 'rejected' | 'needs_revision' | null;

/** Admin options for filtering by review status (Plan 058) */
export interface AdminSearchOptions {
  status: 'approved' | 'pending' | 'rejected' | 'needs_revision';
  isAdmin: true;
}

export interface PopularCity {
  city: string;
  provider_count: number;
}
