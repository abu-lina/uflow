import type { Location } from '@/types/location';

export interface AdminProviderMenu {
  id?: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  price_cents: number;
  category?: string | null;
  sort_order: number;
  is_available: boolean;
}

export interface AdminProviderDeliveryLink {
  platform: 'wolt' | 'lieferando' | 'ubereats' | 'website';
  platform_url: string;
  platform_slug?: string;
  is_active: boolean;
}

export interface FoodProviderExtension {
  verification_method: string | null;
  has_certificate: boolean;
  certificate_url: string | null;
  no_alcohol: boolean;
  no_pork: boolean;
  no_gambling: boolean;
  proof_tier?: number;
}

export interface StoreProviderExtension {
  verification_method: string | null;
  has_certificate: boolean;
  certificate_url: string | null;
  no_gambling: boolean;
  proof_tier?: number;
}

export interface AdminProviderWithExtensions {
  provider_id: string;
  provider_name: string;
  provider_description?: string | null;
  provider_images: string | null;
  category_id: string | null;
  provider_owner_id?: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  listing_type?: 'food' | 'store' | 'ummah' | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  review_feedback: string | null;
  muslim_owned?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
  children_friendly?: boolean;
  makes_donations?: boolean;
  has_parking?: boolean;
  economic_solidarity?: boolean;
  opening_hours?: Record<string, unknown> | null;
  locations?: Location[];
  created_at: string;
  updated_at: string;
  food_providers?: FoodProviderExtension | null;
  store_providers?: StoreProviderExtension | null;
  menu_items?: AdminProviderMenu[];
  delivery_links?: AdminProviderDeliveryLink[];
  [key: string]: unknown;
}
