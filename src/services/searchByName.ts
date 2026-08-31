import { supabase } from '@/lib/supabase/client';

type SearchRpcName = 'search_offers' | 'search_needs';
type SearchTableName = 'offers' | 'needs';

interface SearchByNameOptions {
  query: string;
  rpcName: SearchRpcName;
  tableName: SearchTableName;
  idField: string;
}

/**
 * Shared full-text search for name-indexed catalog entities (offers, needs).
 *
 * Uses Postgres tsvector RPC (via GIN indexes) for fast search, with an ILIKE
 * fallback for environments where the RPC function is not yet available
 * (e.g. during migration). Callers wrap this with entity-specific signatures.
 */
export async function searchByName<T>({
  query,
  rpcName,
  tableName,
  idField,
}: SearchByNameOptions): Promise<T[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const trimmedQuery = query.trim();

  // Use Postgres full-text search with tsvector (much faster than ILIKE)
  // This leverages the GIN indexes for sub-millisecond searches
  try {
    const { data, error } = await supabase.rpc(rpcName, {
      search_query: trimmedQuery,
      limit_count: 100, // Autocomplete UX — 100 results is more than sufficient for dropdown/typeahead
      offset_count: 0,
    });

    // If no error and data exists, use the full-text search results
    if (!error && data) {
      if (!Array.isArray(data)) {
        return [];
      }

      return (data as Array<Record<string, unknown>>).map((row) => ({
        [idField]: row[idField],
        name_de: row.name_de,
        name_en: row.name_en,
        category_id: row.category_id,
        created_by: row.created_by,
        created_at: row.created_at,
      })) as T[];
    }

    // If error, check if it's because function doesn't exist (code 42883 or message contains "does not exist")
    const isFunctionNotFound =
      error?.code === '42883' ||
      error?.message?.includes('does not exist') ||
      (error?.message?.includes('function') && error?.message?.includes('not found'));

    if (isFunctionNotFound) {
      // Silently fallback - this is expected during migration
      console.debug('Full-text search function not available, using ILIKE fallback');
    } else if (error) {
      // Log other errors but still fallback
      console.warn('Error using full-text search, falling back to ILIKE:', error);
    }
  } catch (err) {
    // Catch any exceptions (e.g., function doesn't exist)
    console.debug('Full-text search not available, using ILIKE fallback:', err);
  }

  // Fallback to ILIKE if function doesn't exist yet (during migration) or on any error
  // Uses explicit columns (not select('*')) and limit to bound payload size
  const { data: fallbackData, error: fallbackError } = await supabase
    .from(tableName)
    .select(`${idField}, name_de, name_en, category_id, created_by, created_at`)
    .or(`name_de.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`)
    .order('name_de', { ascending: true })
    .limit(100); // Limit aligned with RPC limit_count (100) — sufficient for autocomplete UX

  if (fallbackError) {
    console.error('Error in fallback search:', fallbackError);
    throw fallbackError;
  }

  return Array.isArray(fallbackData) ? (fallbackData as T[]) : [];
}
