/**
 * @fileoverview Supabase client configuration
 * @module supabase/client
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create and export the Supabase client
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Add error handling middleware
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    // Delete any local storage items
    localStorage.removeItem('supabase.auth.token');
  }
});

// Export a type-safe query builder
export const query = supabase.from;

// Export a type-safe storage client
export const storage = supabase.storage;
