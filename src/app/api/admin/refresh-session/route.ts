import { NextResponse } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';

/**
 * POST /api/admin/refresh-session
 * 
 * Manually refresh the authentication session and sync tokens to cookies
 * Useful when automatic token refresh fails or tokens are expired
 * Requires admin or moderator role
 */
export async function POST() {
  // Security: Require authentication
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to access this endpoint' },
      { status: 401 }
    );
  }

  // Security: Require admin or moderator role
  const hasAccess = await isAdminOrModerator(user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin or Moderator access required' },
      { status: 403 }
    );
  }
  try {
    const cookieStore = await nextCookies();
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'No refresh token found',
          message: 'Please log in again to get a fresh session',
        },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Refresh the token
    const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: supabaseAnonKey,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
      }),
    });

    if (!refreshRes.ok) {
      const errorText = await refreshRes.text();
      return NextResponse.json(
        { 
          error: 'Failed to refresh token',
          details: errorText,
          message: 'Your session has expired. Please log in again.',
        },
        { status: 401 }
      );
    }

    const refreshData = await refreshRes.json() as { 
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Update cookies with new tokens
    const response = NextResponse.json({
      success: true,
      message: 'Session refreshed successfully',
      expires_in: refreshData.expires_in,
    });

    response.cookies.set('sb-access-token', refreshData.access_token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: refreshData.expires_in,
    });

    response.cookies.set('sb-refresh-token', refreshData.refresh_token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/refresh-session
 * 
 * Check if session refresh is available
 * Requires admin or moderator role
 */
export async function GET() {
  // Security: Require authentication
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'You must be logged in to access this endpoint' },
      { status: 401 }
    );
  }

  // Security: Require admin or moderator role
  const hasAccess = await isAdminOrModerator(user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin or Moderator access required' },
      { status: 403 }
    );
  }
  try {
    const cookieStore = await nextCookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    return NextResponse.json({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      canRefresh: !!refreshToken,
      message: refreshToken 
        ? 'Session can be refreshed. Call POST /api/admin/refresh-session to refresh.'
        : 'No refresh token available. Please log in again.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

