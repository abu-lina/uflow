import 'server-only';

import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseCallerClient } from '@/lib/supabase/server';

import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/auth/roles';

export interface InitialAuth {
  user: User | null;
  role: UserRole | null;
}

/**
 * Resolve the request's auth state for first paint (issue #567).
 *
 * The client chrome must not trust the self-writable `user_metadata.role`
 * JWT claim. This resolves the role from `public.users` through the
 * request-scoped caller client, so the "users can view their own profile"
 * RLS policy (`auth.uid() = user_id`) is what authorizes the read. The
 * service-role client is deliberately not used on the root render path.
 *
 * Role is `null` only when nobody is signed in. When the row is missing or
 * the lookup fails, it fails closed to 'user' (never silently admin).
 */
export async function getInitialAuth(): Promise<InitialAuth> {
  const user = await getUserFromCookie();
  if (!user) {
    return { user: null, role: null };
  }

  try {
    const supabase = await createSupabaseCallerClient();
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[getInitialAuth] role lookup failed:', error.message);
      return { user: user as unknown as User, role: 'user' };
    }

    return {
      user: user as unknown as User,
      role: (data?.role as UserRole) ?? 'user',
    };
  } catch (err) {
    console.warn('[getInitialAuth] role lookup threw:', err);
    return { user: user as unknown as User, role: 'user' };
  }
}
