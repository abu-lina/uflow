/**
 * Server-side community services
 * 
 * This module provides data access functions for Server Components and API routes.
 * Uses createSupabaseServerClient() for server-side authentication context.
 * 
 * For client-side usage, see communityServices.ts instead.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logSupabaseError } from '@/utils/errorUtils';
import type { CommunityService } from './communityServices';

/**
 * Get a single community service by ID (server-side)
 * 
 * @param id - Community service ID
 * @returns Community service data or null if not found
 */
export async function getCommunityServiceById(id: string): Promise<CommunityService | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en)')
      .eq('community_service_id', id)
      .single<CommunityService>();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is expected behavior
        return null;
      }
      logSupabaseError('Error fetching community service:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    const [serviceOffersResult, serviceNeedsResult] = await Promise.all([
      supabase
        .from('community_service_offers')
        .select('offer_id')
        .eq('community_service_id', id),
      supabase
        .from('community_service_needs')
        .select('need_id')
        .eq('community_service_id', id),
    ]);

    const offerIds = (serviceOffersResult.data || []).map((row) => row.offer_id);
    const needIds = (serviceNeedsResult.data || []).map((row) => row.need_id);

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
      offers_ids: offerIds,
      needs_ids: needIds,
      offers,
      needs,
    };
  } catch (error) {
    console.error('Error in getCommunityServiceById:', error);
    throw error;
  }
}

/**
 * Get community services associated with a provider (server-side)
 * 
 * @param providerId - Provider ID
 * @returns Array of community services
 */
export async function getCommunityServicesForProvider(providerId: string): Promise<CommunityService[]> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('community_services')
      .select('*, category:categories(name_de, name_en)')
      .eq('provider_id', providerId)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('Error fetching community services for provider:', error);
      throw error;
    }

    return (data || []) as CommunityService[];
  } catch (error) {
    console.error('Error in getCommunityServicesForProvider:', error);
    return [];
  }
}

/**
 * Get all community services with optional limit (server-side)
 * 
 * @param limit - Optional number of services to fetch
 * @returns Array of community services
 */
export async function getCommunityServices(limit?: number): Promise<CommunityService[]> {
  const supabase = createSupabaseServerClient();
  
  let query = supabase
    .from('community_services')
    .select('*, category:categories(name_de, name_en)')
    .eq('review_status', 'approved')
    .order('community_service_name');

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  
  if (error) {
    logSupabaseError('Error fetching community services:', error);
    throw error;
  }
  
  return Array.isArray(data) ? data : [];
}
