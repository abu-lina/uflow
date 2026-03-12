import { supabase } from '@/lib/supabase/client';
import { searchCommunityServices, type CommunityService } from './communityServices';
import { searchOffers } from './offers';
import { searchNeeds } from './needs';
import { logSupabaseError } from '@/utils/errorUtils';
import type { ProviderBadgeWithType } from '@/types/badges';
import { EntityType } from '@/types/badges';
import { getBadgesForEntities, getBadgesForEntity } from './badges';

export interface Provider {
  provider_id: string;
  provider_name: string;
  provider_images: string | null;
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
  barakah_effects: string[];
  offers_ids: string[];
  needs_ids: string[];
  show_address?: boolean;
  description?: string | null;
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  community_service_id?: string | null;
  bookmark_count?: number;
  provider_owner_id?: string | null;
  user_created_id?: string | null;
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  review_feedback?: string | null;
  badges?: ProviderBadgeWithType[];
}

// Combined search result type
export interface SearchResult {
  id: string;
  name: string;
  images: string | null;
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
  barakah_effects: string[];
  offers_ids: string[];
  needs_ids: string[];
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  badges?: ProviderBadgeWithType[];
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  type: 'provider' | 'community_service';
  originalProvider?: Provider;
  originalCommunityService?: CommunityService;
}

// Constants for better maintainability
const CATEGORY_IDS = {
  ALL: 'Alle',
  GEMEINSCHAFT_SPENDEN: '4470c3e0-458f-40a6-a96e-ca0fbdf145d7',
} as const;

// Type for search strategy
type SearchStrategy = 'providers_only' | 'community_services_only' | 'both';

/**
 * Determines the search strategy based on category
 */
function getSearchStrategy(category: string | null | undefined): SearchStrategy {
  // If no category or "All"/"Alle", search both providers and community services
  if (!category || category === CATEGORY_IDS.ALL || category === 'All' || category === 'Alle') {
    return 'both';
  }
  if (category === CATEGORY_IDS.GEMEINSCHAFT_SPENDEN) {
    return 'community_services_only';
  }
  return 'providers_only';
}

/**
 * Transforms a provider to SearchResult format
 */
function transformProviderToSearchResult(provider: Provider): SearchResult {
  return {
    id: provider.provider_id,
    name: provider.provider_name,
    images: provider.provider_images,
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
    barakah_effects: provider.barakah_effects,
    offers_ids: provider.offers_ids,
    needs_ids: provider.needs_ids,
    offers: provider.offers,
    needs: provider.needs,
    badges: provider.badges,
    category: provider.category,
    type: 'provider' as const,
    originalProvider: provider,
  };
}

/**
 * Transforms a community service to SearchResult format
 */
function transformCommunityServiceToSearchResult(communityService: CommunityService): SearchResult {
  return {
    id: communityService.community_service_id,
    name: communityService.community_service_name,
    images: communityService.community_service_images ? JSON.stringify(communityService.community_service_images) : null,
    category_id: communityService.category_id || null,
    address_city: communityService.address_city || null,
    social_website: communityService.social_website || null,
    social_instagram: communityService.social_instagram || null,
    contact_email: communityService.contact_email || null,
    contact_phone: communityService.contact_phone || null,
    address_street: communityService.address_street || null,
    address_country: communityService.address_country || null,
    address_zip: communityService.address_zip || null,
    location_latitude: communityService.location_latitude || null,
    location_longitude: communityService.location_longitude || null,
    created_at: communityService.created_at,
    updated_at: communityService.updated_at,
    barakah_effects: communityService.barakah_effects || [],
    offers_ids: communityService.offers_ids || [],
    needs_ids: communityService.needs_ids || [],
    offers: communityService.offers,
    needs: communityService.needs,
    badges: communityService.badges,
    category: communityService.category ? {
      name_de: communityService.category.name_de || 'Unbekannt',
      name_en: communityService.category.name_en,
      category_images: communityService.category.category_images,
    } : undefined,
    type: 'community_service' as const,
    originalCommunityService: communityService,
  };
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

/**
 * Main search function that handles all entity types with pagination
 */
export async function searchProvidersAndCommunityServices(
  query: string,
  category: string | null | undefined,
  location: string,
  page: number = 0,
  pageSize: number = 5,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  try {
    const strategy = getSearchStrategy(category);
    // Normalize category: convert null/undefined to empty string, which is handled as "all" by search functions
    const normalizedCategory = category || '';
    
    switch (strategy) {
      case 'community_services_only':
        return await searchCommunityServicesOnly(query, normalizedCategory, location, page, pageSize);
      
      case 'both':
        return await searchBoth(query, normalizedCategory, location, page, pageSize);
      
      case 'providers_only':
      default:
        return await searchProvidersOnly(query, normalizedCategory, location, page, pageSize);
    }
  } catch (error) {
    // Log error for debugging
    console.error('[searchProvidersAndCommunityServices] Error:', error);
    // Return empty results instead of throwing to prevent UI crashes
    return { results: [], hasMore: false };
  }
}

/**
 * Search only community services with pagination
 */
async function searchCommunityServicesOnly(
  query: string,
  category: string,
  location: string,
  page: number = 0,
  pageSize: number = 5,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more
  
  const communityServices = await searchCommunityServices(query, category, location, limit, offset);
  const hasMore = communityServices.length > pageSize;
  const results = communityServices.slice(0, pageSize).map(transformCommunityServiceToSearchResult);
  
  return { results, hasMore };
}

/**
 * Search only providers with pagination
 */
async function searchProvidersOnly(
  query: string,
  category: string,
  location: string,
  page: number = 0,
  pageSize: number = 5,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more
  
  const providers = await searchProviders(query, category, location, limit, offset);
  const hasMore = providers.length > pageSize;
  const results = providers.slice(0, pageSize).map(transformProviderToSearchResult);
  const sortedResults = sortByCreationDate(results);
  
  return { results: sortedResults, hasMore };
}

/**
 * Search both providers and community services with pagination
 */
async function searchBoth(
  query: string,
  category: string,
  location: string,
  page: number = 0,
  pageSize: number = 5,
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more
  
  // Fetch exactly what we need (not 2x)
  const [providers, communityServices] = await Promise.all([
    searchProviders(query, category, location, limit, offset),
    searchCommunityServices(query, CATEGORY_IDS.ALL, location, limit, offset)
  ]);

  const providerResults = providers.map(transformProviderToSearchResult);
  const communityServiceResults = communityServices.map(transformCommunityServiceToSearchResult);
  
  const combinedResults = sortByCreationDate([...providerResults, ...communityServiceResults]);
  const hasMore = combinedResults.length > pageSize;
  const results = combinedResults.slice(0, pageSize);
  
  return { results, hasMore };
}

export async function getProviders(limit?: number): Promise<Provider[]> {
  try {
    let query = supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en)')
      .order('created_at', { ascending: false });
    
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
        category:categories(name_de, name_en)
      `)
      .eq('provider_id', id)
      .maybeSingle();

    // If found in providers table, process and return
    if (data) {
      // Fetch offers, needs, and badges in parallel for better performance
      const [offersResult, needsResult, badges] = await Promise.all([
        // Fetch offers if they exist
        data.offers_ids && data.offers_ids.length > 0
          ? supabase
              .from('offers')
              .select('name_de')
              .in('offer_id', data.offers_ids)
          : Promise.resolve({ data: [], error: null }),
        
        // Fetch needs if they exist
        data.needs_ids && data.needs_ids.length > 0
          ? supabase
              .from('needs')
              .select('name_de')
              .in('need_id', data.needs_ids)
          : Promise.resolve({ data: [], error: null }),

        // Fetch badges for the provider
        getBadgesForEntity(id, EntityType.PROVIDER),
      ]);

      const offers = offersResult.data || [];
      const needs = needsResult.data || [];

      return {
        ...data,
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

export async function searchProviders(
  query: string,
  category: string,
  location: string,
  limit?: number,
  offset?: number,
): Promise<Provider[]> {
  let req = supabase.from('providers').select('*, category:categories(name_de, name_en)');
  
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
    const [matchingOffers, matchingNeeds, matchingProviderNames] = await Promise.all([
      searchOffers(query),
      searchNeeds(query),
      supabase.rpc('search_provider_ids_by_name', { search_query: query }),
    ]);

    const matchingOfferIds = matchingOffers.map(offer => offer.offer_id);
    const matchingNeedIds = matchingNeeds.map(need => need.need_id);
    const matchingProviderIds = Array.isArray(matchingProviderNames.data)
      ? matchingProviderNames.data.map((p: { provider_id: string }) => p.provider_id)
      : [];

    // Build the search condition to include:
    // 1. Provider name matches (using tsvector RPC — replaces previous ILIKE)
    // 2. Provider offers any of the matching offers (tsvector search)
    // 3. Provider fulfills any of the matching needs (tsvector search)
    const searchConditions: string[] = [];

    if (matchingProviderIds.length > 0) {
      searchConditions.push(`provider_id.in.(${matchingProviderIds.join(',')})`);
    }

    if (matchingOfferIds.length > 0) {
      searchConditions.push(`offers_ids.cs.{${matchingOfferIds.join(',')}}`);
    }

    if (matchingNeedIds.length > 0) {
      searchConditions.push(`needs_ids.cs.{${matchingNeedIds.join(',')}}`);
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

  // Batch fetch all offers and needs at once to avoid N+1 query problem
  const allOfferIds = Array.from(new Set(data.flatMap(p => p.offers_ids || [])));
  const allNeedIds = Array.from(new Set(data.flatMap(p => p.needs_ids || [])));

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
    offers: (provider.offers_ids || []).map(id => offersMap.get(id)).filter(Boolean) as Array<{ name_de: string }>,
    needs: (provider.needs_ids || []).map(id => needsMap.get(id)).filter(Boolean) as Array<{ name_de: string }>,
    offers_ids: provider.offers_ids || [],
    needs_ids: provider.needs_ids || [],
    barakah_effects: provider.barakah_effects || [],
  }));

  // Batch fetch badges for all providers in one query
  const allProviderIds = data.map(p => p.provider_id);
  const badgesMap = await getBadgesForEntities(
    allProviderIds,
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

export async function fetchProviderCities(): Promise<string[]> {
  try {
    // Fetch cities from both providers and community_services tables
    const [providersResult, communityServicesResult] = await Promise.all([
      supabase
        .from('providers')
        .select('address_city')
        .returns<{ address_city: string | null }[]>(),
      supabase
        .from('community_services')
        .select('address_city')
        .eq('review_status', 'approved') // Only include approved services
        .returns<{ address_city: string | null }[]>(),
    ]);

    if (providersResult.error) {
      throw providersResult.error;
    }

    if (communityServicesResult.error) {
      throw communityServicesResult.error;
    }

    // Combine cities from both sources
    const providerCities = providersResult.data?.map((p) => p.address_city) ?? [];
    const communityServiceCities = communityServicesResult.data?.map((cs) => cs.address_city) ?? [];
    const allCities = [...providerCities, ...communityServiceCities];

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

// Fetch cities that have content based on current search filters.
// Uses tsvector RPC search when a search query is provided (Plan 007:
// replaces previous ILIKE usage to comply with Postgres-first search rules).
export async function fetchFilteredCities(
  selectedCategory?: string | null,
  searchQuery?: string | null,
): Promise<string[]> {
  try {
    const trimmedQuery = searchQuery?.trim() || '';

    if (trimmedQuery) {
      // Use RPC-based tsvector search — replaces previous ILIKE on provider_name / community_service_name
      const categoryFilter = (selectedCategory && selectedCategory !== 'Alle')
        ? selectedCategory
        : null;

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_filtered_cities_by_search',
        {
          search_query: trimmedQuery,
          category_filter: categoryFilter,
        },
      );

      if (rpcError) {
        throw rpcError;
      }

      const cities = Array.isArray(rpcData)
        ? rpcData
            .map((row: { city: string }) => row.city)
            .filter((city: string): city is string =>
              typeof city === 'string' && city.trim() !== '' && city !== 'null')
        : [];

      return cities.sort((a: string, b: string) => a.localeCompare(b, 'de'));
    }

    // No search query — use direct queries (no ILIKE needed)
    let providersReq = supabase.from('providers').select('address_city');
    let communityServicesReq = supabase
      .from('community_services')
      .select('address_city')
      .eq('review_status', 'approved');

    // Apply category filter if specified
    if (selectedCategory && selectedCategory !== 'Alle') {
      providersReq = providersReq.eq('category_id', selectedCategory);
      communityServicesReq = communityServicesReq.eq('category_id', selectedCategory);
    }

    // Execute both queries in parallel
    const [providersResult, communityServicesResult] = await Promise.all([
      providersReq.returns<{ address_city: string | null }[]>(),
      communityServicesReq.returns<{ address_city: string | null }[]>(),
    ]);

    if (providersResult.error) {
      throw providersResult.error;
    }

    if (communityServicesResult.error) {
      throw communityServicesResult.error;
    }

    // Combine cities from both sources
    const providerCities = providersResult.data?.map((p) => p.address_city) ?? [];
    const communityServiceCities = communityServicesResult.data?.map((cs) => cs.address_city) ?? [];
    const allCities = [...providerCities, ...communityServiceCities];

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

// Get all bookmarked items (providers and community services) for a user
export async function getAllBookmarkedItems(userId: string): Promise<SearchResult[]> {
  const query = supabase
    .from('bookmarks')
    .select('bookmarkable_id, bookmarkable_type')
    .eq('user_id', userId);
  
  const { data: bookmarks, error: bookmarksError } = await query;

  if (bookmarksError) {
    console.error('[getAllBookmarkedItems] Error:', bookmarksError);
    throw bookmarksError;
  }

  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  // Separate providers and community services
  const providerIds = bookmarks
    .filter(b => b.bookmarkable_type === 'provider')
    .map(b => b.bookmarkable_id);
  
  const communityServiceIds = bookmarks
    .filter(b => b.bookmarkable_type === 'community_service')
    .map(b => b.bookmarkable_id);

  const results: SearchResult[] = [];

  // Fetch bookmarked providers
  if (providerIds.length > 0) {
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en)')
      .in('provider_id', providerIds)
      .returns<Provider[]>();

    if (providersError) {
      console.error('[getAllBookmarkedItems] Error fetching bookmarked providers:', providersError);
    } else if (providers && providers.length > 0) {
      const transformed = providers.map(transformProviderToSearchResult);
      results.push(...transformed);
      
      // Check if any requested providers are missing and clean up orphaned bookmarks
      if (providers.length < providerIds.length) {
        const foundIds = new Set(providers.map(p => p.provider_id));
        const missingIds = providerIds.filter(id => !foundIds.has(id));
        
        // Clean up orphaned bookmarks in the background
        if (missingIds.length > 0) {
          void (async () => {
            try {
              const { error } = await supabase
                .from('bookmarks')
                .delete()
                .in('bookmarkable_id', missingIds)
                .eq('bookmarkable_type', 'provider');
              
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

  // Fetch bookmarked community services
  if (communityServiceIds.length > 0) {
    const { data: communityServices, error: communityServicesError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en)')
      .in('community_service_id', communityServiceIds)
      .returns<CommunityService[]>();

    if (communityServicesError) {
      console.error('[getAllBookmarkedItems] Error fetching bookmarked community services:', communityServicesError);
    } else if (communityServices) {
      const transformed = communityServices.map(transformCommunityServiceToSearchResult);
      results.push(...transformed);
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