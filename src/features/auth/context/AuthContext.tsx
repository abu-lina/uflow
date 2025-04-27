'use client';

import { createContext, useContext, useEffect, useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { createClient, Session, User, SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/config/environment';
import type { Database, ProfileInsert } from '@/types/database';

interface AuthResponse {
  error: Error | null;
  data: User | null;
  success: boolean;
  message?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_ERRORS = {
  PROFILE_CREATE_FAILED: 'Failed to create user profile',
  USER_EXISTS: 'User already exists',
  NO_USER_DATA: 'No user data returned',
  UNKNOWN: 'An unknown error occurred',
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<
    Database['public']['Tables']['profiles']['Row']['role'] | null
  >(null);
  const router = useRouter();
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  const hasRole = (role: Database['public']['Tables']['profiles']['Row']['role']): boolean =>
    userRole === role;

  const createProfile = async (user: User): Promise<AuthResponse> => {
    if (!user.email) {
      return {
        error: new Error('User email is required'),
        data: null,
        success: false,
      };
    }

    const profile: ProfileInsert = {
      id: user.id,
      email: user.email,
      role: 'customer',
    };

    const { error } = await supabase.from('profiles').insert([profile]);

    if (error) {
      await supabase.auth.signOut();
      return {
        error: new Error(AUTH_ERRORS.PROFILE_CREATE_FAILED),
        data: null,
        success: false,
      };
    }

    return {
      error: null,
      data: user,
      success: true,
    };
  };

  const initializeAuth = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        setUserRole(profile?.role ?? null);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role ?? null);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
  }, [router, supabase.auth]);

  const value = {
    session,
    user,
    isLoading,
    userRole,
    hasRole,
    createProfile,
    signOut,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  userRole: Database['public']['Tables']['profiles']['Row']['role'] | null;
  hasRole: (role: Database['public']['Tables']['profiles']['Row']['role']) => boolean;
  createProfile: (user: User) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient<Database>;
}
