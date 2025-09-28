import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

export interface CommunityService {
  community_service_id: string;
  community_service_name: string;
  community_service_description: string | null;
  community_service_logo: Json | null;
  is_verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  community_service_view_count: number | null;
  donation_count: number | null;
  category_id: string | null;
  updated_at: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_instagram: string | null;
  social_website: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  review_status: string | null;
  review_feedback: string | null;
  community_service_images: string[] | null;
  barakah_effects: string[] | null;
  provider_id: string;
  created_at: string | null;
}

export interface CommunityServiceData {
  community_service_id: string;
  community_service_name: string;
  community_service_description: string;
  community_service_images: string[];
}

export async function getCommunityServices(): Promise<CommunityService[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<CommunityService[]>();

  if (error) {
    console.error('Error fetching community services:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
    .eq('community_service_id', id)
    .single<CommunityService>();

  if (error) {
    console.error('Error fetching community service:', error);
    throw error;
  }

  return data ?? null;
}

export async function searchCommunityServices(
  query: string,
  category: string,
  location: string,
): Promise<CommunityService[]> {
  let req = supabase.from('community_services').select('*');

  if (query) {
    req = req.ilike('community_service_name', `%${query}%`);
  }
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<CommunityService[]>();
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchCommunityServiceCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('address_city')
    .returns<{ address_city: string | null }[]>();

  if (error) {
    throw error;
  }

  const allCities = data?.map((s) => s.address_city) ?? [];
  const uniqueCities = Array.from(
    new Set(
      allCities.filter((city): city is string => {
        return typeof city === 'string' && city.trim() !== '' && city !== 'null';
      }),
    ),
  );
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
}

export async function getBookmarkedCommunityServices(userId: string): Promise<CommunityService[]> {
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('user_id', userId)
    .eq('bookmarkable_type', 'community_service')
    .returns<{ bookmarkable_id: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const communityServiceIds = bookmarks.map((b) => b.bookmarkable_id);

  const { data: communityServices, error: communityServiceError } = await supabase
    .from('community_services')
    .select('*')
    .in('community_service_id', communityServiceIds)
    .returns<CommunityService[]>();

  if (communityServiceError) {
    throw communityServiceError;
  }
  return Array.isArray(communityServices) ? communityServices : [];
}

export async function getCreatedCommunityServices(userId: string): Promise<CommunityService[]> {
  const { data: communityServices, error } = await supabase
    .from('community_services')
    .select('*')
    .eq('community_service_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<CommunityService[]>();

  if (error) {
    throw error;
  }
  return Array.isArray(communityServices) ? communityServices : [];
}

export async function getCommunityServiceByProviderId(providerId: string): Promise<CommunityService | null> {
  const { data, error } = await supabase
    .from('community_services')
    .select('*')
    .eq('provider_id', providerId)
    .maybeSingle<CommunityService>();

  if (error) {
    console.error('Supabase error:', error);
    return null;
  }

  return data ?? null;
}

export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityServiceData[]> {
  const { data, error } = await supabase
    .from('community_services')
    .select('community_service_id, community_service_name, community_service_description, community_service_images')
    .eq('provider_id', providerId)
    .returns<CommunityServiceData[]>();
  if (error) throw error;
  return data || [];
}

// Legacy aliases for backward compatibility during transition
export const getZakat = getCommunityServices;
export const getZakatById = getCommunityServiceById;
export const searchZakat = searchCommunityServices;
export const fetchZakatCities = fetchCommunityServiceCities;
export const getBookmarkedZakat = getBookmarkedCommunityServices;
export const getCreatedZakat = getCreatedCommunityServices;
export const getZakatByProviderId = getCommunityServiceByProviderId;
export const getZakatProjectsForProvider = getCommunityServicesForProvider;

export type Zakat = CommunityService;
export type ZakatData = CommunityServiceData;
