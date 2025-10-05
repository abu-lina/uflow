import { supabase } from '@/lib/supabase/client';

export interface Category {
  id?: string;
  category_id: string;
  name: string;
  name_de: string;
  name_en?: string;
  description?: string;
  applicable_to?: string[]; // Array of entity types: 'provider', 'community_service'
  created_at: string;
  updated_at: string;
}

// Fetch only categories that are referenced by at least one provider
export async function fetchUsedCategories(): Promise<Category[]> {
  // 1. Get all category_ids from providers
  const { data: providers, error: providersError } = await supabase.from('providers').select('category_id');
  if (providersError) {
    throw providersError;
  }

  // Only include valid, non-null, non-empty category_ids
  const allCategoryIds = Array.isArray(providers)
    ? providers.map((p: { category_id: string | null }) => p.category_id)
    : [];
  const uniqueCategoryIds = Array.from(
    new Set(
      allCategoryIds.filter(
        (id): id is string => typeof id === 'string' && id !== 'null' && id !== '',
      ),
    ),
  );

  // 2. Fetch categories by those IDs
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', uniqueCategoryIds)
    .returns<Category[]>();
  if (categoriesError) {
    throw categoriesError;
  }

  const categoryResults = Array.isArray(categories) ? categories : [];

  // 3. Check if there are any community services and add the Community Services category if needed
  const { data: communityServices, error: communityServiceError } = await supabase
    .from('community_services')
    .select('community_service_id')
    .limit(1);

  if (!communityServiceError && communityServices && communityServices.length > 0) {
    // Check if the Community Services category already exists in the results
    const communityServiceCategoryExists = categoryResults.some(
      (cat) => cat.category_id === '2335922b-76a9-4d79-b32a-b3f95941ba5c',
    );

    if (!communityServiceCategoryExists) {
      // Add the real Community Services category for community services
      const communityServiceCategory: Category = {
        category_id: '2335922b-76a9-4d79-b32a-b3f95941ba5c',
        name: 'Community Services',
        name_de: 'Community Services',
        name_en: 'Community Services',
        description: 'Community service projects',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      categoryResults.push(communityServiceCategory);
    }
  }

  return categoryResults;
}

// Fetch categories that have content based on current search filters
export async function fetchFilteredCategories(
  selectedLocation?: string | null,
  searchQuery?: string | null,
): Promise<Category[]> {
  let req = supabase.from('providers').select('category_id');

  // Apply location filter if specified
  if (selectedLocation && selectedLocation !== 'Überall') {
    req = req.eq('address_city', selectedLocation);
  }

  // Apply search query filter if specified
  if (searchQuery && searchQuery.trim()) {
    req = req.ilike('provider_name', `%${searchQuery.trim()}%`);
  }

  const { data: providers, error: providersError } = await req;
  if (providersError) {
    throw providersError;
  }

  // Only include valid, non-null, non-empty category_ids
  const allCategoryIds = Array.isArray(providers)
    ? providers.map((p: { category_id: string | null }) => p.category_id)
    : [];
  const uniqueCategoryIds = Array.from(
    new Set(
      allCategoryIds.filter(
        (id): id is string => typeof id === 'string' && id !== 'null' && id !== '',
      ),
    ),
  );

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
    .order('name')
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
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`applicable_to.is.null,applicable_to.cs.{${entityType}}`)
    .order('name')
    .returns<Category[]>();
  
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

// Fetch categories for provider creation
export async function getProviderCategories(): Promise<Category[]> {
  return getCategoriesForEntity('provider');
}

// Fetch categories for social project creation
export async function getSocialProjectCategories(): Promise<Category[]> {
  return getCategoriesForEntity('community_service');
}
