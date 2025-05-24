import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

export interface Zakat {
  zakat_id: string;
  zakat_name: string;
  zakat_description: string | null;
  zakat_logo: Json | null;
  is_verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  zakat_view_count: number | null;
  donation_count: number | null;
  category_id: string | null;
  updated_at: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_instagram: string | null;
  social_website: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  review_status: string | null;
  review_feedback: string | null;
  zakat_images: string[] | null;
  barakah_effects: string[] | null;
  souk_id: string;
  created_at: string | null;
}

export interface ZakatData {
  zakat_id: string;
  zakat_name: string;
  zakat_description: string;
  zakat_images: string[];
}

export async function getZakat(): Promise<Zakat[]> {
  const { data, error } = await supabase
    .from('zakat_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Zakat[]>();

  if (error) {
    console.error('Error fetching zakat:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export async function getZakatById(id: string): Promise<Zakat | null> {
  const { data, error } = await supabase
    .from('zakat_projects')
    .select('*')
    .eq('zakat_id', id)
    .single<Zakat>();

  if (error) {
    console.error('Error fetching zakat:', error);
    throw error;
  }

  return data ?? null;
}

export async function searchZakat(
  query: string,
  category: string,
  location: string,
): Promise<Zakat[]> {
  let req = supabase.from('zakat_projects').select('*');

  if (query) {
    req = req.ilike('zakat_name', `%${query}%`);
  }
  if (category && category !== 'Alle') {
    req = req.eq('category_id', category);
  }
  if (location && location !== 'Überall') {
    req = req.eq('address_city', location);
  }

  const { data, error } = await req.returns<Zakat[]>();
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchZakatCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('zakat_projects')
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

export async function getBookmarkedZakat(userId: string): Promise<Zakat[]> {
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('bookmarkable_id')
    .eq('user_id', userId)
    .eq('bookmarkable_type', 'zakat')
    .returns<{ bookmarkable_id: string }[]>();

  if (bookmarksError) {
    throw bookmarksError;
  }
  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const zakatIds = bookmarks.map((b) => b.bookmarkable_id);

  const { data: zakat, error: zakatError } = await supabase
    .from('zakat_projects')
    .select('*')
    .in('zakat_id', zakatIds)
    .returns<Zakat[]>();

  if (zakatError) {
    throw zakatError;
  }
  return Array.isArray(zakat) ? zakat : [];
}

export async function getCreatedZakat(userId: string): Promise<Zakat[]> {
  const { data: zakat, error } = await supabase
    .from('zakat_projects')
    .select('*')
    .eq('zakat_owner_id', userId)
    .order('created_at', { ascending: false })
    .returns<Zakat[]>();

  if (error) {
    throw error;
  }
  return Array.isArray(zakat) ? zakat : [];
}

export async function getZakatBySoukId(soukId: string): Promise<Zakat | null> {
  const { data, error } = await supabase
    .from('zakat_projects')
    .select('*')
    .eq('souk_id', soukId)
    .maybeSingle<Zakat>();

  if (error) {
    console.error('Supabase error:', error);
    return null;
  }

  return data ?? null;
}

export async function getZakatProjectsForSouk(soukId: string): Promise<ZakatData[]> {
  const { data, error } = await supabase
    .from('souk_zakat_projects')
    .select('zakat_id')
    .eq('souk_id', soukId)
    .returns<{ zakat_id: string }[]>();
  if (error) throw error;
  const zakatIds = data.map((item) => item.zakat_id);
  if (zakatIds.length === 0) return [];
  const { data: zakatData, error: zakatError } = await supabase
    .from('zakat_projects')
    .select('zakat_id, zakat_name, zakat_description, zakat_images')
    .in('zakat_id', zakatIds)
    .returns<ZakatData[]>();
  if (zakatError) throw zakatError;
  return zakatData;
}
