import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { confirmBadge } from '@/services/badges';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

/**
 * POST /api/badges/:badgeId/confirm
 * Confirm a badge (authenticated users only)
 * Rate limited: 50 confirmations per hour
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
        { error: 'Unauthorized - Please log in to confirm badges' },
        { status: 401 }
      );
    }

    // 2. Rate limiting (50 confirmations per hour)
    const identifier = getClientIdentifier(request, user.id);
    const isAllowed = checkRateLimit(identifier, 50, 60 * 60 * 1000, 'badge_confirm');
    
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

    // 4. Confirm badge (pass server client for proper authentication context)
    const result = await confirmBadge(badgeId, user.id, supabase);

    // 5. Return success response
    return NextResponse.json({
      data: {
        id: badgeId,
        trust_level: result.trust_level,
        confirmed: true,
        already_confirmed: result.already_confirmed,
      },
      error: null,
    });

  } catch (error) {
    console.error('[BADGE CONFIRM API] Error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      // Badge not found
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Badge not found' },
          { status: 404 }
        );
      }
      
      // Foreign key constraint violation
      if (error.message.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Invalid badge ID' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to confirm badge' },
      { status: 500 }
    );
  }
}

