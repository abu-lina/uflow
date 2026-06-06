/**
 * Server-side provider services
 * 
 * This module provides data access functions for Server Components and API routes.
 * Uses createSupabaseServerClient() for server-side authentication context.
 * 
 * For client-side usage, see providers.ts instead.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logSupabaseError } from '@/utils/errorUtils';
import { EntityType } from '@/types/badges';
import { getBadgesForEntityServer } from '@/services/badges.server';
import type { Provider, SearchResult } from './providers';

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

  // Fetch offers, needs, badges, and extension-table fields in parallel to keep SSR initialData shape
  // aligned with the client-side providers service.
  const [providerOffersResult, providerNeedsResult, badges, foodProvider, storeProvider] = await Promise.all([
    supabase.from('provider_offers').select('offer_id').eq('provider_id', id),
    supabase.from('provider_needs').select('need_id').eq('provider_id', id),
    getBadgesForEntityServer(id, EntityType.PROVIDER),
    supabase
      .from('food_providers')
      .select('verification_method, has_certificate, no_alcohol, no_pork, no_gambling')
      .eq('provider_id', id)
      .maybeSingle(),
    supabase
      .from('store_providers')
      .select('no_gambling')
      .eq('provider_id', id)
      .maybeSingle(),
  ]);

  let offerIds = (providerOffersResult.data || []).map((row) => row.offer_id);
  let needIds = (providerNeedsResult.data || []).map((row) => row.need_id);

  // Some environments restrict anon/server-cookie reads on relation tables.
  // If relation reads are empty, retry just these lookups with admin client so
  // provider detail SSR can still hydrate menu/needs for publicly readable providers.
  if (offerIds.length === 0 && needIds.length === 0) {
    try {
      const admin = getSupabaseAdmin();
      const [adminOffersResult, adminNeedsResult] = await Promise.all([
        admin.from('provider_offers').select('offer_id').eq('provider_id', id),
        admin.from('provider_needs').select('need_id').eq('provider_id', id),
      ]);

      offerIds = (adminOffersResult.data || []).map((row) => row.offer_id);
      needIds = (adminNeedsResult.data || []).map((row) => row.need_id);
    } catch {
      // Keep anon-read result when admin env vars are not available.
    }
  }

  const [offersResult, needsResult] = await Promise.all([
    offerIds.length > 0
      ? supabase.from('offers').select('name_de').in('offer_id', offerIds)
      : Promise.resolve({ data: [], error: null }),
    needIds.length > 0
      ? supabase.from('needs').select('name_de').in('need_id', needIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const offers = offersResult.data || [];
  const needs = needsResult.data || [];

  return {
    ...data,
    ...(foodProvider.data ?? {}),
    ...(storeProvider.data ?? {}),
    offers_ids: offerIds,
    needs_ids: needIds,
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
 * Get all bookmarked providers for a user (server-side).
 * bookmarks.provider_id is now NOT NULL — no CS join needed.
 */
export async function getAllBookmarkedItems(userId: string): Promise<SearchResult[]> {
  const supabase = createSupabaseServerClient();

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('provider_id, providers(*, category:categories(name_de, name_en))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('Error fetching bookmarks:', error);
    throw error;
  }

  if (!bookmarks) return [];

  const results: SearchResult[] = [];

  for (const bookmark of bookmarks) {
    if (bookmark.provider_id && bookmark.providers) {
      const provider = bookmark.providers as unknown as Provider;
      results.push({
        id: provider.provider_id,
        name: provider.provider_name,
        images: typeof provider.provider_images === 'string' ? provider.provider_images : JSON.stringify(provider.provider_images),
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
        offers_ids: [],
        needs_ids: [],
        category: provider.category,
        type: 'provider' as const,
        originalProvider: provider,
      });
    }
  }

  return results;
}

/**
 * Get bookmarked provider cities for a user (server-side).
 */
export async function fetchBookmarkedCities(userId: string): Promise<string[]> {
  const supabase = createSupabaseServerClient();

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('providers(address_city)')
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
