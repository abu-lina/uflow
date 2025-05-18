import { createServerClient } from '@supabase/ssr';

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
