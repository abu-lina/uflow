'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { clearInvalidSession } from '@/lib/supabase/clearInvalidSession';

import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/auth/roles';

const VALID_ROLES: readonly UserRole[] = ['user', 'owner', 'admin', 'moderator'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  /**
   * Authoritative role from public.users (#567). Never read from
   * user_metadata.role, which users can write themselves via
   * supabase.auth.updateUser(). Null when signed out or not yet resolved.
   */
  role: UserRole | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  /** Role resolved server-side from public.users for first paint. */
  initialRole?: UserRole | null;
}

export function AuthProvider({
  children,
  initialUser = null,
  initialRole = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(initialUser ? initialRole : null);
  const [isLoading, setIsLoading] = useState(initialUser === null);
  // Guards against a role fetch resolving after the user changed (sign-out
  // or a different account signed in while the query was in flight).
  const userIdRef = useRef<string | null>(initialUser?.id ?? null);

  // Key the effect on the id, not the object: initialUser is a fresh object
  // on every RSC render, and depending on it would re-subscribe on every
  // router.refresh() for no reason.
  const initialUserId = initialUser?.id ?? null;

  useEffect(() => {
    let mounted = true;
    let roleFetchTimer: ReturnType<typeof setTimeout> | undefined;

    // Reads the caller's own public.users row. The browser client carries the
    // session JWT, so the "users can view their own profile" RLS policy is
    // what authorizes this read — same row the server gates consult.
    const fetchRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) {
          // Still fails closed to 'user' below, but make the demotion
          // diagnosable: RLS denials, expired tokens and PostgREST 5xx
          // land here as returned errors, not as throws.
          console.warn('[fetchRole] role lookup failed:', error.message);
        }
        if (mounted && userIdRef.current === userId) {
          const rowRole = data?.role;
          setRole(
            typeof rowRole === 'string' && (VALID_ROLES as readonly string[]).includes(rowRole)
              ? (rowRole as UserRole)
              : 'user',
          );
        }
      } catch {
        // Only a thrown lookup (network down, client threw) keeps the
        // current role rather than flashing admin chrome off and on. A
        // returned PostgREST error takes the path above and resolves to
        // 'user'.
      }
    };

    const applyAuthState = (nextSession: Session | null) => {
      const nextUser = nextSession?.user ?? null;
      userIdRef.current = nextUser?.id ?? null;
      setSession(nextSession);
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
      } else {
        // Defer the read so it runs after supabase-js finishes emitting the
        // auth event; calling back into the client inside the callback can
        // deadlock on its internal auth lock.
        roleFetchTimer = setTimeout(() => {
          void fetchRole(nextUser.id);
        }, 0);
      }
    };

    if (initialUserId === null) {
      const initializeAuth = async () => {
        try {
          const {
            data: { session: initialSession },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.warn('Auth session error:', error.message);
            // Clear any invalid session data
            clearInvalidSession();
            await supabase.auth.signOut();
          }

          if (mounted) {
            applyAuthState(initialSession);
          }
        } catch (err) {
          // Error handled silently - user will be null
          console.warn('Auth initialization error:', err);
          if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
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
        // Every event carries the new session (or null on SIGNED_OUT), so one
        // path covers SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, INITIAL_SESSION,
        // USER_UPDATED, etc. Role is refetched so the UI stays correct
        // without a reload even if public.users changed mid-session.
        applyAuthState(session);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(roleFetchTimer);
      subscription.unsubscribe();
    };
  }, [initialUserId]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    userIdRef.current = null;
    setUser(null);
    setSession(null);
    setRole(null);
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
    role,
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
