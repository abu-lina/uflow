export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  description_en?: string;
  category_images?: Record<string, unknown>; // JSONB for category images
  applicable_section: 'food' | 'store' | 'ummah' | 'all';
  category_type?: 'cuisine' | 'dish_type' | 'dietary' | 'meal' | 'store_type';
  created_at: string;
  updated_at: string;
}

/** #254: junction row — the complete category set of a provider.
 * The Primary Category is providers.category_id (a pointer into this
 * table); every other row is a Secondary Category (search match only). */
export interface ProviderCategory {
  provider_id: string;
  category_id: string;
  created_at: string;
}
