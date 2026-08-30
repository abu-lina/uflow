import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type { OpeningHours } from '@/types/openingHours';

/** Raw row shape returned by the locations+providers join query for map pins. */
export interface RawLocationRow {
  provider_id: string;
  location_latitude: number | null;
  location_longitude: number | null;
  providers: RawProviderRow | RawProviderRow[] | null;
}

export interface RawProviderRow {
  provider_name?: string | null;
  opening_hours?: OpeningHours | null;
  provider_images?: string | { urls?: string[] } | null;
  address_city?: string | null;
  category_id?: string | null;
  categories?: RawCategoryRow | RawCategoryRow[] | null;
}

export interface RawCategoryRow {
  name_de?: string | null;
  name_en?: string | null;
  category_images?: Record<string, unknown> | null;
}

/**
 * Fetch all map pin locations for approved food providers.
 * Returns raw location rows with joined provider data for map rendering.
 */
export async function getMapLocations(client?: SupabaseClient): Promise<RawLocationRow[]> {
  const supabase = getSupabaseClient(client);

  const { data, error } = await supabase
    .from('locations')
    .select(
      'provider_id, location_latitude, location_longitude, providers!inner(provider_name, listing_type, review_status, opening_hours, provider_images, address_city, category_id, categories(name_de, name_en, category_images))',
    )
    .not('location_latitude', 'is', null)
    .not('location_longitude', 'is', null)
    .eq('providers.listing_type', 'food')
    .eq('providers.review_status', 'approved');

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as RawLocationRow[]) : [];
}
