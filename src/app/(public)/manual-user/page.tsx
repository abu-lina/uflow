import { cookies as nextCookies } from 'next/headers';

import type { SupabaseUser } from '@/types/supabase-user';

export default async function ManualUserFetch() {
  const accessToken = nextCookies().get('sb-access-token')?.value;
  if (!accessToken) {
    return <pre>No access token</pre>;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  });
  const user = (await res.json()) as SupabaseUser;
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}
