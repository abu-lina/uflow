import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/cities
 * 
 * Fetch all cities with provider counts and interest counts
 * Provider count = number of approved providers in providers table where address_city = city_name
 * Interest count = number of waitlist entries where selected_city = city_name
 * 
 * Response format:
 * {
 *   data: Array<{
 *     id: string;
 *     city_name: string;
 *     country: string;
 *     is_unlocked: boolean;
 *     provider_count: number;
 *     interest_count: number;
 *   }>;
 *   error: null | { message: string };
 * }
 * 
 * Rate limiting: 20 requests per hour per IP
 */
export async function GET(request: Request) {
  try {
    // 1. Rate limiting - 20 requests per hour per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 20, 60 * 60 * 1000, 'cities-list');
    
    if (!isAllowed) {
      console.log('[Cities API] Rate limit exceeded for:', identifier);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Too many requests. Please try again later.' } 
        },
        { status: 429 }
      );
    }

    // 2. Fetch cities with counts using optimized RPC function (single query)
    const supabase = createSupabaseServerClient();
    
    // Use combined RPC function to get cities with provider and interest counts in one query
    const { data: citiesWithCounts, error: rpcError } = await supabase.rpc('get_cities_with_counts');
    
    if (rpcError) {
      console.error('[Cities API] Failed to fetch cities with counts:', rpcError);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to fetch cities' } 
        },
        { status: 500 }
      );
    }

    // Log for debugging (production-only guard to reduce log noise)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Cities API] Returning cities with provider counts:', 
        (citiesWithCounts || []).map((c: { city_name: string; provider_count: number }) => 
          `${c.city_name}: ${c.provider_count} providers`).join(', '));
    }

    // 3. Return success response
    return NextResponse.json(
      { 
        data: citiesWithCounts || [],
        error: null 
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );

  } catch (error) {
    console.error('[Cities API] Unexpected error:', error);
    
    // Generic error response
    return NextResponse.json(
      { 
        data: null,
        error: { message: 'An error occurred. Please try again.' } 
      },
      { status: 500 }
    );
  }
}
