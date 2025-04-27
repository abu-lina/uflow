/**
 * @fileoverview Supabase table operations for bookmarks
 * @module supabase/tables/bookmarks
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type Bookmark = Database['public']['Tables']['bookmarks']['Row'];

/**
 * Fetches all bookmarks for a user
 * @param userId - User ID
 * @returns Promise<Bookmark[]> List of bookmarked souks
 */
export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase.from('bookmarks').select('*').eq('user_id', userId);

  if (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }

  return data || [];
}

/**
 * Adds a souk to user's bookmarks
 * @param userId - User ID
 * @param soukId - Souk ID
 * @returns Promise<Bookmark | null>
 */
export async function addBookmark(userId: string, soukId: string): Promise<Bookmark | null> {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert([{ user_id: userId, souk_id: soukId }])
    .select()
    .single();

  if (error) {
    console.error('Error adding bookmark:', error);
    return null;
  }

  return data;
}

/**
 * Removes a souk from user's bookmarks
 * @param userId - User ID
 * @param soukId - Souk ID
 * @returns Promise<boolean>
 */
export async function removeBookmark(userId: string, soukId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('souk_id', soukId);

  if (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }

  return true;
}

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
