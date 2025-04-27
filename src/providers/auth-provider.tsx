'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/environment';
import { AuthProvider as AuthContextProvider } from '@/features/auth/context/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  return <AuthContextProvider>{children}</AuthContextProvider>;
}
