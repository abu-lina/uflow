import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/environment';

export default async function LoginPage() {
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Login</h1>
      {/* Add your login form here */}
    </div>
  );
}
