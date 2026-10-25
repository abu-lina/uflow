import 'server-only';

import { isAdmin } from '@/lib/auth/roles';
import { createSupabaseCallerClient } from '@/lib/supabase/server';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import {
  summarizeScreenings,
  type ProviderScreeningsResult,
  type ScreeningRow,
} from '@/features/admin/utils/provider-screenings';

/** Fail closed: if the role can't be determined, the caller is not an admin. */
export async function canViewScreenings(): Promise<boolean> {
  return getUserFromCookie()
    .then((user) => (user ? isAdmin(user.id) : false))
    .catch(() => false);
}

/**
 * Latest screening per source for one provider. Admin only: the role comes
 * from public.users, and the caller-scoped client keeps the table's admin RLS
 * policy as a second barrier. Non-admins never trigger a query.
 */
export async function getProviderScreenings(providerId: string): Promise<ProviderScreeningsResult> {
  if (!(await canViewScreenings())) return { state: 'forbidden' };

  try {
    const supabase = await createSupabaseCallerClient();
    const { data, error } = await supabase
      .from('provider_screenings')
      .select('screening_id, source, status, flags, created_at')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) return { state: 'error' };
    return summarizeScreenings((data ?? []) as ScreeningRow[]);
  } catch {
    return { state: 'error' };
  }
}
