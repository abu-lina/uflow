/**
 * @fileoverview Supabase table operations for authentication
 * @module supabase/tables/auth
 */

import { type Provider, AuthError, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthData } from '@/types/auth';

interface AuthResult<T = User> {
  data: T | null;
  error: AuthError | null;
}

/**
 * Signs in a user with email and password
 * @param email - User's email
 * @param password - User's password
 * @returns Promise<AuthResult> Authentication result
 */
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data: data?.user ?? null, error };
  } catch (error) {
    return { data: null, error: error as AuthError };
  }
};

/**
 * Signs up a new user
 * @param email - User's email
 * @param password - User's password
 * @returns Promise<AuthResult> Authentication result
 */
export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data: data?.user ?? null, error };
  } catch (error) {
    return { data: null, error: error as AuthError };
  }
};

/**
 * Signs out the current user
 * @returns Promise<AuthResult<void>> Authentication result
 */
export const signOut = async (): Promise<AuthResult<void>> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { data: null, error };
  } catch (error) {
    return { data: null, error: error as AuthError };
  }
};

/**
 * Sends a password reset email
 * @param email - User's email
 * @returns Promise<AuthResult<void>> Authentication result
 */
export const resetPassword = async (email: string): Promise<AuthResult<void>> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    return { data: null, error };
  } catch (error) {
    return { data: null, error: error as AuthError };
  }
};

/**
 * Updates the current user's password
 * @param password - New password
 * @returns Promise<AuthResult> Authentication result
 */
export const updatePassword = async (password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });
    return { data: data?.user ?? null, error };
  } catch (error) {
    return { data: null, error: error as AuthError };
  }
};

/**
 * Gets the current session
 * @returns Promise<Session | null> Current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Gets the current user
 * @returns Promise<User | null> Current user
 */
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Signs in with a provider (OAuth)
 * @param provider - OAuth provider
 * @returns Promise<{ url: string | null; error: AuthError | null }> Authentication result
 */
export const signInWithProvider = async (provider: Provider): Promise<{ url: string | null; error: AuthError | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { url: data?.url ?? null, error };
  } catch (error) {
    return { url: null, error: error as AuthError };
  }
};

/**
 * Fetches user authentication data
 * @param userId - User ID
 * @returns Promise<AuthData | null> User auth data
 */
export const getUserAuth = async (userId: string): Promise<AuthData | null> => {
  const { data, error } = await supabase
    .from('auth')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}; 