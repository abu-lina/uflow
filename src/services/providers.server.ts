/**
 * Server-side provider services
 * 
 * This module provides data access functions for Server Components and API routes.
 * Uses createSupabaseServerClient() for server-side authentication context.
 * 
 * For client-side usage, see providers.ts instead.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logSupabaseError } from '@/utils/errorUtils';
import { EntityType } from '@/types/badges';
import { getBadgesForEntityServer } from '@/services/badges.server';
import type { Provider, SearchResult } from './providers';
import type { CommunityService } from './communityServices';

/**
 * Get a single provider by ID (server-side)
 * 
 * @param id - Provider ID
 * @returns Provider data or null if not found
 */
export async function getProviderById(id: string): Promise<Provider | null> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en, category_images)')
    .eq('provider_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - this is expected behavior
      return null;
    }
    logSupabaseError('Error fetching provider:', error);
    throw error;
  }

  if (!data) return null;

  // Fetch offers, needs, and badges in parallel to keep SSR initialData shape
  // aligned with the client-side providers service.
  const [offersResult, needsResult, badges] = await Promise.all([
    data.offers_ids && data.offers_ids.length > 0
      ? supabase
          .from('offers')
          .select('name_de')
          .in('offer_id', data.offers_ids)
      : Promise.resolve({ data: [], error: null }),
    data.needs_ids && data.needs_ids.length > 0
      ? supabase
          .from('needs')
          .select('name_de')
          .in('need_id', data.needs_ids)
      : Promise.resolve({ data: [], error: null }),
    getBadgesForEntityServer(id, EntityType.PROVIDER),
  ]);

  const offers = offersResult.data || [];
  const needs = needsResult.data || [];

  return {
    ...data,
    offers,
    needs,
    badges,
  } as Provider;
}

/**
 * Get all providers with optional limit (server-side)
 * 
 * @param limit - Optional number of providers to fetch
 * @returns Array of providers
 */
export async function getProviders(limit?: number): Promise<Provider[]> {
  const supabase = createSupabaseServerClient();
  
  let query = supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    logSupabaseError('Error fetching providers:', error);
    throw error;
  }

  return (data || []) as Provider[];
}

/**
 * Get all bookmarked items for a user (server-side)
 * 
 * @param userId - User ID
 * @returns Array of bookmarked items
 */
export async function getAllBookmarkedItems(userId: string): Promise<SearchResult[]> {
  const supabase = createSupabaseServerClient();
  
  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select(`
      bookmark_id,
      provider_id,
      community_service_id,
      providers(*, category:categories(name_de, name_en)),
      community_services(*, category:categories(name_de, name_en))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('Error fetching bookmarks:', error);
    throw error;
  }

  if (!bookmarks) return [];

  // Transform bookmarks to SearchResult format
  const results: SearchResult[] = [];
  
  for (const bookmark of bookmarks) {
    if (bookmark.provider_id && bookmark.providers) {
      const provider = bookmark.providers as unknown as Provider;
      results.push({
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
        barakah_effects: provider.barakah_effects || [],
        offers_ids: provider.offers_ids || [],
        needs_ids: provider.needs_ids || [],
        category: provider.category,
        type: 'provider' as const,
        originalProvider: provider,
      });
    } else if (bookmark.community_service_id && bookmark.community_services) {
      const service = bookmark.community_services as unknown as CommunityService;
      results.push({
        id: service.community_service_id,
        name: service.community_service_name,
        images: service.community_service_images ? JSON.stringify(service.community_service_images) : null,
        category_id: service.category_id || null,
        address_city: service.address_city || null,
        social_website: service.social_website || null,
        social_instagram: service.social_instagram || null,
        contact_email: service.contact_email || null,
        contact_phone: service.contact_phone || null,
        address_street: service.address_street || null,
        address_country: service.address_country || null,
        address_zip: service.address_zip || null,
        location_latitude: service.location_latitude || null,
        location_longitude: service.location_longitude || null,
        created_at: service.created_at,
        updated_at: service.updated_at,
        barakah_effects: service.barakah_effects || [],
        offers_ids: service.offers_ids || [],
        needs_ids: service.needs_ids || [],
        category: service.category ? {
          name_de: service.category.name_de || 'Unbekannt',
          name_en: service.category.name_en,
          category_images: service.category.category_images,
        } : undefined,
        type: 'community_service' as const,
        originalCommunityService: service,
      });
    }
  }

  return results;
}

/**
 * Get bookmarked cities for a user (server-side)
 * 
 * @param userId - User ID
 * @returns Array of unique city names
 */
export async function fetchBookmarkedCities(userId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient();
  
  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select(`
      providers(address_city),
      community_services(address_city)
    `)
    .eq('user_id', userId);

  if (error) {
    logSupabaseError('Error fetching bookmarked cities:', error);
    throw error;
  }

  if (!bookmarks) return [];

  const cities = new Set<string>();
  
  for (const bookmark of bookmarks) {
    if (bookmark.providers) {
      const provider = bookmark.providers as unknown as Provider;
      if (provider.address_city) cities.add(provider.address_city);
    }
    if (bookmark.community_services) {
      const service = bookmark.community_services as unknown as CommunityService;
      if (service.address_city) cities.add(service.address_city);
    }
  }

  return Array.from(cities).sort();
}

/**
 * Get providers created by a user (server-side)
 * 
 * @param userId - User ID
 * @returns Array of providers created by the user
 */
export async function getCreatedProviders(userId: string): Promise<Provider[]> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en)')
    .eq('user_created_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('Error fetching created providers:', error);
    throw error;
  }

  return (data || []) as Provider[];
}

/**
 * Get provider recommendations for a user (server-side)
 * Placeholder implementation - can be enhanced with ML/recommendation logic
 * 
 * @param _userId - User ID (unused in current implementation)
 * @returns Array of recommended providers
 */
export async function getRecommendations(_userId: string): Promise<Provider[]> {
  const supabase = createSupabaseServerClient();
  
  // Simple implementation: return recently added approved providers
  const { data, error } = await supabase
    .from('providers')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    logSupabaseError('Error fetching recommendations:', error);
    throw error;
  }

  return (data || []) as Provider[];
}
