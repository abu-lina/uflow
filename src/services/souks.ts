import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

export async function searchSouks(
  query: string,
  category: string,
  location: string
): Promise<Database['public']['Tables']['souks']['Row'][]> {
  let req = supabase.from('souks').select('*');

  if (query) {
    req = req.ilike('name', `%${query}%`);
  }
  if (category && category !== 'Alle') {
    req = req.eq('category', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('location', location);
  }

  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
} 