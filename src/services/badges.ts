/**
 * Badge Service Layer
 * Handles all badge-related database operations
 * 
 * This service supports both server-side (API routes) and client-side usage.
 * For server-side usage, pass the server client from createSupabaseServerClient().
 * For client-side usage, omit the client parameter to use the default client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '@/lib/supabase/client';
import type {
  BadgeType,
  ProviderBadge,
  ProviderBadgeWithType,
  BadgeConfirmation,
  BadgeVerification,
  EntityType,
  CreateProviderBadgeInput,
  BadgeStats,
  BadgeWithDetails,
  BadgeWithConfirmationStatus,
} from '@/types/badges';
import { TrustLevel } from '@/types/badges';
import { logSupabaseError } from '@/utils/errorUtils';

/**
 * Helper function to get the appropriate Supabase client
 * @param client - Optional Supabase client (server or client)
 * @returns Supabase client instance
 */
function getSupabaseClient(client?: SupabaseClient): SupabaseClient {
  return client || defaultClient;
}

// ============================================================================
// BADGE TYPES
// ============================================================================

/**
 * Fetch all active badge types
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeTypes(client?: SupabaseClient): Promise<BadgeType[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_types')
      .select('*')
      .eq('is_active', true)
      .order('badge_key', { ascending: true })
      .limit(100);

    if (error) {
      logSupabaseError('getBadgeTypes', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBadgeTypes:', error);
    throw error;
  }
}

/**
 * Get a specific badge type by ID
 * @param badgeTypeId - The badge type ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeTypeById(
  badgeTypeId: string,
  client?: SupabaseClient
): Promise<BadgeType | null> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_types')
      .select('*')
      .eq('id', badgeTypeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logSupabaseError('getBadgeTypeById', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getBadgeTypeById:', error);
    throw error;
  }
}

/**
 * Get a badge type by its key (e.g., 'HALAL')
 * @param badgeKey - The badge key
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeTypeByKey(
  badgeKey: string,
  client?: SupabaseClient
): Promise<BadgeType | null> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_types')
      .select('*')
      .eq('badge_key', badgeKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logSupabaseError('getBadgeTypeByKey', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getBadgeTypeByKey:', error);
    throw error;
  }
}

// ============================================================================
// PROVIDER BADGES
// ============================================================================

/**
 * Get all badges for a specific entity (provider or community_service)
 * @param entityId - The entity ID (provider_id or community_service_id)
 * @param entityType - The entity type
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgesForEntity(
  entityId: string,
  entityType: EntityType,
  client?: SupabaseClient
): Promise<ProviderBadgeWithType[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('provider_badges')
      .select(`
        *,
        badge_type:badge_types(*)
      `)
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('getBadgesForEntity', error);
      throw error;
    }

    return (data || []) as ProviderBadgeWithType[];
  } catch (error) {
    console.error('Error in getBadgesForEntity:', error);
    throw error;
  }
}

/**
 * Batch fetch badges for multiple entities at once (eliminates N+1 query)
 * @param entityIds - Array of entity IDs to fetch badges for
 * @param entityType - The entity type (provider or community_service)
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgesForEntities(
  entityIds: string[],
  entityType: EntityType,
  client?: SupabaseClient
): Promise<Map<string, ProviderBadgeWithType[]>> {
  if (entityIds.length === 0) {
    return new Map();
  }

  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('provider_badges')
      .select(`
        *,
        badge_type:badge_types(*)
      `)
      .in('entity_id', entityIds)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false });

    if (error) {
      logSupabaseError('getBadgesForEntities', error);
      throw error;
    }

    // Group badges by entity_id for O(1) lookup
    const badgesByEntity = new Map<string, ProviderBadgeWithType[]>();
    (data || []).forEach((badge: { entity_id: string }) => {
      const badges = badgesByEntity.get(badge.entity_id) || [];
      badges.push(badge as ProviderBadgeWithType);
      badgesByEntity.set(badge.entity_id, badges);
    });

    return badgesByEntity;
  } catch (error) {
    console.error('Error in getBadgesForEntities:', error);
    throw error;
  }
}

/**
 * Get all badges for an entity with user confirmation status
 * @param entityId - The entity ID (provider_id or community_service_id)
 * @param entityType - The entity type
 * @param userId - The user ID to check confirmations for
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgesForEntityWithConfirmationStatus(
  entityId: string,
  entityType: EntityType,
  userId: string | null,
  client?: SupabaseClient
): Promise<BadgeWithConfirmationStatus[]> {
  try {
    const supabase = getSupabaseClient(client);
    const badges = await getBadgesForEntity(entityId, entityType, client);

    if (!userId) {
      // If no user, just return badges with user_has_confirmed = false
      return badges.map((badge) => ({
        ...badge,
        user_has_confirmed: false,
      }));
    }

    // Get all badge IDs
    const badgeIds = badges.map((b) => b.id);

    if (badgeIds.length === 0) {
      return [];
    }

    // Fetch user's confirmations for these badges
    const { data: confirmations, error } = await supabase
      .from('badge_confirmations')
      .select('provider_badge_id')
      .in('provider_badge_id', badgeIds)
      .eq('user_id', userId);

    if (error) {
      logSupabaseError('getBadgesForEntityWithConfirmationStatus', error);
      throw error;
    }

    const confirmedBadgeIds = new Set(
      (confirmations || []).map((c) => c.provider_badge_id)
    );

    return badges.map((badge) => ({
      ...badge,
      user_has_confirmed: confirmedBadgeIds.has(badge.id),
    }));
  } catch (error) {
    console.error('Error in getBadgesForEntityWithConfirmationStatus:', error);
    throw error;
  }
}

/**
 * Get a specific provider badge by ID
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getProviderBadgeById(
  badgeId: string,
  client?: SupabaseClient
): Promise<ProviderBadgeWithType | null> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('provider_badges')
      .select(`
        *,
        badge_type:badge_types(*)
      `)
      .eq('id', badgeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logSupabaseError('getProviderBadgeById', error);
      throw error;
    }

    return data as ProviderBadgeWithType;
  } catch (error) {
    console.error('Error in getProviderBadgeById:', error);
    throw error;
  }
}

/**
 * Create a new badge for an entity
 * @param input - Badge creation input
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function createProviderBadge(
  input: CreateProviderBadgeInput,
  client?: SupabaseClient
): Promise<ProviderBadge> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('provider_badges')
      .insert({
        entity_id: input.entity_id,
        entity_type: input.entity_type,
        badge_type_id: input.badge_type_id,
        trust_level: TrustLevel.SELF_DECLARED,
        confirmation_count: 0,
      })
      .select()
      .single();

    if (error) {
      logSupabaseError('createProviderBadge', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createProviderBadge:', error);
    throw error;
  }
}

/**
 * Delete a provider badge
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function deleteProviderBadge(
  badgeId: string,
  client?: SupabaseClient
): Promise<void> {
  try {
    const supabase = getSupabaseClient(client);
    const { error } = await supabase
      .from('provider_badges')
      .delete()
      .eq('id', badgeId);

    if (error) {
      logSupabaseError('deleteProviderBadge', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteProviderBadge:', error);
    throw error;
  }
}

/**
 * Get badge statistics for an entity
 * @param entityId - The entity ID
 * @param entityType - The entity type
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeStatsForEntity(
  entityId: string,
  entityType: EntityType,
  client?: SupabaseClient
): Promise<BadgeStats> {
  try {
    const badges = await getBadgesForEntity(entityId, entityType, client);

    const stats: BadgeStats = {
      total_badges: badges.length,
      self_declared: 0,
      community_confirmed: 0,
      ummah_flow_verified: 0,
      total_confirmations: 0,
    };

    badges.forEach((badge) => {
      stats.total_confirmations += badge.confirmation_count;

      switch (badge.trust_level) {
        case TrustLevel.SELF_DECLARED:
          stats.self_declared++;
          break;
        case 'COMMUNITY_CONFIRMED':
          stats.community_confirmed++;
          break;
        case 'UMMAH_FLOW_VERIFIED':
          stats.ummah_flow_verified++;
          break;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error in getBadgeStatsForEntity:', error);
    throw error;
  }
}

// ============================================================================
// BADGE CONFIRMATIONS
// ============================================================================

/**
 * Check if a user has confirmed a specific badge
 * @param badgeId - The badge ID
 * @param userId - The user ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function hasUserConfirmedBadge(
  badgeId: string,
  userId: string,
  client?: SupabaseClient
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_confirmations')
      .select('id')
      .eq('provider_badge_id', badgeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logSupabaseError('hasUserConfirmedBadge', error);
      throw error;
    }

    return data !== null;
  } catch (error) {
    console.error('Error in hasUserConfirmedBadge:', error);
    throw error;
  }
}

/**
 * Confirm a badge (add user confirmation)
 * This operation is idempotent - if already confirmed, returns success
 * @param badgeId - The badge ID
 * @param userId - The user ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function confirmBadge(
  badgeId: string,
  userId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; trust_level: TrustLevel; already_confirmed: boolean }> {
  try {
    const supabase = getSupabaseClient(client);
    
    // Check if already confirmed
    const alreadyConfirmed = await hasUserConfirmedBadge(badgeId, userId, client);

    if (alreadyConfirmed) {
      // Get current trust level
      const badge = await getProviderBadgeById(badgeId, client);
      return {
        success: true,
        trust_level: badge?.trust_level || TrustLevel.SELF_DECLARED,
        already_confirmed: true,
      };
    }

    // Insert confirmation
    const { error: insertError } = await supabase
      .from('badge_confirmations')
      .insert({
        provider_badge_id: badgeId,
        user_id: userId,
      });

    if (insertError) {
      // Check if it's a unique constraint violation (race condition)
      if (insertError.code === '23505') {
        const badge = await getProviderBadgeById(badgeId, client);
        return {
          success: true,
          trust_level: badge?.trust_level || TrustLevel.SELF_DECLARED,
          already_confirmed: true,
        };
      }
      logSupabaseError('confirmBadge', insertError);
      throw insertError;
    }

    // Fetch updated badge to get new trust level
    const updatedBadge = await getProviderBadgeById(badgeId, client);

    return {
      success: true,
      trust_level: updatedBadge?.trust_level || TrustLevel.SELF_DECLARED,
      already_confirmed: false,
    };
  } catch (error) {
    console.error('Error in confirmBadge:', error);
    throw error;
  }
}

/**
 * Revoke a badge confirmation
 * @param badgeId - The badge ID
 * @param userId - The user ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function revokeConfirmation(
  badgeId: string,
  userId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; trust_level: TrustLevel }> {
  try {
    const supabase = getSupabaseClient(client);
    
    // Delete confirmation
    const { error } = await supabase
      .from('badge_confirmations')
      .delete()
      .eq('provider_badge_id', badgeId)
      .eq('user_id', userId);

    if (error) {
      logSupabaseError('revokeConfirmation', error);
      throw error;
    }

    // Fetch updated badge to get new trust level
    const updatedBadge = await getProviderBadgeById(badgeId, client);

    return {
      success: true,
      trust_level: updatedBadge?.trust_level || TrustLevel.SELF_DECLARED,
    };
  } catch (error) {
    console.error('Error in revokeConfirmation:', error);
    throw error;
  }
}

/**
 * Get all confirmations for a badge
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeConfirmations(
  badgeId: string,
  client?: SupabaseClient
): Promise<BadgeConfirmation[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_confirmations')
      .select('*')
      .eq('provider_badge_id', badgeId)
      .order('confirmed_at', { ascending: false })
      .limit(200);

    if (error) {
      logSupabaseError('getBadgeConfirmations', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBadgeConfirmations:', error);
    throw error;
  }
}

// ============================================================================
// BADGE VERIFICATIONS (ADMIN)
// ============================================================================

/**
 * Verify a badge (admin only)
 * Sets trust level to UMMAH_FLOW_VERIFIED
 * @param badgeId - The badge ID
 * @param adminUserId - The admin user ID
 * @param reason - Optional reason for verification
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function verifyBadge(
  badgeId: string,
  adminUserId: string,
  reason?: string,
  client?: SupabaseClient
): Promise<{ success: boolean; verification: BadgeVerification }> {
  try {
    const supabase = getSupabaseClient(client);
    
    // Update badge trust level to UMMAH_FLOW_VERIFIED
    const { error: updateError } = await supabase
      .from('provider_badges')
      .update({ trust_level: 'UMMAH_FLOW_VERIFIED' })
      .eq('id', badgeId);

    if (updateError) {
      logSupabaseError('verifyBadge - update', updateError);
      throw updateError;
    }

    // Insert verification record
    const { data, error: insertError } = await supabase
      .from('badge_verifications')
      .insert({
        provider_badge_id: badgeId,
        verified_by_user_id: adminUserId,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      logSupabaseError('verifyBadge - insert', insertError);
      throw insertError;
    }

    return {
      success: true,
      verification: data,
    };
  } catch (error) {
    console.error('Error in verifyBadge:', error);
    throw error;
  }
}

/**
 * Unverify a badge (admin only)
 * Reverts trust level back to appropriate level based on confirmation count
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function unverifyBadge(
  badgeId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; trust_level: TrustLevel }> {
  try {
    const supabase = getSupabaseClient(client);
    
    // Get current badge to check confirmation count
    const badge = await getProviderBadgeById(badgeId, client);

    if (!badge) {
      throw new Error('Badge not found');
    }

    // Determine appropriate trust level based on confirmation count
    // We'll let the trigger handle this by temporarily setting to SELF_DECLARED
    // and then updating confirmation_count (which triggers trust level recalculation)
    const { error: updateError } = await supabase
      .from('provider_badges')
      .update({
        trust_level: TrustLevel.SELF_DECLARED,
        confirmation_count: badge.confirmation_count, // Trigger recalculation
      })
      .eq('id', badgeId);

    if (updateError) {
      logSupabaseError('unverifyBadge', updateError);
      throw updateError;
    }

    // Fetch updated badge
    const updatedBadge = await getProviderBadgeById(badgeId, client);

    return {
      success: true,
      trust_level: updatedBadge?.trust_level || TrustLevel.SELF_DECLARED,
    };
  } catch (error) {
    console.error('Error in unverifyBadge:', error);
    throw error;
  }
}

/**
 * Get all verifications for a badge
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeVerifications(
  badgeId: string,
  client?: SupabaseClient
): Promise<BadgeVerification[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_verifications')
      .select('*')
      .eq('provider_badge_id', badgeId)
      .order('verified_at', { ascending: false })
      .limit(200);

    if (error) {
      logSupabaseError('getBadgeVerifications', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBadgeVerifications:', error);
    throw error;
  }
}

/**
 * Get badge with full details (confirmations and verifications)
 * Used for admin views
 * @param badgeId - The badge ID
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getBadgeWithDetails(
  badgeId: string,
  client?: SupabaseClient
): Promise<BadgeWithDetails | null> {
  try {
    const [badge, confirmations, verifications] = await Promise.all([
      getProviderBadgeById(badgeId, client),
      getBadgeConfirmations(badgeId, client),
      getBadgeVerifications(badgeId, client),
    ]);

    if (!badge) {
      return null;
    }

    // Count unique confirmers
    const uniqueConfirmers = new Set(confirmations.map((c) => c.user_id)).size;

    return {
      ...badge,
      confirmations,
      verifications,
      stats: {
        confirmation_count: badge.confirmation_count,
        unique_confirmers: uniqueConfirmers,
      },
    };
  } catch (error) {
    console.error('Error in getBadgeWithDetails:', error);
    throw error;
  }
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * Get the confirmation threshold from system configuration
 * @param client - Optional Supabase client (use server client for API routes)
 */
export async function getConfirmationThreshold(client?: SupabaseClient): Promise<number> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('badge_system_config')
      .select('config_value')
      .eq('config_key', 'confirmation_threshold')
      .single();

    if (error) {
      logSupabaseError('getConfirmationThreshold', error);
      return 5; // Default threshold
    }

    return (data?.config_value?.confirmation_threshold as number) || 5;
  } catch (error) {
    console.error('Error in getConfirmationThreshold:', error);
    return 5; // Default threshold
  }
}

