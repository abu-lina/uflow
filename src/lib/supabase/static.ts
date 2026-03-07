import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Stateless Supabase client for ISR/static pages (Plan 035 — M2).
 *
 * Unlike `createSupabaseServerClient()`, this does NOT call `cookies()`
 * from `next/headers`, so it won't opt the route into dynamic rendering.
 * Use for public data reads in pages with `revalidate` (ISR).
 */
export function createSupabaseStaticClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}
