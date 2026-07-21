import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';
import { searchByName } from './searchByName';

export async function getNeeds(): Promise<Need[]> {
  const { data, error } = await supabase
    .from('needs')
    .select('need_id, name_de, name_en, category_id, created_by, created_at')
    .order('name_de', { ascending: true })
    .limit(500); // Safety cap for getNeeds() — prevents unbounded fetch; well above expected row count

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
  return searchByName<Need>({
    query,
    rpcName: 'search_needs',
    tableName: 'needs',
    idField: 'need_id',
  });
}
