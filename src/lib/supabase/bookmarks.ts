import { supabase } from '../supabase';

export interface Bookmark {
  bookmarks_id: string | null;
  souk_id: string;
  souk_name: string;
}

export async function fetchBookmarks(userId: string): Promise<Bookmark[]> {
  const { data: bookmarks, error } = await supabase
    .from('souks')
    .select(`
      bookmarks_id,
      souk_id,
      souk_name
    `)
    .not('bookmarks_id', 'is', null)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching bookmarks:', error);
    throw error;
  }

  return bookmarks || [];
}

export async function addBookmark(userId: string, soukId: string): Promise<void> {
  const { error } = await supabase
    .from('souks')
    .update({ bookmarks_id: userId })
    .eq('souk_id', soukId);

  if (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

export async function removeBookmark(userId: string, soukId: string): Promise<void> {
  const { error } = await supabase
    .from('souks')
    .update({ bookmarks_id: null })
    .eq('souk_id', soukId)
    .eq('bookmarks_id', userId);

  if (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
}

export async function isBookmarked(soukId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('souks')
    .select('bookmarks_id')
    .eq('souk_id', soukId)
    .single();

  if (error) {
    console.error('Error checking bookmark status:', error);
    throw error;
  }

  return data?.bookmarks_id === userId;
} 