import { supabase } from '@/lib/supabase/client';

export interface Bookmark {
  id: string;
  provider_id: string;
  user_id: string;
  created_at: string | null;

  // Backward-compatible derived fields for existing callers
  bookmarkable_id?: string;
  bookmarkable_type?: 'provider';
}

function withLegacyFields(bookmark: Bookmark): Bookmark {
  return {
    ...bookmark,
    bookmarkable_id: bookmark.provider_id,
    bookmarkable_type: 'provider',
  };
}

export async function getBookmarkForProvider(providerId: string, userId: string): Promise<Bookmark | null> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id, provider_id, user_id, created_at')
    .eq('provider_id', providerId)
    .eq('user_id', userId)
    .single<Bookmark>();
  if (error) {
    throw error;
  }
  return data ? withLegacyFields(data) : null;
}

export async function createBookmark(data: Omit<Bookmark, 'id' | 'created_at'>): Promise<Bookmark> {
  const { data: inserted, error } = await supabase
    .from('bookmarks')
    .insert([{ provider_id: data.bookmarkable_id ?? data.provider_id, user_id: data.user_id }])
    .select()
    .single<Bookmark>();
  if (error) {
    throw error;
  }
  return withLegacyFields(inserted);
}

export async function deleteBookmark(id: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function toggleBookmarkForProvider(providerId: string, userId: string): Promise<boolean> {
  const existing = await getBookmarkForProvider(providerId, userId);
  if (existing) {
    await deleteBookmark(existing.id);
    return false;
  } else {
    await createBookmark({
      provider_id: providerId,
      bookmarkable_id: providerId,
      bookmarkable_type: 'provider',
      user_id: userId,
    });
    return true;
  }
}

