'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  supabase: typeof supabase;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<{
    error: AuthError | Error | null;
    success: boolean;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: AuthError | Error | null;
    success: boolean;
    message?: string;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          // Fetch user role
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          setUserRole(userData?.role || null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch user role on auth state change
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          setUserRole(userData?.role || null);
        } else {
          setUserRole(null);
        }
        setIsLoading(false);
        if (session) {
          router.refresh();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error, success: false };
      }

      if (data?.user) {
        router.refresh();
        return { error: null, success: true };
      }

      return { error: new Error('No user data returned'), success: false };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown error'),
        success: false,
      };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('user already registered')) {
          return { 
            error: new Error('This email is already registered. Please try logging in instead.'), 
            success: false 
          };
        }
        console.error('Sign up error:', authError);
        return { error: authError, success: false };
      }

      if (!authData?.user) {
        return { error: new Error('No user data returned'), success: false };
      }

      // Create a profile for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        // If profile creation fails, we should clean up and sign out
        await supabase.auth.signOut();
        return { 
          error: new Error('This email is already registered. Please try logging in instead.'), 
          success: false 
        };
      }

      return { 
        error: null, 
        success: true,
        message: 'Please check your email for confirmation link!' 
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        error: error instanceof Error ? error : new Error('Unknown error occurred during signup'),
        success: false,
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    supabase,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 