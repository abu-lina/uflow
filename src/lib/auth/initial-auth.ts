import 'server-only';

import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';

import type { User } from '@supabase/supabase-js';

export interface InitialAuth {
  user: User | null;
  role: null; // resolved client-side via onAuthStateChange → fetchRole (#570)
}

/**
 * Resolve the request's auth state for first paint.
 *
 * Role is always null — the client fetches it from public.users after hydration
 * via onAuthStateChange → fetchRole (issue #570). Removing the server-side role
 * query avoids a PostgREST round-trip on every root layout render.
 */
export async function getInitialAuth(): Promise<InitialAuth> {
  const user = await getUserFromCookie();
  return { user: user as unknown as User | null, role: null };
}
