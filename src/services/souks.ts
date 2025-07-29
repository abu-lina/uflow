import { supabase } from '@/lib/supabase/client';
import { searchZakat, type Zakat } from './zakat_projects';

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

// Combined search result type
export interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  images: string | null;
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
  type: 'souk' | 'zakat';
  originalSouk?: Souk;
  originalZakat?: Zakat;
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
  // Special handling for "Spenden" category - return zakat projects
  if (category === '2335922b-76a9-4d79-b32a-b3f95941ba5c') {
    const zakatProjects = await searchZakat(query, 'Alle', location);
    // Transform zakat projects to souk format for compatibility
    return zakatProjects.map((zakat) => ({
      souk_id: zakat.zakat_id,
      souk_name: zakat.zakat_name,
      souk_description: zakat.zakat_description,
      souk_images: zakat.zakat_images ? JSON.stringify(zakat.zakat_images) : null,
      category_id: zakat.category_id,
      address_city: zakat.address_city,
      social_website: zakat.social_website,
      social_instagram: zakat.social_instagram,
      contact_email: zakat.contact_email,
      contact_phone: zakat.contact_phone,
      address_street: zakat.address_street,
      address_country: zakat.address_country,
      address_zip: zakat.address_zip,
      location_latitude: zakat.location_latitude,
      location_longitude: zakat.location_longitude,
      created_at: zakat.created_at,
      updated_at: zakat.updated_at,
      barakah_effects: zakat.barakah_effects || [],
      category: { name_de: 'Spenden-Projekte' },
      zakat_id: zakat.zakat_id,
    }));
  }

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

export async function searchSouksAndZakat(
  query: string,
  category: string,
  location: string,
): Promise<SearchResult[]> {
  const souks = await searchSouks(query, category, location);
  const zakats = await searchZakat(query, category, location);

  // Transform souks to SearchResult format
  const soukResults: SearchResult[] = souks.map((souk) => ({
    id: souk.souk_id,
    name: souk.souk_name,
    description: souk.souk_description,
    images: souk.souk_images,
    category_id: souk.category_id,
    address_city: souk.address_city,
    social_website: souk.social_website,
    social_instagram: souk.social_instagram,
    contact_email: souk.contact_email,
    contact_phone: souk.contact_phone,
    address_street: souk.address_street,
    address_country: souk.address_country,
    address_zip: souk.address_zip,
    location_latitude: souk.location_latitude,
    location_longitude: souk.location_longitude,
    created_at: souk.created_at,
    updated_at: souk.updated_at,
    barakah_effects: souk.barakah_effects,
    category: souk.category,
    type: 'souk' as const,
    originalSouk: souk,
  }));

  // Transform zakat projects to SearchResult format
  const zakatResults: SearchResult[] = zakats.map((zakat) => ({
    id: zakat.zakat_id,
    name: zakat.zakat_name,
    description: zakat.zakat_description,
    images: zakat.zakat_images ? JSON.stringify(zakat.zakat_images) : null,
    category_id: zakat.category_id,
    address_city: zakat.address_city,
    social_website: zakat.social_website,
    social_instagram: zakat.social_instagram,
    contact_email: zakat.contact_email,
    contact_phone: zakat.contact_phone,
    address_street: zakat.address_street,
    address_country: zakat.address_country,
    address_zip: zakat.address_zip,
    location_latitude: zakat.location_latitude,
    location_longitude: zakat.location_longitude,
    created_at: zakat.created_at,
    updated_at: zakat.updated_at,
    barakah_effects: zakat.barakah_effects || [],
    type: 'zakat' as const,
    originalZakat: zakat,
  }));

  const combinedResults: SearchResult[] = [...soukResults, ...zakatResults];

  // Sort by creation date (newest first)
  combinedResults.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return combinedResults;
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
