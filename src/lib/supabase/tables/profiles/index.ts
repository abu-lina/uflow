/**
 * @fileoverview Supabase table operations for user profiles
 * @module supabase/tables/profiles
 */

import { supabase } from '@/lib/supabase/client';
import { Profile, ProfileUpdate } from '@/types/profiles';

/**
 * Fetches a user's profile
 * @param userId - User ID
 * @returns Promise<Profile | null> User profile data
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Updates a user's profile
 * @param userId - User ID
 * @param updates - Profile updates
 * @returns Promise<Profile> Updated profile data
 */
export const updateProfile = async (userId: string, updates: ProfileUpdate): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}; 