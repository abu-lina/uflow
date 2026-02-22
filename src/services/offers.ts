import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';

export async function getOffers(limit?: number, offset?: number): Promise<Offer[]> {
  let query = supabase
    .from('offers')
    .select('*')
    .order('name_de', { ascending: true });

  // Add pagination if provided
  if (limit !== undefined) {
    query = query.limit(limit);
  }
  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get total count of offers (for pagination)
 */
export async function getOffersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching offers count:', error);
    throw error;
  }

  return count ?? 0;
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('offer_id', id)
    .single();

  if (error) {
    console.error('Error fetching offer:', error);
    return null;
  }

  return data;
}

export async function searchOffers(query: string): Promise<Offer[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const trimmedQuery = query.trim();
  
  // Use Postgres full-text search with tsvector (much faster than ILIKE)
  // This leverages the GIN indexes for sub-millisecond searches
  try {
    const { data, error } = await supabase.rpc('search_offers', {
      search_query: trimmedQuery,
      limit_count: 100, // Autocomplete UX — 100 results is more than sufficient for dropdown/typeahead
      offset_count: 0,
    });

    // If no error and data exists, use the full-text search results
    if (!error && data) {
      // Map the function result back to Offer format
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((row) => ({
        offer_id: row.offer_id,
        name_de: row.name_de,
        name_en: row.name_en,
        category_id: row.category_id,
        created_by: row.created_by,
        created_at: row.created_at,
      })) as Offer[];
    }

    // If error, check if it's because function doesn't exist (code 42883 or message contains "does not exist")
    const isFunctionNotFound = 
      error?.code === '42883' || 
      error?.message?.includes('does not exist') ||
      error?.message?.includes('function') && error?.message?.includes('not found');

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
    .from('offers')
    .select('offer_id, name_de, name_en, category_id, created_by, created_at')
    .or(`name_de.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`)
    .order('name_de', { ascending: true })
    .limit(100); // Limit aligned with RPC limit_count (100) — sufficient for autocomplete UX
  
  if (fallbackError) {
    console.error('Error in fallback search:', fallbackError);
    throw fallbackError;
  }
  
  return Array.isArray(fallbackData) ? fallbackData : [];
}
