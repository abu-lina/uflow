/**
 * @fileoverview Supabase table operations for bookmarks
 * @module supabase/tables/bookmarks
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import type { PostgrestError } from '@supabase/supabase-js';

type Bookmark = Database['public']['Tables']['souks']['Row'];

/**
 * Fetches all bookmarks for a user
 * @param userId - User ID
 * @returns Promise<Bookmark[]> List of bookmarked souks
 */
export const getBookmarks = async (userId: string): Promise<Bookmark[]> => {
  const { data, error } = await supabase
    .from('souks')
    .select('*')
    .eq('bookmarks_id', userId);

  if (error) {
    throw error;
  }

  return data || [];
};

/**
 * Adds a souk to user's bookmarks
 * @param userId - User ID
 * @param soukId - Souk ID
 * @returns Promise<void>
 */
export const addBookmark = async (userId: string, soukId: string): Promise<void> => {
  const { error } = await supabase
    .from('souks')
    .update({ bookmarks_id: userId })
    .eq('id', soukId);

  if (error) {
    throw error;
  }
};

/**
 * Removes a souk from user's bookmarks
 * @param userId - User ID
 * @param soukId - Souk ID
 * @returns Promise<void>
 */
export const removeBookmark = async (userId: string, soukId: string): Promise<void> => {
  const { error } = await supabase
    .from('souks')
    .update({ bookmarks_id: null })
    .eq('id', soukId)
    .eq('bookmarks_id', userId);

  if (error) {
    throw error;
  }
};

/**
 * Checks if a souk is bookmarked by a user
 * @param soukId - Souk ID
 * @param userId - User ID
 * @returns Promise<boolean> Whether the souk is bookmarked
 */
export const isBookmarked = async (soukId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('souks')
    .select('bookmarks_id')
    .eq('id', soukId)
    .single();

  if (error) {
    throw error;
  }

  return data?.bookmarks_id === userId;
}; 