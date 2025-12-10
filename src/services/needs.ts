import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';

export async function getNeeds(): Promise<Need[]> {
  const { data, error } = await supabase
    .from('needs')
    .select('*')
    .order('name_de', { ascending: true });

  if (error) {
    console.error('Error fetching needs:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function getNeedById(id: string): Promise<Need | null> {
  const { data, error } = await supabase
    .from('needs')
    .select('*')
    .eq('need_id', id)
    .single();

  if (error) {
    console.error('Error fetching need:', error);
    return null;
  }

  return data;
}

export async function searchNeeds(query: string): Promise<Need[]> {
  if (!query || query.trim() === '') {
    return [];
  }

  const trimmedQuery = query.trim();
  
  // Use Postgres full-text search with tsvector (much faster than ILIKE)
  // This leverages the GIN indexes for sub-millisecond searches
  try {
    const { data, error } = await supabase.rpc('search_needs', {
      search_query: trimmedQuery,
      limit_count: 100,
      offset_count: 0,
    });

    // If no error and data exists, use the full-text search results
    if (!error && data) {
      // Map the function result back to Need format
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((row) => ({
        need_id: row.need_id,
        name_de: row.name_de,
        name_en: row.name_en,
        category_id: row.category_id,
        created_by: row.created_by,
        created_at: row.created_at,
      })) as Need[];
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
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('needs')
    .select('*')
    .or(`name_de.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`)
    .order('name_de', { ascending: true });
  
  if (fallbackError) {
    console.error('Error in fallback search:', fallbackError);
    throw fallbackError;
  }
  
  return Array.isArray(fallbackData) ? fallbackData : [];
}
