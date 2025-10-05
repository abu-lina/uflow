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
  provider_id?: string;
  created_at: string;
  updated_at: string;
}

// Fetch all community services
export async function getCommunityServices(): Promise<CommunityService[]> {
  console.log('Fetching community services...');
  
  // First, let's check if there are any services at all
  const { data: allData, error: allError } = await supabase
    .from('community_services')
    .select('*')
    .limit(10);
    
  console.log('All community services (first 10):', allData);
  console.log('All services error:', allError);
  
  // Now fetch only approved services with category information
  const { data, error } = await supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved') // Only show approved services
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  console.log('Approved services:', data);
  console.log('Approved services error:', error);
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Search community services by name or description
export async function searchCommunityServices(
  query: string, 
  category: string = 'Alle', 
  location: string = 'Überall'
): Promise<CommunityService[]> {
  let req = supabase
    .from('community_services')
    .select('*')
    .eq('review_status', 'approved'); // Only show approved services

  // Apply search query filter if specified
  if (query && query.trim()) {
    req = req.or(`community_service_name.ilike.%${query.trim()}%,community_service_description.ilike.%${query.trim()}%`);
  }

  // Apply location filter if specified
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  // Apply category filter if specified
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }

  const { data, error } = await req
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Get community service by ID
export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
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

// Get community services for a specific provider
export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
    .eq('provider_id', providerId)
    .eq('review_status', 'approved') // Only show approved services
    .order('community_service_name')
    .returns<CommunityService[]>();
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Legacy type alias for backward compatibility
export type CommunityServiceData = CommunityService;