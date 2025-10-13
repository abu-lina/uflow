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
  };
  type: 'provider' | 'community_service';
  originalProvider?: Provider;
  originalCommunityService?: CommunityService;
}

export async function getProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de)')
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
    console.log('Fetching provider with ID:', id);
    
    // First, try to fetch as a provider
    const { data } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de)
      `)
      .eq('provider_id', id)
      .maybeSingle();
    
    // If found in providers table, process and return
    if (data) {
      console.log('Provider data:', data);

      // Fetch offers and needs separately
      let offers: Array<{ name_de: string }> = [];
      let needs: Array<{ name_de: string }> = [];

      if (data.offers_ids && data.offers_ids.length > 0) {
        console.log('Fetching offers for IDs:', data.offers_ids);
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('name_de')
          .in('offer_id', data.offers_ids);
        
        if (offersError) {
          console.error('Error fetching offers:', offersError);
        } else {
          offers = offersData || [];
          console.log('Fetched offers:', offers);
        }
      }

      if (data.needs_ids && data.needs_ids.length > 0) {
        console.log('Fetching needs for IDs:', data.needs_ids);
        const { data: needsData, error: needsError } = await supabase
          .from('needs')
          .select('name_de')
          .in('need_id', data.needs_ids);
        
        if (needsError) {
          console.error('Error fetching needs:', needsError);
        } else {
          needs = needsData || [];
          console.log('Fetched needs:', needs);
        }
      }

      // Transform the data to match our Provider interface
      const provider: Provider = {
        ...data,
        offers_ids: data.offers_ids || [],
        needs_ids: data.needs_ids || [],
        barakah_effects: data.barakah_effects || [],
        offers,
        needs,
      };

      console.log('Final provider object:', provider);
      return provider;
    }

    // If not found in providers, try community_services table
    console.log('Not found in providers table, trying community_services...');
    const { data: communityServiceData, error: csError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de)')
      .eq('community_service_id', id)
      .maybeSingle();

    if (csError) {
      console.error('Error fetching community service:', csError);
      throw csError;
    }

    if (!communityServiceData) {
      console.log('No provider or community service found with ID:', id);
      return null;
    }

    console.log('Community service data found:', communityServiceData);

    // Transform community service to Provider format for compatibility
    const provider: Provider = {
      provider_id: communityServiceData.community_service_id,
      provider_name: communityServiceData.community_service_name,
      provider_images: communityServiceData.community_service_images ? JSON.stringify(communityServiceData.community_service_images) : null,
      category_id: communityServiceData.category_id || null,
      address_city: communityServiceData.address_city || null,
      social_website: communityServiceData.social_website || null,
      social_instagram: communityServiceData.social_instagram || null,
      contact_email: communityServiceData.contact_email || null,
      contact_phone: communityServiceData.contact_phone || null,
      address_street: communityServiceData.address_street || null,
      address_country: communityServiceData.address_country || null,
      address_zip: communityServiceData.address_zip || null,
      location_latitude: communityServiceData.location_latitude || null,
      location_longitude: communityServiceData.location_longitude || null,
      created_at: communityServiceData.created_at,
      updated_at: communityServiceData.updated_at,
      barakah_effects: communityServiceData.barakah_effects || [],
      offers_ids: [],
      needs_ids: [],
      offers: [],
      needs: [],
      category: communityServiceData.category,
      community_service_id: communityServiceData.community_service_id,
    };

    console.log('Transformed community service to provider format:', provider);
    return provider;
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
  // Special handling for "Spenden" category - return community services
  if (category === '2335922b-76a9-4d79-b32a-b3f95941ba5c') {
    const communityServices = await searchCommunityServices(query, 'Alle', location);
    // Transform community services to provider format for compatibility
    return communityServices.map((communityService) => ({
      provider_id: communityService.community_service_id,
      provider_name: communityService.community_service_name,
      provider_images: communityService.community_service_images ? JSON.stringify(communityService.community_service_images) : null,
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
      offers_ids: [],
      needs_ids: [],
      category: { name_de: 'Community Services' },
      community_service_id: communityService.community_service_id,
    }));
  }

  let req = supabase.from('providers').select('*, category:categories(name_de)');

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
  
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
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

export async function searchProvidersAndCommunityServices(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const providers = await searchProviders(query, category, location);
  const communityServices = await searchCommunityServices(query, category, location);

  // Transform providers to SearchResult format
  const providerResults: SearchResult[] = providers.map((provider) => ({
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
  }));

  // Transform community services to SearchResult format
  const communityServiceResults: SearchResult[] = communityServices.map((communityService) => ({
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
    offers_ids: [],
    needs_ids: [],
    offers: [],
    needs: [],
    category: communityService.category ? { name_de: communityService.category.name_de || '' } : undefined,
    type: 'community_service' as const,
    originalCommunityService: communityService,
  }));

  const combinedResults: SearchResult[] = [...providerResults, ...communityServiceResults];

  // Sort by creation date (newest first)
  combinedResults.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return combinedResults;
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

/**
 * Fetch all providers bookmarked by a user (only providers, not community services)
 */
export async function getBookmarkedProviders(userId: string): Promise<Provider[]> {
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('user_id', userId)
    .eq('bookmarkable_type', 'provider')
    .returns<{ bookmarkable_id: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const providerIds = bookmarks.map((b) => b.bookmarkable_id);

  const { data: providers, error: providersError } = await supabase
    .from('providers')
    .select('*, category:categories(name_de)')
    .in('provider_id', providerIds)
    .returns<Provider[]>();

  if (providersError) {
    throw providersError;
  }
  return Array.isArray(providers) ? providers : [];
}

/**
 * Fetch all bookmarked items (both providers and community services)
 */
export async function getAllBookmarkedItems(userId: string): Promise<Provider[]> {
  // Fetch all bookmarks for this user
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id, bookmarkable_type')
    .eq('user_id', userId)
    .returns<{ bookmarkable_id: string; bookmarkable_type: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  // Separate provider and community service IDs
  const providerIds = bookmarks
    .filter((b) => b.bookmarkable_type === 'provider')
    .map((b) => b.bookmarkable_id);
  const communityServiceIds = bookmarks
    .filter((b) => b.bookmarkable_type === 'community_service')
    .map((b) => b.bookmarkable_id);

  const results: Provider[] = [];

  // Fetch providers if any
  if (providerIds.length > 0) {
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*, category:categories(name_de)')
      .in('provider_id', providerIds)
      .returns<Provider[]>();

    if (providersError) {
      console.error('Error fetching bookmarked providers:', providersError);
    } else if (providers) {
      results.push(...providers);
    }
  }

  // Fetch community services if any
  if (communityServiceIds.length > 0) {
    const { data: communityServices, error: csError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de)')
      .in('community_service_id', communityServiceIds);

    if (csError) {
      console.error('Error fetching bookmarked community services:', csError);
    } else if (communityServices) {
      // Transform community services to Provider format
      const transformedServices = communityServices.map((cs) => ({
        provider_id: cs.community_service_id,
        provider_name: cs.community_service_name,
        provider_images: cs.community_service_images ? JSON.stringify(cs.community_service_images) : null,
        category_id: cs.category_id || null,
        address_city: cs.address_city || null,
        social_website: cs.social_website || null,
        social_instagram: cs.social_instagram || null,
        contact_email: cs.contact_email || null,
        contact_phone: cs.contact_phone || null,
        address_street: cs.address_street || null,
        address_country: cs.address_country || null,
        address_zip: cs.address_zip || null,
        location_latitude: cs.location_latitude || null,
        location_longitude: cs.location_longitude || null,
        created_at: cs.created_at,
        updated_at: cs.updated_at,
        barakah_effects: cs.barakah_effects || [],
        offers_ids: [],
        needs_ids: [],
        offers: [],
        needs: [],
        category: cs.category ? { name_de: cs.category.name_de || '' } : undefined,
        community_service_id: cs.community_service_id,
      }));
      results.push(...transformedServices);
    }
  }

  return results;
}

/**
 * Fetch cities from all bookmarked items for a user
 */
export async function fetchBookmarkedCities(userId: string): Promise<string[]> {
  // Fetch all bookmarks for this user
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id, bookmarkable_type')
    .eq('user_id', userId)
    .returns<{ bookmarkable_id: string; bookmarkable_type: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  // Separate provider and community service IDs
  const providerIds = bookmarks
    .filter((b) => b.bookmarkable_type === 'provider')
    .map((b) => b.bookmarkable_id);
  const communityServiceIds = bookmarks
    .filter((b) => b.bookmarkable_type === 'community_service')
    .map((b) => b.bookmarkable_id);

  const allCities: string[] = [];

  // Fetch cities from providers if any
  if (providerIds.length > 0) {
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('address_city')
      .in('provider_id', providerIds)
      .returns<{ address_city: string | null }[]>();

    if (providersError) {
      console.error('Error fetching bookmarked provider cities:', providersError);
    } else if (providers) {
      allCities.push(...providers.map(p => p.address_city).filter((city): city is string => 
        typeof city === 'string' && city.trim() !== '' && city !== 'null'
      ));
    }
  }

  // Fetch cities from community services if any
  if (communityServiceIds.length > 0) {
    const { data: communityServices, error: csError } = await supabase
      .from('community_services')
      .select('address_city')
      .in('community_service_id', communityServiceIds)
      .returns<{ address_city: string | null }[]>();

    if (csError) {
      console.error('Error fetching bookmarked community service cities:', csError);
    } else if (communityServices) {
      allCities.push(...communityServices.map(cs => cs.address_city).filter((city): city is string => 
        typeof city === 'string' && city.trim() !== '' && city !== 'null'
      ));
    }
  }

  // Return unique cities, sorted alphabetically
  const uniqueCities = Array.from(new Set(allCities));
  
  // Check if we have any bookmarked items without cities (online businesses)
  let hasOnlineBusinesses = false;
  
  // Check providers
  if (providerIds.length > 0) {
    const { data: providers } = await supabase
      .from('providers')
      .select('address_city')
      .in('provider_id', providerIds)
      .returns<{ address_city: string | null }[]>();
    
    if (providers) {
      hasOnlineBusinesses = providers.some(p => !p.address_city || p.address_city.trim() === '');
    }
  }
  
  // Check community services
  if (communityServiceIds.length > 0) {
    const { data: communityServices } = await supabase
      .from('community_services')
      .select('address_city')
      .in('community_service_id', communityServiceIds)
      .returns<{ address_city: string | null }[]>();
    
    if (communityServices) {
      hasOnlineBusinesses = hasOnlineBusinesses || communityServices.some(cs => !cs.address_city || cs.address_city.trim() === '');
    }
  }
  
  // Add "Online" if we have online businesses
  if (hasOnlineBusinesses) {
    uniqueCities.push('Online');
  }
  
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
}

/**
 * Fetch all providers created by a user (as owner)
 */
export async function getCreatedProviders(userId: string): Promise<Provider[]> {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de)')
    .eq('provider_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    throw error;
  }

  if (!Array.isArray(providers) || providers.length === 0) {
    return [];
  }

  // Get bookmark counts for each provider
  const providerIds = providers.map(p => p.provider_id);
  const { data: bookmarkCounts, error: bookmarkError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('bookmarkable_type', 'provider')
    .in('bookmarkable_id', providerIds);

  if (bookmarkError) {
    console.error('Error fetching bookmark counts:', bookmarkError);
    // Return providers without bookmark counts if there's an error
    return providers;
  }

  // Count bookmarks for each provider
  const bookmarkCountMap = new Map<string, number>();
  if (bookmarkCounts) {
    bookmarkCounts.forEach(bookmark => {
      const count = bookmarkCountMap.get(bookmark.bookmarkable_id) || 0;
      bookmarkCountMap.set(bookmark.bookmarkable_id, count + 1);
    });
  }

  // Add bookmark counts to providers
  return providers.map(provider => ({
    ...provider,
    bookmark_count: bookmarkCountMap.get(provider.provider_id) || 0
  }));
}

/**
 * Fetch all providers recommended by a user (not as owner)
 */
export async function getRecommendedProviders(userId: string): Promise<Provider[]> {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de)')
    .eq('user_created_id', userId)
    .order('created_at', { ascending: false })
    .returns<Provider[]>();

  if (error) {
    throw error;
  }

  if (!Array.isArray(providers) || providers.length === 0) {
    return [];
  }

  // Get bookmark counts for each provider
  const providerIds = providers.map(p => p.provider_id);
  const { data: bookmarkCounts, error: bookmarkError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('bookmarkable_type', 'provider')
    .in('bookmarkable_id', providerIds);

  if (bookmarkError) {
    console.error('Error fetching bookmark counts:', bookmarkError);
    // Return providers without bookmark counts if there's an error
    return providers;
  }

  // Count bookmarks for each provider
  const bookmarkCountMap = new Map<string, number>();
  if (bookmarkCounts) {
    bookmarkCounts.forEach(bookmark => {
      const count = bookmarkCountMap.get(bookmark.bookmarkable_id) || 0;
      bookmarkCountMap.set(bookmark.bookmarkable_id, count + 1);
    });
  }

  // Add bookmark counts to providers
  return providers.map(provider => ({
    ...provider,
    bookmark_count: bookmarkCountMap.get(provider.provider_id) || 0
  }));
}
