/**
 * @fileoverview Supabase client configuration
 * @module supabase/client
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/environment';
import type { Database } from '@/types/supabase';

/**
 * Creates a client-side Supabase client with proper configuration.
 * This should only be used in client-side code and browser environments.
 */
export const createClientSideClient = () => {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'uflow-web',
      },
    },
  });
};

// Export a singleton instance for client-side use
export const supabase = createClientSideClient();

// Add error handling middleware
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    // Delete any local storage items
    localStorage.removeItem('supabase.auth.token');
  }
});

// Export type-safe utilities
export const query = supabase.from;
export const storage = supabase.storage;
