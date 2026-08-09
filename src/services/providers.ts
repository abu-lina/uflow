import { supabase } from '@/lib/supabase/client';
import { searchOffers } from './offers';
import { searchNeeds } from './needs';
import { logSupabaseError } from '@/utils/errorUtils';
import type { ProviderBadgeWithType } from '@/types/badges';
import { EntityType } from '@/types/badges';
import { getBadgesForEntities, getBadgesForEntity } from './badges';
import type { Section } from '@/config/sectionFilters';
import {
  SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';
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

/**
 * Plan 196: Searches for approved food providers within a radius of a point,
 * nearest-location-per-provider, distance-ordered. Reuses the additive
 * `search_food_near_me` RPC (migration 120) — does NOT touch the existing
 * `find_nearby_food_providers` RPC used by the provider detail page.
 *
 * Open-now filtering is intentionally NOT applied here — callers filter the
 * returned `opening_hours` client-side via `getOpenStatus` (Analysis 196 #3).
 */
export async function searchFoodNearMe(params: {
  lat: number;
  lon: number;
  radiusKm: number;
  limit?: number;
}): Promise<NearMeFoodResult[]> {
  const { lat, lon, radiusKm, limit = 100 } = params;

  const { data, error } = await supabase.rpc('search_food_near_me', {
    p_lat: lat,
    p_lon: lon,
    p_radius_km: radiusKm,
    p_limit: limit,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as NearMeFoodResult[]) : [];
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
    images: provider.provider_images == null
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

async function loadProviderRelationIds(providerIds: string[]): Promise<{
  offersByProvider: Map<string, string[]>;
  needsByProvider: Map<string, string[]>;
}> {
  if (providerIds.length === 0) {
    return {
      offersByProvider: new Map<string, string[]>(),
      needsByProvider: new Map<string, string[]>(),
    };
  }

  const [providerOffersResult, providerNeedsResult] = await Promise.all([
    supabase
      .from('provider_offers')
      .select('provider_id, offer_id')
      .in('provider_id', providerIds),
    supabase
      .from('provider_needs')
      .select('provider_id, need_id')
      .in('provider_id', providerIds),
  ]);

  const offersByProvider = new Map<string, string[]>();
  for (const row of providerOffersResult.data || []) {
    const offerIds = offersByProvider.get(row.provider_id) || [];
    offerIds.push(row.offer_id);
    offersByProvider.set(row.provider_id, offerIds);
  }

  const needsByProvider = new Map<string, string[]>();
  for (const row of providerNeedsResult.data || []) {
    const needIds = needsByProvider.get(row.provider_id) || [];
    needIds.push(row.need_id);
    needsByProvider.set(row.provider_id, needIds);
  }

  return { offersByProvider, needsByProvider };
}

/**
 * Sorts search results by creation date (newest first)
 */
function sortByCreationDate(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Check if a category value is a valid category ID (UUID) or a translated "all" string
 * Category IDs are UUIDs, so if it's not a UUID, it's likely a translation and should be ignored
 */
function isValidCategoryId(category: string | null | undefined): boolean {
  if (!category) return false;
  
  // Check if it's a known "all" translation
  const allTranslations = ['All', 'Alle', 'الكل', 'Tümü'];
  if (allTranslations.includes(category)) return false;
  
  // Check if it's a valid UUID format (category IDs are UUIDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(category);
}

/**
 * Check if a location value is a valid city name (not empty/falsy)
 * Empty string or falsy values represent "all locations" (no filter)
 */
function isValidLocation(location: string | null | undefined): boolean {
  // Empty string, null, undefined all mean "all locations"
  if (!location) return false;
  return true;
}

/** Review status values for admin filtering (Plan 058) */
export type ReviewStatusFilter = 'approved' | 'pending' | 'rejected' | 'needs_revision' | null;

/** Admin options for filtering by review status (Plan 058) */
export interface AdminSearchOptions {
  status: 'approved' | 'pending' | 'rejected' | 'needs_revision';
  isAdmin: true;
}

/**
 * Main search function that handles all entity types with pagination
 *
 * Plan 058: When adminOptions is provided, filters by review_status and includes
 * review_status/review_feedback fields in results.
 *
 * Plan 089: Added `section` parameter for section-based routing.
 *   - 'food'    → providers with listing_type = 'food'
 *   - 'ummah'   → community_services table only
 *   - 'business'→ providers with listing_type = 'business'
 *   - undefined → defaults to 'food' per D9
 */
export async function searchProvidersAndCommunityServices(
  query: string,
  category: string | null | undefined,
  location: string,
  page: number = 0,
  pageSize: number = 5,
  adminOptions?: AdminSearchOptions,
  section?: Section,
  barakahFilters?: SearchFilterKey[],
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  try {
    const normalizedCategory = category || '';

    // Plan 089: Section-based routing takes precedence when provided.
    if (section !== undefined) {
      switch (section) {
        case 'ummah':
          return await searchCommunityServicesOnly(query, normalizedCategory, location, page, pageSize);
        case 'food':
          return await searchProvidersOnly(query, normalizedCategory, location, page, pageSize, adminOptions, 'food', barakahFilters);
        case 'store':
          return await searchProvidersOnly(query, normalizedCategory, location, page, pageSize, adminOptions, 'store', barakahFilters);
        default:
          // D9: default section is FOOD
          return await searchProvidersOnly(query, normalizedCategory, location, page, pageSize, adminOptions, 'food', barakahFilters);
      }
    }

    // Plan 089 D9: when no section provided, default to FOOD section.
    return await searchProvidersOnly(query, normalizedCategory, location, page, pageSize, adminOptions, 'food', barakahFilters);
  } catch (error) {
    // Log error for debugging
    console.error('[searchProvidersAndCommunityServices] Error:', error);
    // Return empty results instead of throwing to prevent UI crashes
    return { results: [], hasMore: false };
  }
}

/**
 * Search only ummah community services with pagination.
 * Delegates to searchProvidersOnly with listingType='ummah' for consistency.
 */
async function searchCommunityServicesOnly(
  query: string,
  category: string,
  location: string,
  page: number = 0,
  pageSize: number = 5,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  return searchProvidersOnly(query, category, location, page, pageSize, undefined, 'ummah');
}

/**
 * Search only providers with pagination
 * Plan 058: Supports admin filtering by review_status
 */
async function searchProvidersOnly(
  query: string,
  category: string,
  location: string,
  page: number = 0,
  pageSize: number = 5,
  adminOptions?: AdminSearchOptions,
  listingType?: 'food' | 'store' | 'ummah',
  barakahFilters?: SearchFilterKey[],
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more
  
  const providers = await searchProviders(query, category, location, limit, offset, adminOptions, listingType, barakahFilters);
  const hasMore = providers.length > pageSize;
  const results = providers.slice(0, pageSize).map(transformProviderToSearchResult);
  const sortedResults = sortByCreationDate(results);
  
  return { results: sortedResults, hasMore };
}

export async function getProviders(limit?: number, includeLocations?: boolean): Promise<Provider[]> {
  try {
    let query = supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en)')
      .order('created_at', { ascending: false });

    if (includeLocations) {
      query = supabase
        .from('providers')
        .select('*, category:categories(name_de, name_en, category_images), locations(*)')
        .order('created_at', { ascending: false });
    }
    
    // Add limit if provided (for performance optimization)
    if (limit !== undefined && limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query.returns<Provider[]>();

    if (error) {
      logSupabaseError('providers.getProviders', error);
      // Log additional details before throwing
      if (error instanceof Error) {
        console.error('Error fetching providers:', error.message, error);
      } else {
        console.error('Error fetching providers:', error);
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching providers: ${error.message}. ` +
        'This usually means:\n' +
        '1. Check your internet connection\n' +
        '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
        '3. Check if Supabase project is accessible\n' +
        '4. Restart your dev server after updating .env.local'
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  try {
    // First, try to fetch as a provider
    const { data } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en),
        locations(*)
      `)
      .eq('provider_id', id)
      .maybeSingle();

    // If found in providers table, process and return
    if (data) {
      const [{ offersByProvider, needsByProvider }, badges, foodProvider, storeProvider] = await Promise.all([
        loadProviderRelationIds([id]),
        getBadgesForEntity(id, EntityType.PROVIDER),
        supabase
          .from('food_providers')
          .select('verification_method, has_certificate, no_alcohol, no_pork, no_gambling')
          .eq('provider_id', id)
          .maybeSingle(),
        supabase
          .from('store_providers')
          .select('no_gambling')
          .eq('provider_id', id)
          .maybeSingle(),
      ]);

      const offerIds = offersByProvider.get(id) || [];
      const needIds = needsByProvider.get(id) || [];

      const [offersResult, needsResult] = await Promise.all([
        offerIds.length > 0
          ? supabase.from('offers').select('name_de').in('offer_id', offerIds)
          : Promise.resolve({ data: [], error: null }),
        needIds.length > 0
          ? supabase.from('needs').select('name_de').in('need_id', needIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const offers = offersResult.data || [];
      const needs = needsResult.data || [];

      return {
        ...data,
        ...(foodProvider.data ?? {}),
        ...(storeProvider.data ?? {}),
        offers_ids: offerIds,
        needs_ids: needIds,
        offers,
        needs,
        badges,
      };
    }

    return null;
  } catch (error) {
    console.error('Error in getProviderById:', error);
    throw error;
  }
}

/**
 * Search providers with optional admin filtering
 * 
 * Plan 058: When adminOptions is provided:
 * - Filters by review_status
 * - Includes review_status and review_feedback in results
 */
export async function searchProviders(
  query: string,
  category: string,
  location: string,
  limit?: number,
  offset?: number,
  adminOptions?: AdminSearchOptions,
  listingType?: 'food' | 'store' | 'ummah',
  barakahFilters?: SearchFilterKey[],
): Promise<Provider[]> {
  // Plan 058: Include review fields when admin
  const selectFields = adminOptions?.isAdmin
    ? '*, category:categories(name_de, name_en, category_images), review_status, review_feedback'
    : '*, category:categories(name_de, name_en, category_images)';

  // Plan 058 fix: admin queries must use the service-role client to bypass RLS.
  // The anon client only sees approved providers; non-approved rows are invisible to it
  // regardless of any eq('review_status', ...) filter applied at the application layer.
  // getSupabaseAdmin() has 'server-only' so we replicate its pattern inline here.
  // This branch is only reached from the API route after isAdminOrModerator() has passed.
  let dbClient = supabase;
  if (adminOptions?.isAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables for admin search');
    }
    const { createClient } = await import('@supabase/supabase-js');
    dbClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  let req = dbClient.from('providers').select(selectFields);
  
  // Plan 058: Apply review_status filter when admin options provided
  if (adminOptions?.status) {
    req = req.eq('review_status', adminOptions.status);
  }

  // Plan 089: Apply listing_type filter when provided (section-based routing)
  if (listingType) {
    req = req.eq('listing_type', listingType);
  }

  if (barakahFilters && barakahFilters.length > 0) {
    for (const filterKey of barakahFilters) {
      req = req.eq(SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN[filterKey], true);
    }
  }
  
  // Apply pagination if provided
  if (limit !== undefined) {
    req = req.limit(limit);
  }
  if (offset !== undefined) {
    req = req.range(offset, offset + (limit || 1000) - 1);
  }
  
  // Always order by created_at descending for consistent pagination
  req = req.order('created_at', { ascending: false });

  if (query) {
    // First, search for matching offers, needs, and provider names using full-text search (tsvector)
    // All three now use GIN indexes for fast searches (Plan 007: ILIKE removal)
    const [matchingOffers, matchingNeeds, matchingProviderNames, matchingCategoryIds] = await Promise.all([
      searchOffers(query),
      searchNeeds(query),
      supabase.rpc('search_provider_ids_by_name', { search_query: query }),
      supabase.from('categories').select('category_id').ilike('name_de', `%${query}%`),
    ]);

    const matchingOfferIds = matchingOffers.map(offer => offer.offer_id);
    const matchingNeedIds = matchingNeeds.map(need => need.need_id);
    const matchingProviderIds = Array.isArray(matchingProviderNames.data)
      ? matchingProviderNames.data.map((p: { provider_id: string }) => p.provider_id)
      : [];
    const categoryNameMatchIds: string[] = (matchingCategoryIds.data || [])
      .map((c: { category_id: string }) => c.category_id);

    const [providerOfferMatches, providerNeedMatches] = await Promise.all([
      matchingOfferIds.length > 0
        ? supabase
            .from('provider_offers')
            .select('provider_id')
            .in('offer_id', matchingOfferIds)
        : Promise.resolve({ data: [], error: null }),
      matchingNeedIds.length > 0
        ? supabase
            .from('provider_needs')
            .select('provider_id')
            .in('need_id', matchingNeedIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const providersByOffers = (providerOfferMatches.data || []).map((row) => row.provider_id);
    const providersByNeeds = (providerNeedMatches.data || []).map((row) => row.provider_id);

    // Build the search condition to include:
    // 1. Provider name matches (using tsvector RPC — replaces previous ILIKE)
    // 2. Provider offers any of the matching offers (tsvector search)
    // 3. Provider fulfills any of the matching needs (tsvector search)
    // 4. Category name matches (cuisine/category search)
    const searchConditions: string[] = [];

    if (matchingProviderIds.length > 0) {
      searchConditions.push(`provider_id.in.(${matchingProviderIds.join(',')})`);
    }

    if (providersByOffers.length > 0) {
      searchConditions.push(`provider_id.in.(${Array.from(new Set(providersByOffers)).join(',')})`);
    }

    if (providersByNeeds.length > 0) {
      searchConditions.push(`provider_id.in.(${Array.from(new Set(providersByNeeds)).join(',')})`);
    }

    if (categoryNameMatchIds.length > 0) {
      searchConditions.push(`category_id.in.(${categoryNameMatchIds.join(',')})`);
    }

    if (searchConditions.length > 0) {
      req = req.or(searchConditions.join(','));
    } else {
      // No matches found for any search vector — return empty
      return [];
    }
  }

  if (isValidCategoryId(category)) {
    req = req.eq('category_id', category);
  }
  if (isValidLocation(location)) {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<Provider[]>();
  if (error) throw error;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const providerIds = data.map((provider) => provider.provider_id);
  const { offersByProvider, needsByProvider } = await loadProviderRelationIds(providerIds);

  // Batch fetch all offers and needs at once to avoid N+1 query problem
  const allOfferIds = Array.from(new Set(Array.from(offersByProvider.values()).flat()));
  const allNeedIds = Array.from(new Set(Array.from(needsByProvider.values()).flat()));

  // Batch queries with proper error handling
  const [offersResult, needsResult] = await Promise.all([
    allOfferIds.length > 0 
      ? supabase.from('offers').select('offer_id, name_de').in('offer_id', allOfferIds)
      : Promise.resolve({ data: [], error: null }),
    allNeedIds.length > 0
      ? supabase.from('needs').select('need_id, name_de').in('need_id', allNeedIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  // Handle errors gracefully
  if (offersResult.error) {
    console.error('Error fetching offers:', offersResult.error);
  }
  if (needsResult.error) {
    console.error('Error fetching needs:', needsResult.error);
  }

  // Create maps for O(1) lookup
  const offersMap = new Map((offersResult.data || []).map(o => [o.offer_id, o]));
  const needsMap = new Map((needsResult.data || []).map(n => [n.need_id, n]));

  // Map back to providers efficiently
  const providersWithOffersAndNeeds = data.map(provider => ({
    ...provider,
    offers: (offersByProvider.get(provider.provider_id) || []).map(id => offersMap.get(id)).filter(Boolean) as Array<{ name_de: string }>,
    needs: (needsByProvider.get(provider.provider_id) || []).map(id => needsMap.get(id)).filter(Boolean) as Array<{ name_de: string }>,
    offers_ids: offersByProvider.get(provider.provider_id) || [],
    needs_ids: needsByProvider.get(provider.provider_id) || [],
  }));

  // Batch fetch badges for all providers in one query
  const badgesMap = await getBadgesForEntities(
    providerIds,
    EntityType.PROVIDER
  ).catch(error => {
    console.error('Error fetching badges:', error);
    return new Map<string, ProviderBadgeWithType[]>();
  });

  // Add badges to providers with O(1) lookup
  const providersWithBadges = providersWithOffersAndNeeds.map(provider => ({
    ...provider,
    badges: badgesMap.get(provider.provider_id) || [],
  }));

  return providersWithBadges;
}

/**
 * Fetch all valid cities from the cities table
 * (includes cities that exist but may not have providers yet)
 */
export async function fetchAllValidCities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('city_name')
      .returns<{ city_name: string }[]>();

    if (error) {
      throw error;
    }

    return (data || []).map(c => c.city_name).sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    console.error('Error fetching valid cities:', error);
    return [];
  }
}

/**
 * Check whether a city exists in the canonical cities table.
 * Uses an exact, case-insensitive match and returns a boolean only.
 */
export async function checkCityExists(cityName: string): Promise<boolean> {
  const normalizedCity = cityName.trim();

  if (!normalizedCity) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('cities')
      .select('city_name')
      .ilike('city_name', normalizedCity)
      .limit(1);

    if (error) {
      throw error;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking city existence:', error);
    return false;
  }
}

/**
 * Fetch cities that currently have providers (includes all listing_types: food, store, ummah).
 */
export async function fetchProviderCities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('address_city')
      .returns<{ address_city: string | null }[]>();

    if (error) {
      throw error;
    }

    const allCities = data?.map((p) => p.address_city) ?? [];

    const uniqueCities = Array.from(
      new Set(
        allCities.filter((city): city is string => {
          return typeof city === 'string' && city.trim() !== '' && city !== 'null';
        }),
      ),
    );
    return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching cities: ${error.message}. ` +
        'This usually means:\n' +
        '1. Check your internet connection\n' +
        '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
        '3. Check if Supabase project is accessible\n' +
        '4. Restart your dev server after updating .env.local'
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

export interface PopularCity {
  city: string;
  provider_count: number;
}

/**
 * Fetch most popular cities by listing count across providers.
 * Optionally filter by section (listing_type).
 */
export async function fetchPopularCities(limit = 5, section?: Section): Promise<PopularCity[]> {
  if (limit <= 0) {
    return [];
  }

  try {
    let query = supabase
      .from('providers')
      .select('address_city');

    if (section) {
      query = query.eq('listing_type', section);
    }

    query = query.eq('review_status', 'approved');

    const { data, error } = await query.returns<{ address_city: string | null }[]>();

    if (error) {
      throw error;
    }

    const allCities = (data ?? [])
      .map((row) => row.address_city)
      .filter((city): city is string => {
        return typeof city === 'string' && city.trim() !== '' && city !== 'null';
      });

    const countByCity = new Map<string, number>();
    for (const city of allCities) {
      countByCity.set(city, (countByCity.get(city) ?? 0) + 1);
    }

    return Array.from(countByCity.entries())
      .map(([city, provider_count]) => ({ city, provider_count }))
      .sort((a, b) => {
        if (b.provider_count !== a.provider_count) {
          return b.provider_count - a.provider_count;
        }

        return a.city.localeCompare(b.city, 'de');
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular cities:', error);
    return [];
  }
}

// Fetch cities that have content based on current search filters.
// Uses providers-only full-text search path (searchProviders) when a search query is provided
// to avoid legacy dependencies on removed community_services artifacts.
export async function fetchFilteredCities(
  selectedCategory?: string | null,
  searchQuery?: string | null,
): Promise<string[]> {
  try {
    const trimmedQuery = searchQuery?.trim() || '';

    if (trimmedQuery) {
      const normalizedCategory =
        selectedCategory && selectedCategory !== 'Alle' ? selectedCategory : '';

      const providers = await searchProviders(trimmedQuery, normalizedCategory, '');

      const cities = Array.from(
        new Set(
          providers
            .map((provider) => provider.address_city)
            .filter(
              (city): city is string =>
                typeof city === 'string' && city.trim() !== '' && city !== 'null',
            ),
        ),
      );

      return cities.sort((a, b) => a.localeCompare(b, 'de'));
    }

    // No search query — use direct query on providers only
    let providersReq = supabase.from('providers').select('address_city');

    // Apply category filter if specified
    if (selectedCategory && selectedCategory !== 'Alle') {
      providersReq = providersReq.eq('category_id', selectedCategory);
    }

    const { data, error: providersError } = await providersReq.returns<{ address_city: string | null }[]>();

    if (providersError) {
      throw providersError;
    }

    const allCities = data?.map((p) => p.address_city) ?? [];

    const uniqueCities = Array.from(
      new Set(
        allCities.filter((city): city is string => {
          return typeof city === 'string' && city.trim() !== '' && city !== 'null';
        }),
      ),
    );
    return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching filtered cities: ${error.message}. ` +
        'This usually means:\n' +
        '1. Check your internet connection\n' +
        '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
        '3. Check if Supabase project is accessible\n' +
        '4. Restart your dev server after updating .env.local'
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

export async function getProviderCount(): Promise<number> {
  const { count, error } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching provider count:', error);
    throw error;
  }
  return count ?? 0;
}

// Get providers owned by a specific user (where user is the actual owner)
export async function getCreatedProviders(userId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en)')
    .eq('provider_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching created providers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

// Get recommendations by a specific user (where user recommended but is not the owner)
// Excludes items where user is both owner and creator (those should only appear in "content")
export async function getRecommendations(userId: string): Promise<Provider[]> {
  // First, get all providers where user is the creator
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en)')
    .eq('user_created_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }

  // Filter out items where user is also the owner (those belong in "content", not "recommendations")
  // This ensures items only appear once - in "content" if user is owner, in "recommendations" if not
  const filtered = Array.isArray(data) 
    ? data.filter(provider => {
        // Include only if provider_owner_id is null OR different from userId
        return provider.provider_owner_id === null || provider.provider_owner_id !== userId;
      })
    : [];

  return filtered;
}

// Get all bookmarked providers for a user
export async function getAllBookmarkedItems(userId: string): Promise<SearchResult[]> {
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('provider_id')
    .eq('user_id', userId);

  if (bookmarksError) {
    console.error('[getAllBookmarkedItems] Error:', bookmarksError);
    throw bookmarksError;
  }

  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const providerIds = bookmarks
    .map((b) => b.provider_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const results: SearchResult[] = [];

  if (providerIds.length > 0) {
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en, category_images), locations(*)')
      .in('provider_id', providerIds)
      .returns<Provider[]>();

    if (providersError) {
      console.error('[getAllBookmarkedItems] Error fetching bookmarked providers:', providersError);
    } else if (providers && providers.length > 0) {
      const transformed = providers.map(transformProviderToSearchResult);
      results.push(...transformed);

      // Clean up orphaned bookmarks in the background
      if (providers.length < providerIds.length) {
        const foundIds = new Set(providers.map((p) => p.provider_id));
        const missingIds = providerIds.filter((id) => !foundIds.has(id));
        if (missingIds.length > 0) {
          void (async () => {
            try {
              const { error } = await supabase
                .from('bookmarks')
                .delete()
                .in('provider_id', missingIds);
              if (error) {
                console.error('[getAllBookmarkedItems] Error cleaning up orphaned bookmarks:', error);
              }
            } catch (err) {
              console.error('[getAllBookmarkedItems] Exception cleaning bookmarks:', err);
            }
          })();
        }
      }
    }
  }

  return sortByCreationDate(results);
}

// Fetch cities from bookmarked items
export async function fetchBookmarkedCities(userId: string): Promise<string[]> {
  const bookmarkedItems = await getAllBookmarkedItems(userId);
  
  const allCities = bookmarkedItems
    .map(item => item.address_city)
    .filter((city): city is string => 
      typeof city === 'string' && city.trim() !== '' && city !== 'null'
    );

  const uniqueCities = Array.from(new Set(allCities));
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
}