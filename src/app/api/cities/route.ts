import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/cities
 * 
 * Fetch all cities with community interest counts
 * Interest count = number of waitlist entries where selected_city = city_name
 * 
 * Response format:
 * {
 *   data: Array<{
 *     id: string;
 *     city_name: string;
 *     country: string;
 *     is_unlocked: boolean;
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

    // 2. Fetch cities and interest counts using RPC function
    const supabase = createSupabaseServerClient();
    
    // Fetch all cities
    const { data: citiesData, error: citiesError } = await supabase
      .from('cities')
      .select('id, city_name, country, is_unlocked')
      .order('city_name', { ascending: true });
    
    if (citiesError) {
      console.error('[Cities API] Failed to fetch cities:', citiesError);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to fetch cities' } 
        },
        { status: 500 }
      );
    }
    
    // Get interest counts using RPC function
    // Function bypasses RLS using SECURITY DEFINER and returns aggregated counts (no PII)
    const { data: interestCounts, error: countsError } = await supabase.rpc('get_city_interest_counts');
    
    if (countsError) {
      console.error('[Cities API] Error fetching interest counts:', countsError);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to fetch interest counts' } 
        },
        { status: 500 }
      );
    }
    
    // Create a map of city_name -> interest_count for quick lookup
    const countsMap = new Map<string, number>();
    (interestCounts || []).forEach((item: { city_name: string; interest_count: number }) => {
      countsMap.set(item.city_name, Number(item.interest_count));
    });
    
    // Join cities with interest counts
    const citiesWithInterest = (citiesData || []).map((city) => ({
      ...city,
      interest_count: countsMap.get(city.city_name) || 0,
    }));
    
    // Sort by interest count (descending), then by city name (ascending)
    citiesWithInterest.sort((a, b) => {
      if (b.interest_count !== a.interest_count) {
        return b.interest_count - a.interest_count;
      }
      return a.city_name.localeCompare(b.city_name);
    });

    // Log for debugging
    console.log('[Cities API] Returning cities with interest counts:', 
      citiesWithInterest.map(c => `${c.city_name}: ${c.interest_count}`).join(', '));

    // 3. Return success response
    return NextResponse.json(
      { 
        data: citiesWithInterest,
        error: null 
      },
      { status: 200 }
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
