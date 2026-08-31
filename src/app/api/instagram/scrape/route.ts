import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Require authentication — scraping is only available to signed-in users
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Rate limit: 10 scrape requests per hour per user
    const identifier = getClientIdentifier(request, user.id);
    if (!checkRateLimit(identifier, 10, 60 * 60 * 1000, 'instagram-scrape')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // F-049-07: Validate username format to prevent path traversal / injection
    const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
    if (!INSTAGRAM_USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: 'Invalid Instagram username format' },
        { status: 400 }
      );
    }

    // Method 1: Try Instagram's public GraphQL endpoint
    // This endpoint returns public data without authentication
    const response = await fetch(
      `https://www.instagram.com/${username}/?__a=1&__d=dis`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );

    if (!response.ok) {
      // Method 2: Fallback to scraping the HTML page
      return await scrapeInstagramHTML(username);
    }

    const data = await response.json();
    const userData = data?.graphql?.user || data?.user;

    if (!userData) {
      return NextResponse.json(
        { error: 'Profile not found or is private' },
        { status: 404 }
      );
    }

    // Extract recent images
    const recentImages: string[] = [];
    const posts = userData.edge_owner_to_timeline_media?.edges || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts.slice(0, 12).forEach((edge: any) => {
      if (edge.node?.display_url) {
        recentImages.push(edge.node.display_url);
      }
    });

    const instagramData = {
      username: userData.username || username,
      name: userData.full_name || userData.username,
      biography: userData.biography || '',
      website: userData.external_url || undefined,
      profilePicUrl: userData.profile_pic_url_hd || userData.profile_pic_url,
      recentImages,
      followersCount: userData.edge_followed_by?.count,
      isBusinessAccount: userData.is_business_account || false,
      businessCategory: userData.business_category_name || undefined,
      businessEmail: userData.business_email || undefined,
      businessPhone: userData.business_phone_number || undefined,
      businessAddress: userData.business_address_json 
        ? JSON.parse(userData.business_address_json).street_address 
        : undefined,
    };

    return NextResponse.json(instagramData);
  } catch (error) {
    console.error('Error scraping Instagram:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Instagram data. The profile might be private or Instagram may have rate-limited the request.' 
      },
      { status: 500 }
    );
  }
}

async function scrapeInstagramHTML(username: string) {
  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error('Profile not found');
    }

    const html = await response.text();

    // Extract JSON data from the HTML
    // Using [\s\S]*? instead of .*? with /s flag for ES5 compatibility
    const scriptRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/;
    const match = html.match(scriptRegex);

    if (!match) {
      // Try to extract from window._sharedData
      const sharedDataRegex = /window\._sharedData = ({.+?});/;
      const sharedDataMatch = html.match(sharedDataRegex);
      
      if (sharedDataMatch) {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const userData = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        
        if (userData) {
          const recentImages: string[] = [];
          const posts = userData.edge_owner_to_timeline_media?.edges || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          posts.slice(0, 12).forEach((edge: any) => {
            if (edge.node?.display_url) {
              recentImages.push(edge.node.display_url);
            }
          });

          return NextResponse.json({
            username: userData.username,
            name: userData.full_name || userData.username,
            biography: userData.biography || '',
            website: userData.external_url || undefined,
            profilePicUrl: userData.profile_pic_url_hd || userData.profile_pic_url,
            recentImages,
            followersCount: userData.edge_followed_by?.count,
            isBusinessAccount: userData.is_business_account || false,
            businessCategory: userData.business_category_name || undefined,
          });
        }
      }

      throw new Error('Could not extract profile data');
    }

    const jsonData = JSON.parse(match[1]);

    // Extract basic info from JSON-LD
    const instagramData = {
      username,
      name: jsonData.name || username,
      biography: jsonData.description || '',
      website: jsonData.url || undefined,
      profilePicUrl: jsonData.image || undefined,
      recentImages: [],
      followersCount: undefined,
      isBusinessAccount: false,
    };

    return NextResponse.json(instagramData);
  } catch (error) {
    console.error('Error scraping Instagram HTML:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Instagram profile' },
      { status: 500 }
    );
  }
}

