import { supabase } from '@/lib/supabase/client';
import { logSupabaseError } from '@/utils/errorUtils';
import type { ProviderBadgeWithType } from '@/types/badges';

export interface CommunityService {
  id?: string;
  community_service_id: string;
  community_service_name: string;
  community_service_description?: string;
  community_service_logo?: Record<string, unknown>; // JSONB
  community_service_images?: string[];
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  community_service_view_count?: number;
  donation_count?: number;
  category_id?: string;
  category?: {
    name_de?: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  };
  contact_email?: string;
  contact_phone?: string;
  social_website?: string;
  social_instagram?: string;
  address_street?: string;
  address_zip?: string;
  address_city?: string;
  address_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision' | 'removed_by_owner';
  review_feedback?: string;
  offers_ids?: string[];
  needs_ids?: string[];
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  show_address?: boolean;
  user_created_id?: string;
  provider_id?: string;
  created_at: string;
  updated_at: string;
  badges?: ProviderBadgeWithType[];
}

// Fetch all community services
export async function getCommunityServices(): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved') // Only show approved services
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  if (error) {
    console.error('Error fetching community services:', error);
    throw error;
  }
  return Array.isArray(data) ? data : [];
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

// Search community services by name or description with pagination
export async function searchCommunityServices(
  query: string, 
  category: string = '', 
  location: string = '',
  limit?: number,
  offset?: number,
): Promise<CommunityService[]> {
  let req = supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved'); // Only show approved services

  // Apply search query filter if specified (before pagination for better query optimization)
  // Use full-text search via RPC function for better performance with tsvector indexes
  if (query && query.trim()) {
    try {
      const { data: searchResults, error: rpcError } = await supabase.rpc('search_community_services_enhanced', {
        search_query: query.trim(),
        category_filter: isValidCategoryId(category) ? category : null,
        city_filter: isValidLocation(location) ? location : null,
        limit_count: limit || 1000, // Default 1000 — paginated listing; higher than offers/needs because community services have richer browsing UX
        offset_count: offset || 0,
      });

      // If RPC succeeded (no error), use the results — even if empty.
      // Empty results from full-text search are valid (no matches), NOT a reason to fallback.
      if (!rpcError && searchResults && Array.isArray(searchResults)) {
        if (searchResults.length > 0) {
          // Use the IDs from full-text search results
          const serviceIds = searchResults.map((s: { community_service_id: string }) => s.community_service_id);
          req = req.in('community_service_id', serviceIds);
        }
        // else: empty result set — no matches found, no fallback needed
      } else {
        // RPC error occurred — fallback to ILIKE
        const isFunctionNotFound = 
          rpcError?.code === '42883' || 
          rpcError?.message?.includes('does not exist') ||
          rpcError?.message?.includes('function') && rpcError?.message?.includes('not found');

        if (isFunctionNotFound) {
          // Silently fallback - this is expected during migration
          console.debug('Full-text search function not available, using ILIKE fallback');
        } else if (rpcError) {
          // Log other errors but still fallback
          console.warn('Error using full-text search, falling back to ILIKE:', rpcError);
        }
        // Fallback to ILIKE only on RPC error / function-missing
        req = req.or(`community_service_name.ilike.%${query.trim()}%,community_service_description.ilike.%${query.trim()}%`);
      }
    } catch (error) {
      // Catch any exceptions (e.g., function doesn't exist)
      console.debug('Full-text search not available, using ILIKE fallback:', error);
      req = req.or(`community_service_name.ilike.%${query.trim()}%,community_service_description.ilike.%${query.trim()}%`);
    }
  }

  // Apply location filter if specified
  if (isValidLocation(location)) {
    req = req.eq('address_city', location);
  }

  // Apply category filter if specified
  if (isValidCategoryId(category)) {
    req = req.eq('category_id', category);
  }

  // Always order by created_at descending for consistent pagination
  req = req.order('created_at', { ascending: false });

  // Apply pagination if provided (after ordering)
  if (limit !== undefined) {
    req = req.limit(limit);
  }
  if (offset !== undefined) {
    req = req.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await req.returns<CommunityService[]>();
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Get community service by ID
export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  try {
  const { data, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en)')
    .eq('community_service_id', id)
    .single<CommunityService>();
  
  if (error) {
    throw error;
  }

    if (!data) {
      return null;
    }

    // Fetch offers and needs in parallel (similar to getProviderById)
    const [offersResult, needsResult] = await Promise.all([
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
    ]);

    const offers = offersResult.data || [];
    const needs = needsResult.data || [];

    return {
      ...data,
      offers,
      needs,
    };
  } catch (error) {
    console.error('Error in getCommunityServiceById:', error);
    throw error;
  }
}

// Get community services by category
export async function getCommunityServicesByCategory(categoryId: string): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
    .eq('category_id', categoryId)
    .eq('review_status', 'approved') // Only show approved services
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Get community services for a specific provider using the new many-to-many relationship
// Optimized to use a single query through the relationship table
export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityService[]> {
  try {
    // Use a single query through the relationship table to fetch community services
    // This avoids the 2-query pattern and is more efficient
    const { data: relationshipData, error: relationshipError } = await supabase
      .from('provider_community_services')
      .select(`
        community_services:community_services(
          *,
          category:categories(name_de, name_en)
        )
      `)
      .eq('provider_id', providerId);
    
    if (relationshipError) {
      throw relationshipError;
    }
    
    if (!relationshipData || relationshipData.length === 0) {
      // Try fallback to old method if no relationships found
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('community_services')
        .select('*, category:categories(name_de, name_en)')
        .eq('provider_id', providerId)
        .eq('review_status', 'approved')
        .order('community_service_name')
        .returns<CommunityService[]>();
      
      if (fallbackError) {
        console.error('Error fetching community services (fallback):', fallbackError);
        return [];
      }
      
      return Array.isArray(fallbackData) ? fallbackData : [];
    }
    
    // Extract community services from relationship data and filter by review_status
    // Handle both array and single object cases from Supabase nested select
    const communityServices = relationshipData
      .map((rel: { community_services: CommunityService | CommunityService[] | null }) => {
        const cs = rel.community_services;
        // If it's an array, take the first element; otherwise return as-is
        return Array.isArray(cs) ? cs[0] : cs;
      })
      .filter((cs: CommunityService | null | undefined): cs is CommunityService => 
        cs !== null && cs !== undefined && cs.review_status === 'approved'
      )
      .sort((a: CommunityService, b: CommunityService) => 
        a.community_service_name.localeCompare(b.community_service_name)
      );
    
    return communityServices;
    
  } catch (error) {
    // Fallback to old method if new relationship doesn't exist yet
    console.error('Error fetching community services, trying fallback:', error);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en)')
      .eq('provider_id', providerId)
      .eq('review_status', 'approved')
      .order('community_service_name')
      .returns<CommunityService[]>();
    
    if (fallbackError) {
      console.error('Error fetching community services (fallback):', fallbackError);
      return [];
    }
    
    return Array.isArray(fallbackData) ? fallbackData : [];
  }
}

// Create relationship between provider and community service
export async function createProviderCommunityServiceRelationship(
  providerId: string, 
  communityServiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_community_services')
      .insert({
        provider_id: providerId,
        community_service_id: communityServiceId
      });
    
    if (error) {
      console.error('Error creating provider-community service relationship:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating provider-community service relationship:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

// Remove relationship between provider and community service
export async function removeProviderCommunityServiceRelationship(
  providerId: string, 
  communityServiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('provider_community_services')
      .delete()
      .eq('provider_id', providerId)
      .eq('community_service_id', communityServiceId);
    
    if (error) {
      console.error('Error removing provider-community service relationship:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing provider-community service relationship:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

// Get providers supporting a specific community service
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProvidersForCommunityService(communityServiceId: string): Promise<any[]> {
  try {
    // First, get the provider IDs from the relationship table
    const { data: relationshipData, error: relationshipError } = await supabase
      .from('provider_community_services')
      .select('provider_id')
      .eq('community_service_id', communityServiceId);
    
    if (relationshipError) {
      throw relationshipError;
    }
    
    if (!relationshipData || relationshipData.length === 0) {
      return [];
    }
    
    const providerIds = relationshipData.map(r => r.provider_id);
    
    // Then, query providers with category relationship
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select(`
        provider_id,
        provider_name,
        provider_images,
        address_city,
        category:categories(
          name_de,
          name_en
        )
      `)
      .in('provider_id', providerIds)
      .eq('review_status', 'approved')
      .order('provider_name');
    
    if (providersError) {
      throw providersError;
    }
    
    return providersData || [];
  } catch (error) {
    console.error('Error fetching providers for community service:', error);
    return [];
  }
}

// Legacy type alias for backward compatibility
export type CommunityServiceData = CommunityService;

// Get community services created by a specific user
export async function getCreatedCommunityServices(userId: string): Promise<CommunityService[]> {
  try {
    const { data, error } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en)')
      .eq('user_created_id', userId)
      .order('created_at', { ascending: false })
      .returns<CommunityService[]>();

    if (error) {
      logSupabaseError('communityServices.getCreatedCommunityServices', error);
      // Log additional details before throwing
      if (error instanceof Error) {
        console.error('Error fetching created community services:', error.message, error);
      } else {
        console.error('Error fetching created community services:', JSON.stringify(error, null, 2), error);
      }
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching created community services: ${error.message}. ` +
        'This usually means:\n' +
        '1. Check your internet connection\n' +
        '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
        '3. Check if Supabase project is accessible\n' +
        '4. Restart your dev server after updating .env.local'
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    // Re-throw other errors
    throw error;
  }
}

// Get recommended community services by a specific user (where user created but there's no owner)
// Note: Community services don't have an owner concept like providers
// Since community services created by the user should only appear in "content", 
// this function returns an empty array to avoid duplicates
// If you want recommendations for community services, define the logic here
export async function getRecommendedCommunityServices(_userId: string): Promise<CommunityService[]> {
  // For now, return empty array since community services created by user should only appear in "content"
  // This prevents duplicates where the same community service appears in both sections
  // If recommendations for community services are needed in the future, add logic here
  return [];
}