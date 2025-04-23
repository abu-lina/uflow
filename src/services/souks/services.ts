import { createServerClient } from '@/lib/supabase-server';
import { 
  Souk, 
  SoukListItem, 
  Category, 
  SearchParams, 
  PaginationInfo,
  Offer 
} from '../types';

// Constants
const DEFAULT_PAGE_SIZE = 9;

// Helper Functions
function calculatePagination(
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  totalItems: number = 0
): PaginationInfo {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

// API Functions
export async function fetchSouks({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  category = 'all',
  query = '',
  sortBy = 'newest'
}: SearchParams = {}) {
  try {
    const supabase = createServerClient();
    const offset = (page - 1) * pageSize;

    // Base query with count
    let { data: souks, count, error } = await supabase
      .from('souks')
      .select(`
        *,
        profiles!souks_owner_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        views: views_count,
        bookmarks: bookmarks_count,
        offers: offers_count
      `, { count: 'exact' })
      .eq('status', 'published');

    if (error) throw error;

    // Apply filters
    if (category !== 'all') {
      souks = souks?.filter(souk => souk.category_id === category);
    }

    if (query) {
      souks = souks?.filter(souk => 
        souk.title.toLowerCase().includes(query.toLowerCase()) ||
        souk.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply sorting
    if (souks) {
      switch (sortBy) {
        case 'popular':
          souks.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'price_asc':
          souks.sort((a, b) => (a.min_price || 0) - (b.min_price || 0));
          break;
        case 'price_desc':
          souks.sort((a, b) => (b.min_price || 0) - (a.min_price || 0));
          break;
        case 'newest':
        default:
          souks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    }

    // Apply pagination
    const paginatedSouks = souks?.slice(offset, offset + pageSize);

    return {
      souks: paginatedSouks || [],
      pagination: calculatePagination(page, pageSize, count || 0)
    };
  } catch (error) {
    console.error('Error fetching souks:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch souks');
  }
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_en');

    if (error) throw error;
    return categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch categories');
  }
}

export async function fetchSoukById(soukId: string): Promise<Souk | null> {
  try {
    const { data: souk, error } = await supabase
      .from('souks')
      .select(`
        *,
        profiles!souks_owner_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        views: views_count,
        bookmarks: bookmarks_count,
        offers: offers_count
      `)
      .eq('souk_id', soukId)
      .single();

    if (error) throw error;
    if (!souk) return null;

    return souk;
  } catch (error) {
    console.error('Error fetching souk:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch souk');
  }
}

export async function fetchSoukOffers(soukId: string): Promise<Offer[]> {
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('souk_id', soukId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return offers || [];
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch offers');
  }
}

export async function fetchUserBookmarks(userId: string): Promise<string[]> {
  try {
    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('souk_id')
      .eq('user_id', userId);

    if (error) throw error;
    return bookmarks?.map(b => b.souk_id) || [];
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch bookmarks');
  }
}

export async function toggleBookmark(userId: string, soukId: string): Promise<boolean> {
  try {
    // Check if bookmark exists
    const { data: existing, error: checkError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('souk_id', soukId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existing) {
      // Remove bookmark
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('souk_id', soukId);

      if (deleteError) throw deleteError;
      return false;
    } else {
      // Add bookmark
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, souk_id: soukId });

      if (insertError) throw insertError;
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to toggle bookmark');
  }
} 