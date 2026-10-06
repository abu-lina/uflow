import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies as nextCookies } from 'next/headers';

import { cookieAdapter } from './cookieAdapter';

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createServerClient(url, key, {
    cookies: cookieAdapter,
    cookieOptions: {
      name: 'sb',
    },
  });
}

/**
 * Server client that queries as the current request's caller.
 *
 * This app's auth never writes the `@supabase/ssr` session cookie
 * (`sb-auth-token`) that `createSupabaseServerClient()` reads — the session
 * lives in the custom httpOnly `sb-access-token` cookie written by
 * `/api/auth/set`. The result was that every SSR fetch ran anon (#547):
 * RLS-correct rows like "creator can read their own pending provider" were
 * invisible to server components.
 *
 * Here the cookie's raw access token is passed via the `accessToken` client
 * option, which puts the caller's JWT on every request's Authorization
 * header — so RLS and `auth.uid()` resolve to the caller, exactly as the
 * browser client behaves. The middleware guard forwards the same token to
 * the same predicate, so edge decision and page render cannot diverge.
 *
 * Caveats:
 * - `supabase.auth` is disabled on this client (the `accessToken` option
 *   turns it into a throwing proxy). Use `getUserFromCookie()` for identity.
 * - An expired token makes PostgREST answer 401; reads fail instead of
 *   silently downgrading to anon. Middleware already treats that as
 *   "could not determine" and fails open.
 * - No cookie means a plain anon client — never silently "logged in".
 */
export async function createSupabaseCallerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await nextCookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (!accessToken) {
    return createSupabaseServerClient();
  }

  return createClient(url, key, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
