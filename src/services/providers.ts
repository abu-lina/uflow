import { supabase } from '@/lib/supabase/client';
import { searchCommunityServices, type CommunityService } from './community_services';
import { searchOffers } from './offers';
import { searchNeeds } from './needs';

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
function getSearchStrategy(category: string): SearchStrategy {
  if (category === CATEGORY_IDS.GEMEINSCHAFT_SPENDEN) {
    return 'community_services_only';
  }
  if (category === CATEGORY_IDS.ALL) {
    return 'both';
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
 * Main search function that handles all entity types
 */
export async function searchProvidersAndCommunityServices(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const strategy = getSearchStrategy(category);
  
  switch (strategy) {
    case 'community_services_only':
      return await searchCommunityServicesOnly(query, category, location);
    
    case 'both':
      return await searchBoth(query, category, location);
    
    case 'providers_only':
    default:
      return await searchProvidersOnly(query, category, location);
  }
}

/**
 * Search only community services
 */
async function searchCommunityServicesOnly(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const communityServices = await searchCommunityServices(query, category, location);
  return communityServices.map(transformCommunityServiceToSearchResult);
}

/**
 * Search only providers
 */
async function searchProvidersOnly(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const providers = await searchProviders(query, category, location);
  const results = providers.map(transformProviderToSearchResult);
  return sortByCreationDate(results);
}

/**
 * Search both providers and community services
 */
async function searchBoth(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const [providers, communityServices] = await Promise.all([
    searchProviders(query, category, location),
    searchCommunityServices(query, CATEGORY_IDS.ALL, location)
  ]);

  const providerResults = providers.map(transformProviderToSearchResult);
  const communityServiceResults = communityServices.map(transformCommunityServiceToSearchResult);
  
  const combinedResults = [...providerResults, ...communityServiceResults];
  return sortByCreationDate(combinedResults);
}

export async function getProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching providers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function getProviderById(id: string): Promise<Provider | null> {
  try {
    // First, try to fetch as a provider
    const { data } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de, name_en, category_images)
      `)
      .eq('provider_id', id)
      .maybeSingle();

    // If found in providers table, process and return
    if (data) {
      // Fetch offers and needs separately
      let offers: Array<{ name_de: string }> = [];
      let needs: Array<{ name_de: string }> = [];

      if (data.offers_ids && data.offers_ids.length > 0) {
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('name_de')
          .in('offer_id', data.offers_ids);

        if (!offersError && offersData) {
          offers = offersData;
        }
      }

      if (data.needs_ids && data.needs_ids.length > 0) {
        const { data: needsData, error: needsError } = await supabase
          .from('needs')
          .select('name_de')
          .in('need_id', data.needs_ids);

        if (!needsError && needsData) {
          needs = needsData;
        }
      }

      return {
        ...data,
        offers,
        needs,
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
): Promise<Provider[]> {
  let req = supabase.from('providers').select('*, category:categories(name_de, name_en, category_images)');

  if (query) {
    // First, search for matching offers and needs to get their IDs
    const [matchingOffers, matchingNeeds] = await Promise.all([
      searchOffers(query),
      searchNeeds(query)
    ]);

    const matchingOfferIds = matchingOffers.map(offer => offer.offer_id);
    const matchingNeedIds = matchingNeeds.map(need => need.need_id);

    // Build the search condition to include:
    // 1. Provider name matches
    // 2. Provider offers any of the matching offers
    // 3. Provider fulfills any of the matching needs
    const searchConditions = [`provider_name.ilike.%${query}%`];

    if (matchingOfferIds.length > 0) {
      searchConditions.push(`offers_ids.cs.{${matchingOfferIds.join(',')}}`);
    }

    if (matchingNeedIds.length > 0) {
      searchConditions.push(`needs_ids.cs.{${matchingNeedIds.join(',')}}`);
    }

    req = req.or(searchConditions.join(','));
  }

  if (category && category !== 'All' && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Everywhere' && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<Provider[]>();
  if (error) throw error;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Fetch offers and needs for each provider
  const providersWithOffersAndNeeds = await Promise.all(
    data.map(async (provider) => {
      let offers: Array<{ name_de: string }> = [];
      let needs: Array<{ name_de: string }> = [];

      if (provider.offers_ids && provider.offers_ids.length > 0) {
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('name_de')
          .in('offer_id', provider.offers_ids);

        if (!offersError && offersData) {
          offers = offersData;
        }
      }

      if (provider.needs_ids && provider.needs_ids.length > 0) {
        const { data: needsData, error: needsError } = await supabase
          .from('needs')
          .select('name_de')
          .in('need_id', provider.needs_ids);

        if (!needsError && needsData) {
          needs = needsData;
        }
      }

      return {
        ...provider,
        offers_ids: provider.offers_ids || [],
        needs_ids: provider.needs_ids || [],
        barakah_effects: provider.barakah_effects || [],
        offers,
        needs,
      };
    })
  );

  return providersWithOffersAndNeeds;
}

export async function fetchProviderCities(): Promise<string[]> {
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
}

// Fetch cities that have content based on current search filters
export async function fetchFilteredCities(
  selectedCategory?: string | null,
  searchQuery?: string | null,
): Promise<string[]> {
  let req = supabase.from('providers').select('address_city');

  // Apply category filter if specified
  if (selectedCategory && selectedCategory !== 'Alle') {
    req = req.eq('category_id', selectedCategory);
  }

  // Apply search query filter if specified
  if (searchQuery && searchQuery.trim()) {
    req = req.ilike('provider_name', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await req.returns<{ address_city: string | null }[]>();

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

// Get providers created by a specific user
export async function getCreatedProviders(userId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('user_created_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    console.error('Error fetching created providers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

// Get all bookmarked items (providers and community services) for a user
export async function getAllBookmarkedItems(userId: string): Promise<SearchResult[]> {
  console.log('[getAllBookmarkedItems] Starting query for userId:', userId);
  
  const query = supabase
    .from('bookmarks')
    .select('bookmarkable_id, bookmarkable_type')
    .eq('user_id', userId);
  
  console.log('[getAllBookmarkedItems] Query built, awaiting...');
  const { data: bookmarks, error: bookmarksError } = await query;
  console.log('[getAllBookmarkedItems] Query response:', { 
    hasData: !!bookmarks, 
    count: bookmarks?.length || 0,
    hasError: !!bookmarksError 
  });

  if (bookmarksError) {
    console.error('[getAllBookmarkedItems] Error:', bookmarksError);
    throw bookmarksError;
  }

  if (!bookmarks || bookmarks.length === 0) {
    console.log('[getAllBookmarkedItems] No bookmarks found');
    return [];
  }

  // Separate providers and community services
  const providerIds = bookmarks
    .filter(b => b.bookmarkable_type === 'provider')
    .map(b => b.bookmarkable_id);
  
  const communityServiceIds = bookmarks
    .filter(b => b.bookmarkable_type === 'community_service')
    .map(b => b.bookmarkable_id);

  console.log('[getAllBookmarkedItems] Separated:', {
    totalBookmarks: bookmarks.length,
    providerIds: providerIds.length,
    communityServiceIds: communityServiceIds.length,
    providerIds_list: providerIds,
    communityServiceIds_list: communityServiceIds
  });

  const results: SearchResult[] = [];

  // Fetch bookmarked providers
  if (providerIds.length > 0) {
    console.log('[getAllBookmarkedItems] Fetching providers...');
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*, category:categories(name_de, name_en, category_images)')
      .in('provider_id', providerIds)
      .returns<Provider[]>();

    console.log('[getAllBookmarkedItems] Providers query result:', {
      found: providers?.length || 0,
      requested: providerIds.length,
      hasError: !!providersError,
      error: providersError?.message
    });

    if (providersError) {
      console.error('[getAllBookmarkedItems] Error fetching bookmarked providers:', providersError);
    } else if (providers && providers.length > 0) {
      const transformed = providers.map(transformProviderToSearchResult);
      console.log('[getAllBookmarkedItems] Transformed providers:', transformed.length);
      results.push(...transformed);
      
      // Check if any requested providers are missing
      if (providers.length < providerIds.length) {
        const foundIds = new Set(providers.map(p => p.provider_id));
        const missingIds = providerIds.filter(id => !foundIds.has(id));
        console.warn('[getAllBookmarkedItems] Missing providers (bookmarked but deleted):', missingIds);
        
        // Clean up orphaned bookmarks - remove bookmarks for providers that don't exist
        // This prevents the issue from persisting
        if (missingIds.length > 0) {
          console.log('[getAllBookmarkedItems] Cleaning up orphaned bookmarks for deleted providers...');
          // Note: We'll clean these up in the background, but won't block the current request
          void (async () => {
            try {
              const { error } = await supabase
                .from('bookmarks')
                .delete()
                .in('bookmarkable_id', missingIds)
                .eq('bookmarkable_type', 'provider');
              
              if (error) {
                console.error('[getAllBookmarkedItems] Error cleaning up orphaned bookmarks:', error);
              } else {
                console.log('[getAllBookmarkedItems] Successfully cleaned up', missingIds.length, 'orphaned bookmarks');
              }
            } catch (err) {
              console.error('[getAllBookmarkedItems] Exception cleaning bookmarks:', err);
            }
          })();
        }
      }
    } else {
      console.warn('[getAllBookmarkedItems] No providers found for IDs:', providerIds);
    }
  }

  // Fetch bookmarked community services
  if (communityServiceIds.length > 0) {
    console.log('[getAllBookmarkedItems] Fetching community services...');
    const { data: communityServices, error: communityServicesError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en, category_images)')
      .in('community_service_id', communityServiceIds)
      .returns<CommunityService[]>();

    console.log('[getAllBookmarkedItems] Community services query result:', {
      found: communityServices?.length || 0,
      requested: communityServiceIds.length,
      hasError: !!communityServicesError
    });

    if (communityServicesError) {
      console.error('[getAllBookmarkedItems] Error fetching bookmarked community services:', communityServicesError);
    } else if (communityServices) {
      const transformed = communityServices.map(transformCommunityServiceToSearchResult);
      console.log('[getAllBookmarkedItems] Transformed community services:', transformed.length);
      results.push(...transformed);
    }
  }

  console.log('[getAllBookmarkedItems] Final results before sorting:', results.length);
  const sorted = sortByCreationDate(results);
  console.log('[getAllBookmarkedItems] Final results after sorting:', sorted.length);
  return sorted;
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