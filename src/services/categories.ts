import { supabase } from '@/lib/supabase/client';

export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  slug?: string;
  description_de?: string;
  description_en?: string;
  category_images?: Record<string, unknown>; // JSONB for category images
  applicable_section: 'food' | 'store' | 'ummah' | 'all';
  category_type?: 'cuisine' | 'dish_type' | 'dietary' | 'meal' | 'store_type';
  created_at: string;
  updated_at: string;
}

export const PROVIDER_CATEGORY_SECTION_SCOPES = ['food', 'store', 'all'] as const;

// Fetch categories that are referenced by providers OR community services
export async function fetchUsedCategories(): Promise<Category[]> {
  // 1. Get all category_ids from providers
  const { data: providers, error: providersError } = await supabase
    .from('providers')
    .select('category_id')
    .eq('review_status', 'approved');
  if (providersError) {
    throw providersError;
  }

  // 2. Get all category_ids from ummah providers (M-5a: community_services dropped)
  const { data: communityServices, error: communityServicesError } = await supabase
    .from('providers')
    .select('category_id')
    .eq('listing_type', 'ummah')
    .eq('review_status', 'approved');
  if (communityServicesError) {
    throw communityServicesError;
  }

  // Combine and deduplicate category IDs
  const providerCategoryIds = Array.isArray(providers)
    ? providers.map((p: { category_id: string | null }) => p.category_id)
    : [];
  const communityServiceCategoryIds = Array.isArray(communityServices)
    ? communityServices.map((cs: { category_id: string | null }) => cs.category_id)
    : [];

  const allCategoryIds = [...providerCategoryIds, ...communityServiceCategoryIds];
  const uniqueCategoryIds = Array.from(
    new Set(
      allCategoryIds.filter(
        (id): id is string => typeof id === 'string' && id !== 'null' && id !== '',
      ),
    ),
  );

  // 3. Fetch categories by those IDs
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', uniqueCategoryIds)
    .returns<Category[]>();
  if (categoriesError) {
    throw categoriesError;
  }

  const categoryResults = Array.isArray(categories) ? categories : [];

  return categoryResults;
}

/**
 * Plan 090 M3: Fetch categories filtered by section.
 *
 * Resolves the D7 category-to-section mapping gap using strategy (b):
 * queries categories through their associated providers/community_services
 * filtered by listing_type (food/store) on providers.
 *
 * - 'food': categories used by approved providers with listing_type = 'food'
 * - 'ummah': categories used by approved providers with listing_type = 'ummah'
 * - 'store': categories used by approved providers with listing_type = 'store'
 */
export async function fetchCategoriesBySection(section: import('@/config/sectionFilters').Section): Promise<Category[]> {
  let categoryIds: string[];

  if (section === 'ummah') {
    // Ummah: categories from providers with listing_type='ummah' (M-5a: community_services dropped)
    const { data, error } = await supabase
      .from('providers')
      .select('category_id')
      .eq('listing_type', 'ummah')
      .eq('review_status', 'approved');

    if (error) throw error;

    const ids = Array.isArray(data)
      ? data.map((r: { category_id: string | null }) => r.category_id)
      : [];
    categoryIds = Array.from(
      new Set(ids.filter((id): id is string => typeof id === 'string' && id !== 'null' && id !== '')),
    );
  } else {
    // Food or Store: categories from providers filtered by listing_type
    const { data, error } = await supabase
      .from('providers')
      .select('category_id')
      .eq('listing_type', section === 'food' ? 'food' : 'store')
      .eq('review_status', 'approved');

    if (error) throw error;

    const ids = Array.isArray(data)
      ? data.map((r: { category_id: string | null }) => r.category_id)
      : [];
    categoryIds = Array.from(
      new Set(ids.filter((id): id is string => typeof id === 'string' && id !== 'null' && id !== '')),
    );
  }

  if (categoryIds.length === 0) return [];

  const applicableSectionScopes =
    section === 'store' ? ['store', 'all'] : [section, 'all'];

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', categoryIds)
    .in('applicable_section', applicableSectionScopes)
    .returns<Category[]>();

  if (categoriesError) throw categoriesError;

  return Array.isArray(categories) ? categories : [];
}

// Fetch categories that have content based on current search filters.
// Uses tsvector RPC search when a search query is provided (Plan 007:
// replaces previous ILIKE usage to comply with Postgres-first search rules).
export async function fetchFilteredCategories(
  selectedLocation?: string | null,
  searchQuery?: string | null,
): Promise<Category[]> {
  let uniqueCategoryIds: string[];

  const trimmedQuery = searchQuery?.trim() || '';

  if (trimmedQuery) {
    // Use RPC-based tsvector search — replaces previous ILIKE on provider_name
    // Treat empty string or falsy as "all locations" (no filter)
    const locationFilter = selectedLocation || null;

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_filtered_category_ids_by_search',
      {
        search_query: trimmedQuery,
        location_filter: locationFilter,
      },
    );

    if (rpcError) {
      throw rpcError;
    }

    uniqueCategoryIds = Array.isArray(rpcData)
      ? Array.from(new Set(
          rpcData
            .map((row: { category_id: string }) => row.category_id)
            .filter((id: string): id is string => typeof id === 'string' && id !== 'null' && id !== ''),
        ))
      : [];
  } else {
    // No search query — use direct query (no ILIKE needed)
    let req = supabase
      .from('providers')
      .select('category_id')
      .eq('review_status', 'approved');

    // Treat empty string or falsy as "all locations" (no filter)
    if (selectedLocation) {
      req = req.eq('address_city', selectedLocation);
    }

    const { data: providers, error: providersError } = await req;
    if (providersError) {
      throw providersError;
    }

    const allCategoryIds = Array.isArray(providers)
      ? providers.map((p: { category_id: string | null }) => p.category_id)
      : [];
    uniqueCategoryIds = Array.from(
      new Set(
        allCategoryIds.filter(
          (id): id is string => typeof id === 'string' && id !== 'null' && id !== '',
        ),
      ),
    );
  }

  if (uniqueCategoryIds.length === 0) {
    return [];
  }

  // Fetch categories by those IDs
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', uniqueCategoryIds)
    .returns<Category[]>();
  if (categoriesError) {
    throw categoriesError;
  }

  return Array.isArray(categories) ? categories : [];
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name_de', { ascending: true })
    .limit(200)
    .returns<Category[]>();
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('category_id', id)
    .single<Category>();
  if (error) {
    throw error;
  }
  return data ?? null;
}

// Fetch categories filtered by section (food, store/business, ummah)
export async function getCategoriesForSection(section: 'food' | 'store' | 'ummah'): Promise<Category[]> {
  const sectionScopes = section === 'store'
    ? ['store', 'all']
    : [section, 'all'];

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .in('applicable_section', sectionScopes)
    .order('name_de', { ascending: true })
    .returns<Category[]>();

  if (error) {
    console.error('Error fetching categories for section:', section, error);
    throw error;
  }

  return data || [];
}

// Fetch categories for provider creation. If listingType provided, scoped to that section; otherwise returns all provider-applicable categories (food + business + all).
export async function getProviderCategories(listingType?: 'food' | 'store'): Promise<Category[]> {
  if (listingType) {
    return getCategoriesForSection(listingType);
  }
  // Return all categories except ummah-only
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .in('applicable_section', [...PROVIDER_CATEGORY_SECTION_SCOPES])
    .order('name_de', { ascending: true })
    .returns<Category[]>();
  if (error) throw error;
  return data || [];
}

// Fetch categories for social project creation (ummah section)
export async function getSocialProjectCategories(): Promise<Category[]> {
  return getCategoriesForSection('ummah');
}

/**
 * Look up a category by its URL slug and optional section scope.
 */
export async function getCategoryBySlug(
  slug: string,
  section?: 'food' | 'store' | 'ummah',
): Promise<Category | null> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('slug', slug);

  if (section) {
    query = query.in('applicable_section', [section, 'all']);
  }

  const { data, error } = await query.maybeSingle<Category>();
  if (error) {
    console.error('[getCategoryBySlug] Error:', error);
    return null;
  }
  return data;
}
