import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultClient } from '@/lib/supabase/client';

/**
 * Returns the provided Supabase client or falls back to the default browser client.
 * Mirrors the badges.ts pattern: server callers pass createSupabaseServerClient(),
 * client callers omit the parameter.
 */
export function getSupabaseClient(client?: SupabaseClient): SupabaseClient {
  return client || defaultClient;
}
