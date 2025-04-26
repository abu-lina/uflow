'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export default function SupabaseLogger() {
  useEffect(() => {
    let supabase: SupabaseClient<Database>;
    let subscription: { unsubscribe: () => void };

    try {
      supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Log connection status (safely)
      console.log('[Supabase] Connection Status:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) + '...'
      });

      // Subscribe to auth state changes
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
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