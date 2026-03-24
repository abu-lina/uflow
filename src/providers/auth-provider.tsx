'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { clearInvalidSession } from '@/lib/supabase/clearInvalidSession';

import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(initialUser === null);

  useEffect(() => {
    let mounted = true;
    if (initialUser === null) {
      const initializeAuth = async () => {
        try {
          const {
            data: { session: initialSession },
            error
          } = await supabase.auth.getSession();

          if (error) {
            console.warn('Auth session error:', error.message);
            // Clear any invalid session data
            clearInvalidSession();
            await supabase.auth.signOut();
          }

          if (mounted) {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
          }
        } catch (err) {
          // Error handled silently - user will be null
          console.warn('Auth initialization error:', err);
          if (mounted) {
            setSession(null);
            setUser(null);
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };
      void initializeAuth();
    } else {
      setIsLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (event === 'SIGNED_IN') {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          // Handle other events (INITIAL_SESSION, PASSWORD_RECOVERY, etc.)
          setSession(session);
          setUser(session?.user ?? null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSession(null);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
    signIn,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
