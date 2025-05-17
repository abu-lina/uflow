import { supabase } from '@/lib/supabase/client';

export interface Souk {
  souk_id: string;
  souk_name: string;
  souk_images: string[];
  category_id: string;
  address_street: string;
  address_zip: string;
  address_city: string;
  barakah_effects: string[];
  category?: {
    name_de: string;
  };
  souk_description?: string | null;
}

export async function getSouks(): Promise<Souk[]> {
  const response = await supabase
    .from('souks')
    .select(
      `
      *,
      category:categories(name_de)
    `,
    )
    .order('created_at', { ascending: false });

  const data: unknown = response.data;
  const error: unknown = response.error;

  if (error) {
    console.error('Error fetching souks:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return isSoukArray(data) ? data : [];
}

export async function getSoukById(id: string): Promise<Souk | null> {
  const response = await supabase
    .from('souks')
    .select(
      `
      *,
      category:categories(name_de)
    `,
    )
    .eq('id', id)
    .single();

  const data: unknown = response.data;
  const error: unknown = response.error;

  if (error) {
    console.error('Error fetching souk:', error);
    throw error;
  }

  if (typeof data === 'object' && data !== null && 'souk_id' in data && 'souk_name' in data) {
    return data as Souk;
  }
  return null;
}

export async function searchSouks(
  query: string,
  category: string,
  location: string,
): Promise<Souk[]> {
  let req = supabase.from('souks').select('*, category:categories(name_de)');

  if (query) {
    req = req.ilike('souk_name', `%${query}%`);
  }
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const response = await req;
  return isSoukArray(response.data) ? response.data : [];
}

function isSoukArray(arr: unknown): arr is Souk[] {
  return (
    Array.isArray(arr) &&
    arr.every((item) => {
      if (typeof item !== 'object' || item === null) {
        return false;
      }
      // Only check for required fields
      return (
        'souk_id' in item &&
        typeof (item as { souk_id: unknown }).souk_id === 'string' &&
        'souk_name' in item &&
        typeof (item as { souk_name: unknown }).souk_name === 'string'
      );
    })
  );
}

// Fetch unique cities from souks
export async function fetchSoukCities(): Promise<string[]> {
  const response = await supabase.from('souks').select('address_city');
  const error = response.error;
  if (error) {
    throw error;
  }
  const allCities = Array.isArray(response.data)
    ? response.data.map((s: { address_city: string | null }) => s.address_city)
    : [];
  const uniqueCities = Array.from(
    new Set(
      allCities.filter(
        (city): city is string => typeof city === 'string' && city.trim() !== '' && city !== 'null',
      ),
    ),
  );
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
}
