'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';

import { type Session, type User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);

        const {
          data: { subscription },
        } = await supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth state management:', error);
        setLoading(false);
      }
    })();
  }, []);

  return <AuthContext.Provider value={{ session, user, loading }}>{children}</AuthContext.Provider>;
}
