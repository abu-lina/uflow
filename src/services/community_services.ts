import { supabase } from '@/lib/supabase/client';

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
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_feedback?: string;
  barakah_effects?: string[];
  offers_ids?: string[];
  needs_ids?: string[];
  offers?: Array<{ name_de: string }>;
  needs?: Array<{ name_de: string }>;
  show_address?: boolean;
  user_created_id?: string;
  provider_id?: string;
  created_at: string;
  updated_at: string;
}

// Fetch all community services
export async function getCommunityServices(): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('review_status', 'approved') // Only show approved services
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  if (error) {
    console.error('Error fetching community services:', error);
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Search community services by name or description with pagination
export async function searchCommunityServices(
  query: string, 
  category: string = 'Alle', 
  location: string = 'Überall',
  limit?: number,
  offset?: number,
): Promise<CommunityService[]> {
  let req = supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('review_status', 'approved'); // Only show approved services

  // Apply search query filter if specified (before pagination for better query optimization)
  if (query && query.trim()) {
    req = req.or(`community_service_name.ilike.%${query.trim()}%,community_service_description.ilike.%${query.trim()}%`);
  }

  // Apply location filter if specified
  if (location && location !== 'Everywhere' && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  // Apply category filter if specified
  if (category && category !== 'All' && category !== 'Alle') {
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
  const { data, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('community_service_id', id)
    .single<CommunityService>();
  
  if (error) {
    throw error;
  }
  return data ?? null;
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
export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityService[]> {
  try {
    // First, get the relationship IDs
    const { data: relationshipData, error: relationshipError } = await supabase
      .from('provider_community_services')
      .select('community_service_id')
      .eq('provider_id', providerId);
    
    if (relationshipError) {
      throw relationshipError;
    }
    
    if (!relationshipData || relationshipData.length === 0) {
      throw new Error('No relationships found');
    }
    
    // Now get the community services for those IDs
    const communityServiceIds = relationshipData.map(r => r.community_service_id);
    
    const { data: communityServicesData, error: communityServicesError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en, category_images)')
      .in('community_service_id', communityServiceIds)
      .eq('review_status', 'approved')
      .order('community_service_name');
    
    if (communityServicesError) {
      throw communityServicesError;
    }
    
    if (communityServicesData && communityServicesData.length > 0) {
      return communityServicesData;
    }
    
    throw new Error('No community services found');
    
  } catch {
    // Fallback to old method if new relationship doesn't exist yet
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en, category_images)')
      .eq('provider_id', providerId)
      .eq('review_status', 'approved')
      .order('community_service_name')
      .returns<CommunityService[]>();
    
    if (fallbackError) {
      console.error('Error fetching community services:', fallbackError);
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
    const { data, error } = await supabase
      .from('provider_community_services')
      .select(`
        provider_id,
        providers!inner(
          provider_id,
          provider_name,
          address_city,
          category:categories(
            name_de,
            name_en
          )
        )
      `)
      .eq('community_service_id', communityServiceId)
      .eq('providers.review_status', 'approved')
      .order('providers.provider_name');
    
    if (error) {
      throw error;
    }
    
    return data?.map(item => item.providers) || [];
  } catch (error) {
    console.error('Error fetching providers for community service:', error);
    return [];
  }
}

// Legacy type alias for backward compatibility
export type CommunityServiceData = CommunityService;