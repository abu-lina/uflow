import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SECTION } from '@/config/sectionFilters';
import type { Section } from '@/config/sectionFilters';
import {
  SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';
import { getSupabaseClient } from './client';
import type { OpeningHours } from '@/types/openingHours';
import type { HalalTier } from '@/features/search/discoveryQuery';

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
  filters?: SearchFilterKey[];
  tier?: HalalTier;
}

/**
 * City and filters apply to the provider row, as in searchProviders, so the
 * pins for a section/city/filter scope are a subset of its list (#674).
 */
export async function getMapLocations(
  { section = DEFAULT_SECTION, city, reviewStatus, filters, tier }: MapLocationsOptions = {},
  client?: SupabaseClient,
): Promise<RawLocationRow[]> {
  const supabase = getSupabaseClient(client);
  // #982: tier applies to food only, as in searchProvidersAndCommunityServices
  const minTier = section === 'food' ? tier : undefined;
  const tierEmbed = minTier
    ? ', food_providers!inner(verification_method, has_certificate, certificate_url, no_alcohol, no_pork, no_gambling)'
    : '';

  // Typed as string: the select-type parser cannot read an interpolated embed.
  const select: string = `provider_id, location_latitude, location_longitude, providers!inner(provider_name, listing_type, review_status, opening_hours, provider_images, address_city, category_id, categories!providers_category_id_fkey(name_de, name_en, category_images)${tierEmbed})`;

  let query = supabase
    .from('locations')
    .select(select)
    .not('location_latitude', 'is', null)
    .not('location_longitude', 'is', null)
    .eq('providers.listing_type', section)
    .eq('providers.review_status', reviewStatus ?? 'approved');

  if (city) {
    query = query.eq('providers.address_city', city);
  }

  for (const filterKey of filters ?? []) {
    query = query.eq(`providers.${SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN[filterKey]}`, true);
  }

  // #982: same tier rules as searchProviders (#939), on the nested embed
  if (minTier === 'gold') {
    query = query
      .eq('providers.food_providers.has_certificate', true)
      // filter(), not not(): the typed not() recurses too deep on a nested path
      .filter('providers.food_providers.certificate_url', 'not.is', null);
  } else if (minTier === 'silver') {
    query = query.or(
      'and(has_certificate.eq.true,certificate_url.not.is.null),and(verification_method.eq.onsite,or(no_alcohol.eq.true,no_pork.eq.true,no_gambling.eq.true))',
      { referencedTable: 'providers.food_providers' },
    );
  } else if (minTier === 'bronze') {
    query = query.or(
      'and(has_certificate.eq.true,certificate_url.not.is.null),and(verification_method.not.is.null,or(no_alcohol.eq.true,no_pork.eq.true,no_gambling.eq.true))',
      { referencedTable: 'providers.food_providers' },
    );
  }

  const { data, error } = await query
    .order('provider_id', { ascending: true })
    .limit(MAP_LOCATIONS_LIMIT)
    .returns<RawLocationRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data : [];
}
