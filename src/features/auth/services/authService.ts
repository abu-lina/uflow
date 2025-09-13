import { supabase } from '@/lib/supabase/client';

export const authService = {
  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  updateUser: (updates: { email?: string; password?: string; data?: Record<string, unknown> }) =>
    supabase.auth.updateUser(updates),
  deleteUser: () => {
    // Note: This requires admin privileges or special handling
    // For now, we'll just sign out the user
    console.warn('Account deletion not fully implemented - signing out user');
    return supabase.auth.signOut();
  },
};
