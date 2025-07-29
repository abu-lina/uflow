import { supabase } from '@/lib/supabase/client';

export interface Category {
  id?: string;
  category_id?: string;
  name: string;
  name_de?: string;
  name_en?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Fetch only categories that are referenced by at least one souk
export async function fetchUsedCategories(): Promise<Category[]> {
  // 1. Get all category_ids from souks
  const { data: souks, error: souksError } = await supabase.from('souks').select('category_id');
  if (souksError) {
    throw souksError;
  }

  // Only include valid, non-null, non-empty category_ids
  const allCategoryIds = Array.isArray(souks)
    ? souks.map((s: { category_id: string | null }) => s.category_id)
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

  // 3. Check if there are any zakat projects and add the Spenden category if needed
  const { data: zakatProjects, error: zakatError } = await supabase
    .from('zakat_projects')
    .select('zakat_id')
    .limit(1);

  if (!zakatError && zakatProjects && zakatProjects.length > 0) {
    // Check if the Spenden category already exists in the results
    const spendenCategoryExists = categoryResults.some(
      (cat) => cat.category_id === '2335922b-76a9-4d79-b32a-b3f95941ba5c',
    );

    if (!spendenCategoryExists) {
      // Add the real Spenden category for zakat projects
      const spendenCategory: Category = {
        category_id: '2335922b-76a9-4d79-b32a-b3f95941ba5c',
        name: 'Spenden',
        name_de: 'Spenden-Projekte',
        name_en: 'Donations',
        description: 'Zakat and donation projects',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      categoryResults.push(spendenCategory);
    }
  }

  return categoryResults;
}

// Fetch categories that have content based on current search filters
export async function fetchFilteredCategories(
  selectedLocation?: string | null,
  searchQuery?: string | null,
): Promise<Category[]> {
  let req = supabase.from('souks').select('category_id');

  // Apply location filter if specified
  if (selectedLocation && selectedLocation !== 'Überall') {
    req = req.eq('address_city', selectedLocation);
  }

  // Apply search query filter if specified
  if (searchQuery && searchQuery.trim()) {
    req = req.ilike('souk_name', `%${searchQuery.trim()}%`);
  }

  const { data: souks, error: souksError } = await req;
  if (souksError) {
    throw souksError;
  }

  // Only include valid, non-null, non-empty category_ids
  const allCategoryIds = Array.isArray(souks)
    ? souks.map((s: { category_id: string | null }) => s.category_id)
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
