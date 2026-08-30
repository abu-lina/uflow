import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { logSupabaseError } from '@/utils/errorUtils';
import type { Provider, SearchResult } from './types';
import { transformProviderToSearchResult } from './types';

/**
 * Sorts search results by creation date (newest first)
 */
function sortByCreationDate(results: SearchResult[]): SearchResult[] {
  return results.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

// Get all bookmarked providers for a user
export async function getAllBookmarkedItems(
  userId: string,
  client?: SupabaseClient,
): Promise<SearchResult[]> {
  const supabase = getSupabaseClient(client);

  // Efficient single join query (absorbed from providers.server.ts)
  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select(
      'provider_id, providers(*, category:categories(name_de, name_en, category_images), locations(*))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('[getAllBookmarkedItems] Error:', error);
    throw error;
  }

  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const results: SearchResult[] = [];
  const orphanedIds: string[] = [];

  for (const bookmark of bookmarks) {
    if (bookmark.provider_id && bookmark.providers) {
      const provider = bookmark.providers as unknown as Provider;
      results.push(transformProviderToSearchResult(provider));
    } else if (bookmark.provider_id) {
      orphanedIds.push(bookmark.provider_id);
    }
  }

  // Clean up orphaned bookmarks in the background
  if (orphanedIds.length > 0) {
    void (async () => {
      try {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .in('provider_id', orphanedIds);
        if (deleteError) {
          console.error(
            '[getAllBookmarkedItems] Error cleaning up orphaned bookmarks:',
            deleteError,
          );
        }
      } catch (err) {
        console.error('[getAllBookmarkedItems] Exception cleaning bookmarks:', err);
      }
    })();
  }

  return sortByCreationDate(results);
}

// Fetch cities from bookmarked items (efficient: queries only address_city, not full provider data)
export async function fetchBookmarkedCities(
  userId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const supabase = getSupabaseClient(client);

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('providers(address_city)')
    .eq('user_id', userId);

  if (error) {
    logSupabaseError('Error fetching bookmarked cities:', error);
    throw error;
  }

  if (!bookmarks) return [];

  const cities = new Set<string>();
  for (const bookmark of bookmarks) {
    if (bookmark.providers) {
      const provider = bookmark.providers as unknown as Provider;
      if (provider.address_city) cities.add(provider.address_city);
    }
  }

  return Array.from(cities).sort((a, b) => a.localeCompare(b, 'de'));
}
