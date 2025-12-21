import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/debug/waitlist-flow
 * 
 * Debug endpoint to check current waitlist flow state
 * Only available in development mode
 * 
 * Returns:
 * {
 *   cookies: { waitlist_token: string | null },
 *   apiStatus: { data: {...} | null, error: {...} | null },
 *   recommendations: string[]
 * }
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const cookieStore = await cookies();
    const waitlistToken = cookieStore.get('waitlist_token')?.value || null;

    // Check API status
    let apiStatus: {
      data: {
        email: string;
        has_seen_early_access: boolean;
        skipped_early_access: boolean;
        selected_city: string | null;
      } | null;
      error: {
        code?: string;
        message: string;
      } | null;
    } = { data: null, error: null };
    if (waitlistToken) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('waitlist')
          .select('email, has_seen_early_access, skipped_early_access, selected_city')
          .eq('waitlist_token', waitlistToken)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found, which is not an error
          apiStatus.error = {
            code: error.code,
            message: error.message,
          };
        } else if (data) {
          apiStatus.data = {
            email: data.email,
            has_seen_early_access: data.has_seen_early_access ?? false,
            skipped_early_access: data.skipped_early_access ?? false,
            selected_city: data.selected_city ?? null,
          };
        }
      } catch (error) {
        apiStatus.error = {
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Generate recommendations based on state
    const recommendations: string[] = [];

    if (!waitlistToken) {
      recommendations.push('No waitlist token found in cookies - user has not joined waitlist');
    } else if (!apiStatus.data) {
      recommendations.push('Waitlist token found but no matching database entry - token may be invalid or expired');
    } else {
      if (!apiStatus.data.has_seen_early_access) {
        recommendations.push('User has joined waitlist but has not seen early access screen - should show early access');
      } else {
        recommendations.push('User has seen early access - should show normal flow (splash → about → waitlist)');
      }
    }

    return NextResponse.json({
      cookies: {
        waitlist_token: waitlistToken ? `${waitlistToken.substring(0, 20)}...` : null,
      },
      apiStatus,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Waitlist Flow Debug] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch waitlist flow state',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
