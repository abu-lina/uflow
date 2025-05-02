import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/environment';
import type { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client with proper configuration.
 * This should only be used in server-side code (API routes, server components, etc.).
 * Uses the service role key for elevated permissions.
 */
export const createServerSideClient = () => {
  const cookieStore = cookies();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'uflow-server',
        Cookie: cookieStore.toString(),
      },
    },
  });
};

// Export type-safe utilities
export const query = (table: keyof Database['public']['Tables']) =>
  createServerSideClient().from(table);
