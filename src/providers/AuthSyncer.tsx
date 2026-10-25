'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

const isSameSession = (a: TokenPair | null, b: TokenPair) =>
  a?.access_token === b.access_token && a?.refresh_token === b.refresh_token;

const toTokenPair = (session: Session | null): TokenPair | null =>
  session?.access_token && session?.refresh_token
    ? { access_token: session.access_token, refresh_token: session.refresh_token }
    : null;

export function AuthSyncer() {
  const { user, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const hasShownExpiryWarningRef = useRef(false);
  // The session the client currently holds, as last reported by an auth event.
  const activeSessionRef = useRef<TokenPair | null>(null);
  const hasSeenAuthEventRef = useRef(false);
  // Access token whose validation or sync already ran (or is running).
  const handledTokenRef = useRef<string | null>(null);

  /**
   * Posts the tokens to /api/auth/set only if Supabase accepts the access token.
   * A session persisted by a different Supabase stack is rejected, destroyed in
   * local storage and never reaches the cookie jar. Runs once per access token.
   * Network failures are inconclusive, so they neither sync nor sign out, and
   * the token may be retried. The active session is re-checked after every await,
   * so a superseded session can neither write cookies nor sign out the new one.
   */
  const syncSession = useCallback(async (pair: TokenPair) => {
    if (!isSameSession(activeSessionRef.current, pair)) return;
    if (handledTokenRef.current === pair.access_token) return;
    handledTokenRef.current = pair.access_token;
    const allowRetry = () => {
      if (handledTokenRef.current === pair.access_token) handledTokenRef.current = null;
    };

    try {
      let validation;
      try {
        validation = await supabase.auth.getUser(pair.access_token);
      } catch {
        allowRetry();
        return;
      }
      if (!isSameSession(activeSessionRef.current, pair)) return;

      const { data, error } = validation;
      if (error && isAuthRetryableFetchError(error)) {
        allowRetry();
        return;
      }
      if (error || !data.user) {
        // Not awaited: signOut takes the auth lock, and this can run inside onAuthStateChange.
        void supabase.auth.signOut({ scope: 'local' });
        return;
      }

      const response = await fetch('/api/auth/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pair),
      });

      if (response.ok) return;
      allowRetry();
      const body = await response.json().catch(() => ({}));
      if (
        (body.error?.includes('expired') || body.error?.includes('token')) &&
        !hasShownExpiryWarningRef.current
      ) {
        toast.error('Your session has expired. Please sign in again.', {
          duration: 5000,
          action: {
            label: 'Sign In',
            onClick: () => routerRef.current.push('/login'),
          },
        });
        hasShownExpiryWarningRef.current = true;
      }
    } catch {
      allowRetry();
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthSyncer] Failed to sync tokens to cookies');
      }
    }
  }, []);

  // Covers a persisted session that no auth event has reported yet.
  useEffect(() => {
    const pair = toTokenPair(session);
    if (!pair) return;
    if (!hasSeenAuthEventRef.current) activeSessionRef.current = pair;
    void syncSession(pair);
  }, [session, syncSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        hasShownExpiryWarningRef.current = false;
      }

      const pair = toTokenPair(nextSession);
      hasSeenAuthEventRef.current = true;
      activeSessionRef.current = pair;
      if (pair) await syncSession(pair);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncSession]);

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
