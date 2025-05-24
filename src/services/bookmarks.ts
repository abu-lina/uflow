import { supabase } from '@/lib/supabase/client';

export interface Bookmark {
  id: string;
  bookmarkable_id: string;
  bookmarkable_type: string;
  user_id: string;
  created_at: string | null;
}

export async function getBookmarkForSouk(soukId: string, userId: string): Promise<Bookmark | null> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('bookmarkable_id', soukId)
    .eq('bookmarkable_type', 'souk')
    .eq('user_id', userId)
    .single<Bookmark>();
  if (error) {
    throw error;
  }
  return data ?? null;
}

export async function createBookmark(data: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> {
  const { data: inserted, error } = await supabase
    .from('bookmarks')
    .insert([data])
    .select()
    .single<Bookmark>();
  if (error) {
    throw error;
  }
  return inserted;
}

export async function deleteBookmark(id: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function toggleBookmarkForSouk(soukId: string, userId: string): Promise<boolean> {
  const existing = await getBookmarkForSouk(soukId, userId);
  if (existing) {
    await deleteBookmark(existing.id);
    return false;
  } else {
    await createBookmark({
      bookmarkable_id: soukId,
      bookmarkable_type: 'souk',
      user_id: userId,
    });
    return true;
  }
}
