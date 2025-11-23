import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { getClientIP } from '@/utils/security';

/**
 * GET /api/user/export-data
 * 
 * Exports all user data in JSON format (GDPR Right to Portability)
 * Rate limited to 1 export per hour per user
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Rate limiting: 1 export per hour per user
    const identifier = getClientIdentifier(request, user.id);
    if (!checkRateLimit(identifier, 1, 60 * 60 * 1000, 'data-export')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can export your data once per hour.' },
        { status: 429 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 3. Collect all user data
    const userData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    };

    // 3.1 User profile from public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is okay
      console.error('[EXPORT] Error fetching user profile:', profileError);
    }
    userData.profile = userProfile || null;

    // 3.2 User metadata from auth.users (via admin API if needed)
    userData.userMetadata = user.user_metadata || {};

    // 3.3 Providers created by user
    const { data: providers, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .eq('user_created_id', user.id);

    if (providersError) {
      console.error('[EXPORT] Error fetching providers:', providersError);
    }
    userData.providers = providers || [];

    // 3.4 Bookmarks
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id);

    if (bookmarksError) {
      console.error('[EXPORT] Error fetching bookmarks:', bookmarksError);
    }
    userData.bookmarks = bookmarks || [];

    // 3.5 Consent logs
    const { data: consentLogs, error: consentError } = await supabase
      .from('consent_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false });

    if (consentError) {
      console.error('[EXPORT] Error fetching consent logs:', consentError);
    }
    userData.consentLogs = consentLogs || [];

    // 3.6 Community services created by user (if applicable)
    const { data: communityServices, error: communityServicesError } = await supabase
      .from('community_services')
      .select('*')
      .eq('user_created_id', user.id);

    if (communityServicesError && communityServicesError.code !== 'PGRST116') {
      console.error('[EXPORT] Error fetching community services:', communityServicesError);
    }
    userData.communityServices = communityServices || [];

    // 4. Log export request for audit (optional)
    const ip = getClientIP(request);
    console.log(`[EXPORT] User ${user.id} exported their data from IP ${ip}`);

    // 5. Return JSON with download headers
    const jsonString = JSON.stringify(userData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="my-data-${timestamp}.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[EXPORT] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while exporting your data' },
      { status: 500 }
    );
  }
}
