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
  
  // Try full-text search first (if available), then fallback to ILIKE
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .or(`name_de.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`)
    .order('name_de', { ascending: true });

  if (error) {
    console.error('Error searching offers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
