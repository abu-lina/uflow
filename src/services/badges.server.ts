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
    
    const { data, error } = await supabase
      .from('provider_badges')
      .select(`
        *,
        badge_type:badge_types(*)
      `)
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('Error fetching badges:', error);
      return [];
    }

    return (data || []) as ProviderBadgeWithType[];
  } catch (error) {
    console.error('Error in getBadgesForEntityServer:', error);
    return [];
  }
}
