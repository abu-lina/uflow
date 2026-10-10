import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { EntityType } from '@/types/badges';
import type { ProviderBadgeWithType } from '@/types/badges';
import { getBadgesForEntities } from '../badges';
import type { Section } from '@/config/sectionFilters';
import {
  SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';
import type { Provider, SearchResult, AdminSearchOptions, ProviderSearchResponse } from './types';
import { transformProviderToSearchResult } from './types';

async function loadProviderRelationIds(
  providerIds: string[],
  client?: SupabaseClient,
): Promise<{
  offersByProvider: Map<string, string[]>;
  needsByProvider: Map<string, string[]>;
}> {
  if (providerIds.length === 0) {
    return {
      offersByProvider: new Map<string, string[]>(),
      needsByProvider: new Map<string, string[]>(),
    };
  }

  const supabase = getSupabaseClient(client);
  const [providerOffersResult, providerNeedsResult] = await Promise.all([
    supabase.from('provider_offers').select('provider_id, offer_id').in('provider_id', providerIds),
    supabase.from('provider_needs').select('provider_id, need_id').in('provider_id', providerIds),
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
 * Translated "all categories" labels. These are an explicit user choice
 * meaning "no category filter", not a broken filter value, so they must
 * never trip the invalid-category guard below.
 */
const ALL_CATEGORIES_LABELS = ['All', 'Alle', 'الكل', 'Tümü'];

/**
 * Check if a category value is a valid category ID (UUID).
 * Category IDs are UUIDs; anything else is not a usable filter.
 */
function isValidCategoryId(category: string | null | undefined): boolean {
  if (!category) return false;

  if (ALL_CATEGORIES_LABELS.includes(category)) return false;

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

/**
 * Main search function that handles all entity types with pagination
 *
 * Plan 058: When adminOptions is provided, filters by review_status and includes
 * review_status/review_feedback fields in results.
 *
 * Plan 089: Added `section` parameter for section-based routing.
 *   - 'food'    -> providers with listing_type = 'food'
 *   - 'ummah'   -> community_services table only
 *   - 'business'-> providers with listing_type = 'business'
 *   - undefined -> defaults to 'food' per D9
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
  client?: SupabaseClient,
): Promise<ProviderSearchResponse> {
  try {
    const normalizedCategory = category || '';

    // Plan 089: Section-based routing takes precedence when provided.
    if (section !== undefined) {
      switch (section) {
        case 'ummah':
          return await searchCommunityServicesOnly(
            query,
            normalizedCategory,
            location,
            page,
            pageSize,
            client,
          );
        case 'food':
          return await searchProvidersOnly(
            query,
            normalizedCategory,
            location,
            page,
            pageSize,
            adminOptions,
            'food',
            barakahFilters,
            client,
          );
        case 'store':
          return await searchProvidersOnly(
            query,
            normalizedCategory,
            location,
            page,
            pageSize,
            adminOptions,
            'store',
            barakahFilters,
            client,
          );
        default:
          // D9: default section is FOOD
          return await searchProvidersOnly(
            query,
            normalizedCategory,
            location,
            page,
            pageSize,
            adminOptions,
            'food',
            barakahFilters,
            client,
          );
      }
    }

    // Plan 089 D9: when no section provided, default to FOOD section.
    return await searchProvidersOnly(
      query,
      normalizedCategory,
      location,
      page,
      pageSize,
      adminOptions,
      'food',
      barakahFilters,
      client,
    );
  } catch (error) {
    // Log error for debugging
    console.error('[searchProvidersAndCommunityServices] Error:', error);
    // Return empty results instead of throwing to prevent UI crashes
    return { results: [], hasMore: false, totalCount: 0 };
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
  client?: SupabaseClient,
): Promise<ProviderSearchResponse> {
  return searchProvidersOnly(
    query,
    category,
    location,
    page,
    pageSize,
    undefined,
    'ummah',
    undefined,
    client,
  );
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
  client?: SupabaseClient,
): Promise<ProviderSearchResponse> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more

  const { providers, totalCount } = await searchProviders(
    query,
    category,
    location,
    limit,
    offset,
    adminOptions,
    listingType,
    barakahFilters,
    client,
  );
  const hasMore = providers.length > pageSize;
  const results = providers.slice(0, pageSize).map(transformProviderToSearchResult);
  const sortedResults = sortByCreationDate(results);

  return { results: sortedResults, hasMore, totalCount };
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
  client?: SupabaseClient,
): Promise<{ providers: Provider[]; totalCount: number }> {
  // #254: a valid category filter matches primary AND secondary categories
  // via the provider_categories junction. The !inner embed must only be
  // present when a category filter is active — applied unconditionally it
  // would drop providers whose category_id is NULL.
  const hasCategoryFilter = isValidCategoryId(category);

  // A non-empty category that is neither a UUID nor a known "all" label is a
  // filter that cannot be applied. Fail closed and loud: silently dropping
  // it would widen the result set and present an unfiltered listing as a
  // filtered success (#254 post-QA).
  if (category && !hasCategoryFilter && !ALL_CATEGORIES_LABELS.includes(category)) {
    console.error(
      `[searchProviders] Unrecognised category filter "${category}" — refusing to return unfiltered results`,
    );
    return { providers: [], totalCount: 0 };
  }

  // Plan 058: Include review fields when admin
  const baseSelectFields = adminOptions?.isAdmin
    ? '*, category:categories!providers_category_id_fkey(name_de, name_en, category_images), review_status, review_feedback'
    : '*, category:categories!providers_category_id_fkey(name_de, name_en, category_images)';
  const selectFields = hasCategoryFilter
    ? `${baseSelectFields}, provider_categories!inner(category_id)`
    : baseSelectFields;

  // Plan 058: admin queries must use the service-role client to bypass RLS.
  // The caller (API route) passes the admin client directly via the `client` parameter
  // after verifying isAdminOrModerator().
  const supabase = getSupabaseClient(client);

  // Plan 229: Use count: 'exact' to get the total matching count alongside data.
  let req = supabase.from('providers').select(selectFields, { count: 'exact' });

  // Plan 058: Apply review_status filter when admin options provided.
  // AC7.2 (#415): without admin options the query must still restrict to
  // approved — migration 130 lets callers see their OWN pending rows, which
  // must not leak into public search results.
  if (adminOptions?.status === 'all') {
    req = req.in('review_status', ['approved', 'pending', 'rejected', 'needs_revision']);
  } else if (adminOptions?.status) {
    req = req.eq('review_status', adminOptions.status);
  } else {
    req = req.eq('review_status', 'approved');
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

  const matchedMenuItemsByProvider = new Map<string, string[]>();
  if (query) {
    const { data: matchingProviders, error: matchingProvidersError } = await supabase.rpc(
      'search_providers_for_query',
      {
        search_query: query,
        section_filter: listingType ?? null,
        city_filter: isValidLocation(location) ? location : null,
        review_status_filter: adminOptions?.status ?? 'approved',
        limit_count: 500,
      },
    );

    if (matchingProvidersError) throw matchingProvidersError;

    const matchingProviderIds = (matchingProviders ?? []).map(
      (row: { provider_id: string; matched_menu_items?: string[] }) => {
        matchedMenuItemsByProvider.set(row.provider_id, row.matched_menu_items ?? []);
        return row.provider_id;
      },
    );

    if (matchingProviderIds.length === 0) return { providers: [], totalCount: 0 };
    req = req.in('provider_id', matchingProviderIds);
  }

  if (hasCategoryFilter) {
    // PostgREST embed filter: matches any junction row, so a secondary
    // category match returns the provider once (!inner never multiplies
    // parent rows) and count: 'exact' stays correct.
    req = req.eq('provider_categories.category_id', category);
  }
  if (isValidLocation(location)) {
    req = req.eq('address_city', location);
  }

  const { data, error, count } = await req.returns<Provider[]>();
  if (error) throw error;

  // Plan 229: Extract totalCount from Supabase count header
  const totalCount = count ?? 0;

  if (!Array.isArray(data) || data.length === 0) {
    return { providers: [], totalCount };
  }

  const providerIds = data.map((provider) => provider.provider_id);
  const { offersByProvider, needsByProvider } = await loadProviderRelationIds(providerIds, client);

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
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Handle errors gracefully
  if (offersResult.error) {
    console.error('Error fetching offers:', offersResult.error);
  }
  if (needsResult.error) {
    console.error('Error fetching needs:', needsResult.error);
  }

  // Create maps for O(1) lookup
  const offersMap = new Map((offersResult.data || []).map((o) => [o.offer_id, o]));
  const needsMap = new Map((needsResult.data || []).map((n) => [n.need_id, n]));

  // Map back to providers efficiently. The provider_categories key only
  // exists when the junction embed was added for a category filter; it is
  // join plumbing, not part of Provider, so it is dropped here (#254).
  const providersWithOffersAndNeeds = data.map((row) => {
    const provider = { ...(row as Provider & { provider_categories?: unknown }) };
    delete provider.provider_categories;
    return {
      ...provider,
      matched_menu_items: matchedMenuItemsByProvider.get(provider.provider_id) || [],
      offers: (offersByProvider.get(provider.provider_id) || [])
        .map((id) => offersMap.get(id))
        .filter(Boolean) as Array<{ name_de: string }>,
      needs: (needsByProvider.get(provider.provider_id) || [])
        .map((id) => needsMap.get(id))
        .filter(Boolean) as Array<{ name_de: string }>,
      offers_ids: offersByProvider.get(provider.provider_id) || [],
      needs_ids: needsByProvider.get(provider.provider_id) || [],
    };
  });

  // Batch fetch badges for all providers in one query
  const badgesMap = await getBadgesForEntities(providerIds, EntityType.PROVIDER).catch((error) => {
    console.error('Error fetching badges:', error);
    return new Map<string, ProviderBadgeWithType[]>();
  });

  // Add badges to providers with O(1) lookup
  const providersWithBadges = providersWithOffersAndNeeds.map((provider) => ({
    ...provider,
    badges: badgesMap.get(provider.provider_id) || [],
  }));

  return { providers: providersWithBadges, totalCount };
}
