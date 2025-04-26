'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent, SupabaseClient, createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize Supabase client with explicit types
const supabase = createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey);

interface AuthResponse {
  error: Error | null;
  data: User | null;
  success: boolean;
  message?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  userRole: Database['public']['Enums']['user_role'] | null;
  supabase: SupabaseClient<Database, 'public'>;
  hasRole: (role: Database['public']['Enums']['user_role']) => boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
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
  const [userRole, setUserRole] = useState<Database['public']['Enums']['user_role'] | null>(null);
  const router = useRouter();

  const hasRole = (role: Database['public']['Enums']['user_role']): boolean => userRole === role;

  const createProfile = async (user: User): Promise<AuthResponse> => {
    if (!user.email) {
      return { 
        error: new Error('User email is required'), 
        data: null,
        success: false
      };
    }

    const profile: Database['public']['Tables']['profiles']['Insert'] = {
      id: user.id,
      email: user.email,
      role: 'customer' as const,
    };

    const { error } = await supabase.from('profiles').insert(profile);

    if (error) {
      await supabase.auth.signOut();
      return { 
        error: new Error(AUTH_ERRORS.PROFILE_CREATE_FAILED), 
        data: null,
        success: false
      };
    }

    return { 
      error: null, 
      data: user,
      success: true
    };
  };

  const fetchUserRole = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data && 'role' in data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
    }
  };

  const initializeAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        setUser(session.user);
        await fetchUserRole(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user || null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error, data: null, success: false };
      }

      return { error: null, data: data.user, success: true };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('An unexpected error occurred'), 
        data: null,
        success: false
      };
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error, data: null, success: false };
      }

      if (data.user) {
        return await createProfile(data.user);
      }

      return { error: null, data: null, success: true, message: 'Please check your email for confirmation link!' };
    } catch (error) {
      return { 
        error: error instanceof Error ? error : new Error('An unexpected error occurred'), 
        data: null,
        success: false
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
        session,
        user,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 