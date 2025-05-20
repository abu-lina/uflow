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
  contact_phone?: string | null;
  social_website?: string | null;
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
  const { data, error } = await supabase
    .from('souks')
    .select('address_city')
    .returns<{ address_city: string | null }[]>();

  if (error) {
    throw error;
  }

  const allCities = data?.map((s) => s.address_city) ?? [];
  const uniqueCities = Array.from(
    new Set(
      allCities.filter((city): city is string => {
        return typeof city === 'string' && city.trim() !== '' && city !== 'null';
      }),
    ),
  );
  return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
}

/**
 * Fetch all souks bookmarked by a user
 */
export async function getBookmarkedSouks(userId: string): Promise<Souk[]> {
  // Get all bookmarkable_ids for souks bookmarked by this user
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('user_id', userId)
    .eq('bookmarkable_type', 'souk')
    .returns<{ bookmarkable_id: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const soukIds = bookmarks.map((b) => b.bookmarkable_id);

  // Fetch all souks with those IDs
  const { data: souks, error: souksError } = await supabase
    .from('souks')
    .select('*, category:categories(name_de)')
    .in('souk_id', soukIds)
    .returns<Souk[]>();

  if (souksError) {
    throw souksError;
  }
  if (!souks) {
    return [];
  }
  return souks;
}

/**
 * Fetch all souks created by a user
 */
export async function getCreatedSouks(userId: string): Promise<Souk[]> {
  const { data: souks, error } = await supabase
    .from('souks')
    .select('*, category:categories(name_de)')
    .eq('souk_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Souk[]>();

  if (error) {
    throw error;
  }
  if (!souks) {
    return [];
  }
  return souks;
}
