import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';

export async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('name_de', { ascending: true });

  if (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
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
