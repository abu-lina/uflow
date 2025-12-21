import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/waitlist/status
 * 
 * Get waitlist entry status for the current user (using waitlist token from cookie)
 * 
 * Returns:
 * {
 *   data: {
 *     email: string,
 *     has_seen_early_access: boolean,
 *     skipped_early_access: boolean,
 *     selected_city: string | null
 *   } | null,
 *   error: { message: string } | null
 * }
 */
export async function GET(_request: Request) {
  try {
    // Get token from cookie
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const waitlistToken = cookieStore.get('waitlist_token')?.value;

    if (!waitlistToken) {
      // No token - user hasn't joined waitlist or token expired
      return NextResponse.json(
        { 
          data: null,
          error: null // Not an error, just no waitlist entry
        },
        { status: 200 }
      );
    }

    // Query database for waitlist entry using admin client (bypasses RLS)
    // This is safe because we're only reading data for the token holder
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('waitlist')
      .select('email, has_seen_early_access, skipped_early_access, selected_city')
      .eq('waitlist_token', waitlistToken)
      .single();

    if (error) {
      // If no rows found, token is invalid/expired
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            data: null,
            error: null // Not an error, just no matching entry
          },
          { status: 200 }
        );
      }

      console.error('[Waitlist Status] Database error:', error);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to fetch waitlist status' } 
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { 
          data: null,
          error: null
        },
        { status: 200 }
      );
    }

    // Return waitlist entry data
    return NextResponse.json(
      { 
        data: {
          email: data.email,
          has_seen_early_access: data.has_seen_early_access ?? false,
          skipped_early_access: data.skipped_early_access ?? false,
          selected_city: data.selected_city ?? null,
        },
        error: null
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Waitlist Status] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        data: null,
        error: { message: 'An error occurred. Please try again.' } 
      },
      { status: 500 }
    );
  }
}
