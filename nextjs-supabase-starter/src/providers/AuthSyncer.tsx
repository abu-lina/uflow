'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

/**
 * AuthSyncer Component
 *
 * Syncs authentication state between server and client.
 * This component ensures that auth cookies are properly set
 * when the user's session changes.
 */
export function AuthSyncer() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Sync cookies when user signs in or token refreshes
        fetch('/api/auth/set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session?.access_token,
            refresh_token: session?.refresh_token,
          }),
        }).catch((error) => {
          console.error('Failed to sync auth state:', error);
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

