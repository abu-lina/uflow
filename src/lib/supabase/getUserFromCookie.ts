import { cookies as nextCookies } from 'next/headers';
import { createSupabaseServerClient } from './server';

import type { SupabaseUser } from '@/types/supabase-user';

/**
 * Get user from cookie - tries multiple methods:
 * 1. Custom sb-access-token cookie (if app uses custom cookies)
 * 2. Supabase SSR client (if app uses standard Supabase SSR)
 */
export async function getUserFromCookie(): Promise<SupabaseUser | null> {
  // First, try using Supabase SSR client (standard approach)
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      return user as unknown as SupabaseUser;
    }
    // SSR client found no user — non-terminal; falling through to custom cookie method
    console.warn({ event: 'auth_attempt', result: 'ssr_miss', reason: 'ssr_client_no_user' });
  } catch (error) {
    // SSR client failed, try custom cookie method
    if (process.env.NODE_ENV === 'development') {
      console.log('[getUserFromCookie] SSR client failed, trying custom cookie:', error);
    }
  }

  // Fallback: Try custom sb-access-token cookie
  const cookies = await nextCookies();
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken) {
    console.warn({ event: 'auth_outcome', result: 'no_user', reason: 'no_access_token_cookie' });
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[getUserFromCookie] Missing Supabase environment variables');
    console.warn({ event: 'auth_outcome', result: 'no_user', reason: 'missing_env_vars' });
    return null;
  }

  try {
    // Try to get user with access token
    let res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    });

    // If token expired (401 or 403 with expired message), try to refresh it
    const isTokenExpired = !res.ok && (res.status === 401 || res.status === 403);
    
    if (isTokenExpired && refreshToken) {
      try {
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

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json() as { 
            access_token: string;
            refresh_token?: string;
            expires_in?: number;
          };
          
          // Retry with new token
          res = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${refreshData.access_token}`,
              apikey: supabaseAnonKey,
            },
          });
          
          // Note: In a real app, you'd want to update the cookies here
          // But since we're in a server component, we can't set cookies directly
          // The client-side should handle token refresh automatically
          if (process.env.NODE_ENV === 'development' && res.ok) {
            console.log('[getUserFromCookie] Token refreshed successfully');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            const refreshErrorText = await refreshRes.text();
            console.error('[getUserFromCookie] Token refresh failed:', {
              status: refreshRes.status,
              error: refreshErrorText,
            });
          }
        }
      } catch (refreshError) {
        // Refresh failed, continue with original error
        if (process.env.NODE_ENV === 'development') {
          console.error('[getUserFromCookie] Token refresh exception:', refreshError);
        }
      }
    }

    if (!res.ok) {
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        const errorText = await res.text();
        console.error('[getUserFromCookie] Auth API error:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
          hasRefreshToken: !!refreshToken,
        });
      }
      const reason = isTokenExpired && refreshToken ? 'token_expired_refresh_failed' : 'auth_api_error';
      console.warn({ event: 'auth_outcome', result: 'no_user', reason });
      return null;
    }

    const user = (await res.json()) as SupabaseUser;
    return user;
  } catch (error) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[getUserFromCookie] Fetch error:', error);
    }
    console.warn({ event: 'auth_outcome', result: 'no_user', reason: 'fetch_error' });
    return null;
  }
}
