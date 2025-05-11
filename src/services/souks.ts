import { supabase } from '@/lib/supabase/client';

export interface Souk {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

export async function getSouks(): Promise<Souk[]> {
  const response = await supabase.from('souks').select('*').order('name');
  return isSoukArray(response.data) ? response.data : [];
}

export async function getSoukById(id: string): Promise<Souk | null> {
  const response = await supabase.from('souks').select('*').eq('id', id).single();
  const error = response.error;

  if (error) {
    throw error;
  }
  return isSouk(response.data) ? response.data : null;
}

export async function searchSouks(
  query: string,
  category: string,
  location: string,
): Promise<Souk[]> {
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

  const response = await req;
  return isSoukArray(response.data) ? response.data : [];
}

function isSoukArray(arr: unknown): arr is Souk[] {
  return (
    Array.isArray(arr) &&
    arr.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Souk).id === 'string' &&
        typeof (item as Souk).name === 'string',
      // Add more field checks as needed
    )
  );
}

function isSouk(obj: unknown): obj is Souk {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Souk).id === 'string' &&
    typeof (obj as Souk).name === 'string'
    // Add more field checks as needed
  );
}
