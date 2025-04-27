import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { env } from '@/config/environment';

export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Cookie: cookieStore.toString(),
      },
    },
  });

  return supabase;
};
