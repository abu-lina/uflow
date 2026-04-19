import { supabase } from '@/lib/supabase/client';

export interface Category {
  id: string;
  category_id: string;
  name_de: string;
  name_en?: string;
  description_de?: string;
  description_en?: string;
  category_images?: Record<string, unknown>; // JSONB for category images
  applicable_to?: string[]; // Array of entity types: 'provider', 'community_service'
  created_at: string;
  updated_at: string;
}

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

  // 2. Get all category_ids from community services
  const { data: communityServices, error: communityServicesError } = await supabase
    .from('community_services')
    .select('category_id')
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
 * filtered by listing_type (food/business) or the community_services table (ummah).
 *
 * - 'food': categories used by approved providers with listing_type = 'food'
 * - 'ummah': categories used by approved community_services
 * - 'business': categories used by approved providers with listing_type = 'business'
 */
export async function fetchCategoriesBySection(section: import('@/config/sectionFilters').Section): Promise<Category[]> {
  let categoryIds: string[];

  if (section === 'ummah') {
    // Ummah: categories from community_services table
    const { data, error } = await supabase
      .from('community_services')
      .select('category_id')
      .eq('review_status', 'approved');

    if (error) throw error;

    const ids = Array.isArray(data)
      ? data.map((r: { category_id: string | null }) => r.category_id)
      : [];
    categoryIds = Array.from(
      new Set(ids.filter((id): id is string => typeof id === 'string' && id !== 'null' && id !== '')),
    );
  } else {
    // Food or Business: categories from providers filtered by listing_type
    const { data, error } = await supabase
      .from('providers')
      .select('category_id')
      .eq('listing_type', section === 'food' ? 'food' : 'business')
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

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', categoryIds)
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
    .eq('id', id)
    .single<Category>();
  if (error) {
    throw error;
  }
  return data ?? null;
}

// Fetch categories filtered by entity type (provider or community_service)
export async function getCategoriesForEntity(entityType: 'provider' | 'community_service'): Promise<Category[]> {
  // First try to get categories that explicitly contain the entity type
  const { data: explicitData, error: explicitError } = await supabase
    .from('categories')
    .select('*')
    .contains('applicable_to', [entityType])
    .order('name_de', { ascending: true })
    .returns<Category[]>();
  
  if (explicitError) {
    console.error('Error fetching categories for entity:', entityType, explicitError);
    throw explicitError;
  }

  // Also get categories with null applicable_to (available for all entity types)
  const { data: nullData, error: nullError } = await supabase
    .from('categories')
    .select('*')
    .is('applicable_to', null)
    .order('name_de', { ascending: true })
    .returns<Category[]>();

  if (nullError) {
    console.error('Error fetching null applicable_to categories:', nullError);
    // Don't throw here, just log the error and continue with explicit data
  }

  // Combine and deduplicate results
  const allCategories = [...(explicitData || []), ...(nullData || [])];
  const uniqueCategories = allCategories.filter((category, index, self) => 
    index === self.findIndex(c => c.category_id === category.category_id)
  );

  return uniqueCategories;
}

// Fetch categories for provider creation
export async function getProviderCategories(): Promise<Category[]> {
  return getCategoriesForEntity('provider');
}

// Fetch categories for social project creation
export async function getSocialProjectCategories(): Promise<Category[]> {
  return getCategoriesForEntity('community_service');
}
