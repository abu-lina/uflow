import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBadgesForEntityWithConfirmationStatus } from '@/services/badges';
import { EntityType } from '@/types/badges';

/**
 * GET /api/badges/entity?entityId=xxx&entityType=provider
 * Get all badges for a specific entity (provider or community_service)
 * Public endpoint (no authentication required)
 * Optionally includes user confirmation status if authenticated
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Parse query parameters
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType') as EntityType;

    // 2. Validate parameters
    if (!entityId || entityId.trim() === '') {
      return NextResponse.json(
        { error: 'entityId parameter is required' },
        { status: 400 }
      );
    }

    if (!entityType || entityType !== 'provider') {
      return NextResponse.json(
        { error: 'entityType must be "provider"' },
        { status: 400 }
      );
    }

    // 3. Check if user is authenticated (optional)
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 4. Fetch badges with confirmation status (pass server client)
    const badges = await getBadgesForEntityWithConfirmationStatus(
      entityId,
      entityType,
      user?.id || null,
      supabase // Pass server client for proper authentication context
    );

    // 5. Return badges (hide confirmation_count per user preference)
    const badgesResponse = badges.map((badge) => ({
      id: badge.id,
      entity_id: badge.entity_id,
      entity_type: badge.entity_type,
      trust_level: badge.trust_level,
      created_at: badge.created_at,
      updated_at: badge.updated_at,
      badge_type: {
        id: badge.badge_type.id,
        badge_key: badge.badge_type.badge_key,
        labels: badge.badge_type.labels,
        description: badge.badge_type.description,
        icon_name: badge.badge_type.icon_name,
      },
      user_has_confirmed: badge.user_has_confirmed,
      // Note: confirmation_count is hidden per user preference
    }));

    return NextResponse.json({
      data: badgesResponse,
      error: null,
    });

  } catch (error) {
    console.error('[BADGE GET ENTITY API] Error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Entity not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Entity not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}

