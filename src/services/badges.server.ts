/**
 * Server-side badge services
 * 
 * This module provides badge data access functions for Server Components and API routes.
 * Uses createSupabaseServerClient() for server-side authentication context.
 * 
 * For client-side usage, see badges.ts instead.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logSupabaseError } from '@/utils/errorUtils';
import type { ProviderBadgeWithType, EntityType } from '@/types/badges';

/**
 * Get all badges for a specific entity (server-side)
 * 
 * @param entityId - The ID of the entity (provider or community service)
 * @param entityType - The type of entity
 * @returns Array of badges with type information
 */
export async function getBadgesForEntityServer(
  entityId: string,
  entityType: EntityType
): Promise<ProviderBadgeWithType[]> {
  try {
    const supabase = createSupabaseServerClient();

    const createBaseQuery = () => {
      const baseQuery = supabase
        .from('provider_badges')
        .select(`
          *,
          badge_type:badge_types(*)
        `)
        .order('created_at', { ascending: false });

      if (entityType === 'provider') {
        return baseQuery.eq('provider_id', entityId).eq('community_service_id', null);
      }

      return baseQuery.eq('community_service_id', entityId).eq('provider_id', null);
    };

    let { data, error } = await createBaseQuery().eq('is_active', true);

    // Backward compatibility: some environments do not yet have provider_badges.is_active.
    if (error?.code === '42703') {
      ({ data, error } = await createBaseQuery());
    }

    if (error) {
      logSupabaseError('Error fetching badges:', error);
      return [];
    }

    return ((data || []).map((badge) => ({
      ...badge,
      entity_id: badge.provider_id ?? badge.community_service_id,
      entity_type: badge.provider_id ? 'provider' : 'community_service',
    }))) as ProviderBadgeWithType[];
  } catch (error) {
    console.error('Error in getBadgesForEntityServer:', error);
    return [];
  }
}
