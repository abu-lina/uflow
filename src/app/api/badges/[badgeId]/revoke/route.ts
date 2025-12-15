import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revokeConfirmation } from '@/services/badges';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

/**
 * POST /api/badges/:badgeId/revoke
 * Revoke a badge confirmation (authenticated users only)
 * Rate limited: 50 revocations per hour
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  try {
    // 1. Authentication check
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to revoke badge confirmations' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (50 revocations per hour)
    const identifier = getClientIdentifier(request, user.id);
    const isAllowed = checkRateLimit(identifier, 50, 60 * 60 * 1000, 'badge_revoke');
    
    if (!isAllowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    // 3. Validate badge ID
    const { badgeId } = await params;
    
    if (!badgeId || badgeId.trim() === '') {
      return NextResponse.json(
        { error: 'Badge ID is required' },
        { status: 400 }
      );
    }

    // 4. Revoke confirmation (pass server client for proper authentication context)
    const result = await revokeConfirmation(badgeId, user.id, supabase);

    // 5. Return success response
    return NextResponse.json({
      data: {
        id: badgeId,
        success: result.success,
        trust_level: result.trust_level,
        confirmed: false,
      },
      error: null,
    });

  } catch (error) {
    console.error('[BADGE REVOKE API] Error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Badge not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Badge not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to revoke badge confirmation' },
      { status: 500 }
    );
  }
}

