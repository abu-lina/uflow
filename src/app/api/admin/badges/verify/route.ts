import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyBadge } from '@/services/badges';
import { z } from 'zod';

// Request validation schema
const verifyBadgeSchema = z.object({
  badgeId: z.string().uuid('Invalid badge ID format'),
  reason: z.string().optional(),
});

/**
 * POST /api/admin/badges/verify
 * Verify a badge (set trust level to UMMAH_FLOW_VERIFIED)
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // 2. Admin authorization check
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('raw_user_meta_data')
      .eq('user_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    const isAdmin = userData.raw_user_meta_data?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validation = verifyBadgeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { badgeId, reason } = validation.data;

    // 4. Verify badge (pass server client for proper authentication context)
    const result = await verifyBadge(badgeId, user.id, reason, supabase);

    // 5. Return success response
    return NextResponse.json({
      data: {
        id: badgeId,
        trust_level: 'UMMAH_FLOW_VERIFIED',
        verified: true,
        verification: {
          verified_by: user.id,
          verified_at: result.verification.verified_at,
          reason: result.verification.reason,
        },
      },
      error: null,
    });

  } catch (error) {
    console.error('[ADMIN BADGE VERIFY API] Error:', error);
    
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
      { error: 'Failed to verify badge' },
      { status: 500 }
    );
  }
}

