import { supabase } from '@/lib/supabase/client';
import { searchCommunityServices, type CommunityService } from './community_services';

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
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  category?: {
    name_de: string;
  };
  community_service_id?: string | null;
  bookmark_count?: number;
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
    
    const { data, error } = await supabase
      .from('providers')
      .select(`
        *,
        category:categories(name_de)
      `)
      .eq('provider_id', id)
      .single();
    
    if (error) {
      console.error('Error fetching provider:', error);
      throw error;
    }
    
    if (!data) {
      console.log('No provider found with ID:', id);
      return null;
    }

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
      category_id: communityService.category_id,
      address_city: communityService.address_city,
      social_website: communityService.social_website,
      social_instagram: communityService.social_instagram,
      contact_email: communityService.contact_email,
      contact_phone: communityService.contact_phone,
      address_street: communityService.address_street,
      address_country: communityService.address_country,
      address_zip: communityService.address_zip,
      location_latitude: communityService.location_latitude,
      location_longitude: communityService.location_longitude,
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
    req = req.ilike('provider_name', `%${query}%`);
  }
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<Provider[]>();
  if (error) throw error;

  return Array.isArray(data) ? data : [];
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
    category: provider.category,
    type: 'provider' as const,
    originalProvider: provider,
  }));

  // Transform community services to SearchResult format
  const communityServiceResults: SearchResult[] = communityServices.map((communityService) => ({
    id: communityService.community_service_id,
    name: communityService.community_service_name,
    images: communityService.community_service_images ? JSON.stringify(communityService.community_service_images) : null,
    category_id: communityService.category_id,
    address_city: communityService.address_city,
    social_website: communityService.social_website,
    social_instagram: communityService.social_instagram,
    contact_email: communityService.contact_email,
    contact_phone: communityService.contact_phone,
    address_street: communityService.address_street,
    address_country: communityService.address_country,
    address_zip: communityService.address_zip,
    location_latitude: communityService.location_latitude,
    location_longitude: communityService.location_longitude,
    created_at: communityService.created_at,
    updated_at: communityService.updated_at,
    barakah_effects: communityService.barakah_effects || [],
    offers_ids: [],
    needs_ids: [],
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
 * Fetch all providers bookmarked by a user
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
 * Fetch all providers created by a user
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
