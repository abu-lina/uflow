import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies as nextCookies } from 'next/headers';

import { cookieAdapter } from './cookieAdapter';

/**
 * NOTE: this client's @supabase/ssr cookie adapter looks for
 * `sb-auth-token`, which this app's auth never writes (`/api/auth/set`
 * writes `sb-access-token`), so every query through it silently runs as
 * anon. Do not use it for RLS-sensitive reads — use
 * `createSupabaseCallerClient()`. The app-wide fix is tracked in #552.
 */
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
 * This is a scoped workaround for #547's /p/<id> path, not the general
 * fix: `createSupabaseServerClient()` still reads the `@supabase/ssr`
 * session cookie (`sb-auth-token`) that this app's auth never writes — the
 * session lives in the custom httpOnly `sb-access-token` cookie written by
 * `/api/auth/set`. The result was that every SSR fetch ran anon (#547):
 * RLS-correct rows like "creator can read their own pending provider" were
 * invisible to server components. The app-wide fix for the old client is
 * tracked in #552; do not read this duplication as an accident.
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
