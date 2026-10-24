'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/**
 * Posts the tokens to /api/auth/set only if Supabase accepts the access token.
 * A session persisted by a different Supabase stack is rejected, destroyed in
 * local storage and never reaches the cookie jar. Returns null when nothing
 * was posted. Network failures are inconclusive, so they neither sync nor sign out.
 */
async function syncValidSession(session: TokenPair): Promise<Response | null> {
  const { data, error } = await supabase.auth.getUser(session.access_token);

  if (error && isAuthRetryableFetchError(error)) return null;

  if (error || !data.user) {
    // Not awaited: signOut takes the auth lock, and this can run inside onAuthStateChange.
    void supabase.auth.signOut({ scope: 'local' });
    return null;
  }

  return fetch('/api/auth/set', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });
}

export function AuthSyncer() {
  const { user, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);

  // Sync session tokens to cookies for server-side access
  useEffect(() => {
    if (session?.access_token && session?.refresh_token) {
      // Sync tokens to cookies so server-side can access them
      syncValidSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }).catch((error) => {
        // Silently fail - cookies might not be critical for client-side
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthSyncer] Failed to sync tokens to cookies:', error);
        }
      });
    }
  }, [session?.access_token, session?.refresh_token]);

  useEffect(() => {
    // Listen for auth state changes to sync tokens
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED') {
        setHasShownExpiryWarning(false); // Reset warning on successful refresh
      }

      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setHasShownExpiryWarning(false);
      }

      // Sync tokens whenever session changes (login, refresh, etc.)
      if (session?.access_token && session?.refresh_token) {
        try {
          const response = await syncValidSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });

          if (response && !response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.error?.includes('expired') || data.error?.includes('token')) {
              if (!hasShownExpiryWarning) {
                toast.error('Your session has expired. Please sign in again.', {
                  duration: 5000,
                  action: {
                    label: 'Sign In',
                    onClick: () => router.push('/login'),
                  },
                });
                setHasShownExpiryWarning(true);
              }
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AuthSyncer] Failed to sync tokens on auth change:', error);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, hasShownExpiryWarning]);

  useEffect(() => {
    // Only handle auth=required if user is not authenticated
    if (typeof window !== 'undefined' && window.location.search.includes('auth=required')) {
      if (!user) {
        // If no user is authenticated, redirect to home
        router.replace('/');
      } else {
        // If user is authenticated but server-side auth failed,
        // just remove the query param without signing out
        // This prevents the logout issue when clicking profile menu
        router.replace(pathname);
      }
    }
  }, [pathname, user, router]);

  return null;
}
