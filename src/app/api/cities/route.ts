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
    
    // Get provider counts from providers table (only approved providers)
    const { data: providerCounts, error: providerCountsError } = await supabase
      .from('providers')
      .select('address_city')
      .eq('review_status', 'approved')
      .not('address_city', 'is', null);
    
    if (providerCountsError) {
      console.error('[Cities API] Error fetching provider counts:', providerCountsError);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to fetch provider counts' } 
        },
        { status: 500 }
      );
    }
    
    // Count providers per city
    const providerCountsMap = new Map<string, number>();
    (providerCounts || []).forEach((provider: { address_city: string | null }) => {
      if (provider.address_city) {
        const cityName = provider.address_city.trim();
        providerCountsMap.set(cityName, (providerCountsMap.get(cityName) || 0) + 1);
      }
    });
    
    // Get interest counts using RPC function (for backward compatibility)
    const { data: interestCounts, error: countsError } = await supabase.rpc('get_city_interest_counts');
    
    if (countsError) {
      console.error('[Cities API] Error fetching interest counts:', countsError);
      // Continue without interest counts, not critical
    }
    
    // Create a map of city_name -> interest_count for quick lookup
    const interestCountsMap = new Map<string, number>();
    (interestCounts || []).forEach((item: { city_name: string; interest_count: number }) => {
      interestCountsMap.set(item.city_name, Number(item.interest_count));
    });
    
    // Join cities with provider counts and interest counts
    const citiesWithCounts = (citiesData || []).map((city) => ({
      ...city,
      provider_count: providerCountsMap.get(city.city_name) || 0,
      interest_count: interestCountsMap.get(city.city_name) || 0,
    }));
    
    // Sort by provider count (descending), then by city name (ascending)
    citiesWithCounts.sort((a, b) => {
      if (b.provider_count !== a.provider_count) {
        return b.provider_count - a.provider_count;
      }
      return a.city_name.localeCompare(b.city_name);
    });

    // Log for debugging
    console.log('[Cities API] Returning cities with provider counts:', 
      citiesWithCounts.map(c => `${c.city_name}: ${c.provider_count} providers`).join(', '));

    // 3. Return success response
    return NextResponse.json(
      { 
        data: citiesWithCounts,
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
