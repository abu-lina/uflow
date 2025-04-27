'use client';

import { useEffect } from 'react';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/environment';
import type { Database } from '@/types/database';

import type { SupabaseClient } from '@supabase/supabase-js';

export default function SupabaseLogger() {
  useEffect(() => {
    let supabase: SupabaseClient<Database>;
    let subscription: { unsubscribe: () => void };

    try {
      supabase = createClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        }
      );

      // Log connection status (safely)
      console.log('[Supabase] Connection Status:', {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 10) + '...',
      });

      // Subscribe to auth state changes
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase] Auth State Changed:', { event, session });
      });

      subscription = sub;
    } catch (error) {
      console.error('[Supabase] Initialization Error:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return null;
}
