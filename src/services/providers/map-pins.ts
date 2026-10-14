import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SECTION } from '@/config/sectionFilters';
import type { Section } from '@/config/sectionFilters';
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
  listing_type?: Section | null;
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
 * Hard cap on rows returned for the map. Without it PostgREST streams the
 * entire approved set, which was part of the main-thread stall in
 * Plan 261. Ordering keeps the truncation deterministic so pins do not
 * shuffle between loads once the cap is reached.
 *
 * Ceiling: beyond roughly this many markers Leaflet needs clustering, which
 * this cap does not provide — it only bounds the fetch.
 */
export const MAP_LOCATIONS_LIMIT = 1000;

/**
 * Fetch map pin locations for a provider section.
 * Returns raw location rows with joined provider data for map rendering.
 */
export interface MapLocationsOptions {
  section?: Section;
  city?: string | null;
  reviewStatus?: string | null;
}

export async function getMapLocations(
  { section = DEFAULT_SECTION, city, reviewStatus }: MapLocationsOptions = {},
  client?: SupabaseClient,
): Promise<RawLocationRow[]> {
  const supabase = getSupabaseClient(client);

  let query = supabase
    .from('locations')
    .select(
      'provider_id, location_latitude, location_longitude, providers!inner(provider_name, listing_type, review_status, opening_hours, provider_images, address_city, category_id, categories!providers_category_id_fkey(name_de, name_en, category_images))',
    )
    .not('location_latitude', 'is', null)
    .not('location_longitude', 'is', null)
    .eq('providers.listing_type', section)
    .eq('providers.review_status', reviewStatus ?? 'approved');

  if (city) {
    query = query.eq('address_city', city);
  }

  const { data, error } = await query
    .order('provider_id', { ascending: true })
    .limit(MAP_LOCATIONS_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as RawLocationRow[]) : [];
}
