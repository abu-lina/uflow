import { supabase } from '@/lib/supabase/client';

export interface Souk {
  souk_id: string;
  souk_name: string;
  souk_description: string | null;
  souk_images: string | null;
  category_id: string | null;
  address_city: string | null;
  social_website: string | null;
  social_instagram: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_street: string | null;
  address_country: string | null;
  address_zip: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  barakah_effects: string[];
  category?: {
    name_de: string;
  };
  zakat_id?: string | null;
}

export async function getSouks(): Promise<Souk[]> {
  const { data, error } = await supabase
    .from('souks')
    .select('*, category:categories(name_de)')
    .order('created_at', { ascending: false })
    .returns<Souk[]>();

  if (error) {
    console.error('Error fetching souks:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function getSoukById(id: string): Promise<Souk | null> {
  const { data, error } = await supabase.from('souks').select('*').eq('souk_id', id).single<Souk>();
  if (error) throw error;
  return data ?? null;
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

  const { data, error } = await req.returns<Souk[]>();
  if (error) throw error;

  return Array.isArray(data) ? data : [];
}

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

// Fetch cities that have content based on current search filters
export async function fetchFilteredCities(
  selectedCategory?: string | null,
  searchQuery?: string | null,
): Promise<string[]> {
  let req = supabase.from('souks').select('address_city');

  // Apply category filter if specified
  if (selectedCategory && selectedCategory !== 'Alle') {
    req = req.eq('category_id', selectedCategory);
  }

  // Apply search query filter if specified
  if (searchQuery && searchQuery.trim()) {
    req = req.ilike('souk_name', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await req.returns<{ address_city: string | null }[]>();

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

  const { data: souks, error: souksError } = await supabase
    .from('souks')
    .select('*, category:categories(name_de)')
    .in('souk_id', soukIds)
    .returns<Souk[]>();

  if (souksError) {
    throw souksError;
  }
  return Array.isArray(souks) ? souks : [];
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
  return Array.isArray(souks) ? souks : [];
}
