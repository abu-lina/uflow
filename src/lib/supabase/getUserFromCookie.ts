import { cookies as nextCookies } from 'next/headers';

import type { SupabaseUser } from '@/types/supabase-user';

export async function getUserFromCookie(): Promise<SupabaseUser | null> {
  const accessToken = nextCookies().get('sb-access-token')?.value;
  if (!accessToken) {
    return null;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  });
  if (!res.ok) {
    return null;
  }
  const user = (await res.json()) as SupabaseUser;
  return user;
}
