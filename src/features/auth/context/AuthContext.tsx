'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Types
interface AuthResponse {
  error: AuthError | Error | null;
  success: boolean;
  message?: string;
}

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: string | null;
  supabase: typeof supabase;
  hasRole: (role: string) => boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Error Messages
const AUTH_ERRORS = {
  USER_EXISTS: 'This email is already registered. Please try logging in instead.',
  NO_USER_DATA: 'No user data returned',
  UNKNOWN: 'An unknown error occurred',
  PROFILE_CREATE_FAILED: 'Failed to create user profile',
  CONTEXT_ERROR: 'useAuth must be used within an AuthProvider',
} as const;

// Helper Functions
const createUserProfile = async (user: User): Promise<AuthResponse> => {
  const profile: UserProfile = {
    id: user.id,
    email: user.email!,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    await supabase.auth.signOut();
    return { 
      error: new Error(AUTH_ERRORS.PROFILE_CREATE_FAILED), 
      success: false 
    };
  }

  return { 
    error: null, 
    success: true,
    message: 'Please check your email for confirmation link!' 
  };
};

// Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  const hasRole = (role: string): boolean => userRole === role;

  const fetchUserRole = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setUserRole(data?.role ?? null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          await fetchUserRole(session.user.id);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
          router.refresh();
        } else {
          setUserRole(null);
        }
        
        setIsLoading(false);
      }
    );

    initializeAuth();
    return () => subscription.unsubscribe();
  }, [router]);

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data?.user) throw new Error(AUTH_ERRORS.NO_USER_DATA);

      router.refresh();
      return { error: null, success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        error: error instanceof Error ? error : new Error(AUTH_ERRORS.UNKNOWN),
        success: false,
      };
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('user already registered')) {
          throw new Error(AUTH_ERRORS.USER_EXISTS);
        }
        throw error;
      }

      if (!data?.user) throw new Error(AUTH_ERRORS.NO_USER_DATA);

      return createUserProfile(data.user);
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        error: error instanceof Error ? error : new Error(AUTH_ERRORS.UNKNOWN),
        success: false,
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        session,
        isLoading,
        userRole,
        supabase,
        hasRole,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(AUTH_ERRORS.CONTEXT_ERROR);
  }
  return context;
} 