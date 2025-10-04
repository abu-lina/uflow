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
  
  // Try full-text search first (if available), then fallback to ILIKE
  const { data, error } = await supabase
    .from('needs')
    .select('*')
    .or(`name_de.ilike.%${trimmedQuery}%,name_en.ilike.%${trimmedQuery}%`)
    .order('name_de', { ascending: true });

  if (error) {
    console.error('Error searching needs:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}
