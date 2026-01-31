import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

const FOURSQUARE_API_URL = 'https://places-api.foursquare.com/places/search';
const FOURSQUARE_CATEGORY_MOSQUE = '5ef17a861a251a003bea905b';
const FOURSQUARE_CATEGORY_HALAL_RESTAURANT = '52e81612bcbc57f1066b79ff';

/**
 * GET /api/places/foursquare/search
 * 
 * Proxy for Foursquare Places API search
 * 
 * Query params:
 * - query: search query string
 * - lat: latitude
 * - lon: longitude
 * - limit: number of results (optional, default 10)
 * 
 * Rate limiting: 30 requests per minute per IP
 */
export async function GET(request: Request) {
  try {
    // 1. Rate limiting - 30 requests per minute per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 30, 60 * 1000, 'foursquare-search');
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Get API key from server-side env
    const apiKey = process.env.FOURSQUARE_API_KEY;
    const placeholder = 'your_foursquare_api_key_here';

    if (!apiKey || apiKey === placeholder) {
      return NextResponse.json(
        { error: 'Foursquare API not configured' },
        { status: 503 }
      );
    }

    if (apiKey.length < 10) {
      return NextResponse.json(
        { error: 'Invalid Foursquare API key configuration' },
        { status: 503 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const limit = searchParams.get('limit') || '10';

    if (!query || !lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: query, lat, lon' },
        { status: 400 }
      );
    }

    // 4. Build Foursquare API request
    const categories = `${FOURSQUARE_CATEGORY_MOSQUE},${FOURSQUARE_CATEGORY_HALAL_RESTAURANT}`;
    const params = new URLSearchParams({
      query: query.trim(),
      categories,
      ll: `${lat},${lon}`,
      radius: '5000', // 5km radius
      limit,
      sort: 'DISTANCE',
      fields: 'fsq_place_id,name,location,latitude,longitude,categories,tel,website,email,social_media',
    });

    // 5. Make request to Foursquare API
    const response = await fetch(`${FOURSQUARE_API_URL}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('[Foursquare API] Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      return NextResponse.json(
        { error: 'Failed to fetch places from Foursquare' },
        { status: response.status }
      );
    }

    // 6. Parse and return response
    const data = await response.json();
    
    return NextResponse.json(
      { data: data.results || [], error: null },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Foursquare API] Unexpected error:', error);
    
    return NextResponse.json(
      { error: 'An error occurred while searching places' },
      { status: 500 }
    );
  }
}
