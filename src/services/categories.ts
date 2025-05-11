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
  const souksResponse = await supabase.from('souks').select('category_id');
  const souksError = souksResponse.error;
  if (souksError) {
    throw souksError;
  }

  // Only include valid, non-null, non-empty category_ids
  const allCategoryIds = Array.isArray(souksResponse.data)
    ? souksResponse.data.map((s: { category_id: string | null }) => s.category_id)
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

  // 2. Fetch categories by those IDs
  const categoriesResponse = await supabase
    .from('categories')
    .select('*')
    .in('category_id', uniqueCategoryIds);
  const categoriesError = categoriesResponse.error;
  if (categoriesError) {
    throw categoriesError;
  }

  return isCategoryArray(categoriesResponse.data) ? categoriesResponse.data : [];
}

export async function getCategories(): Promise<Category[]> {
  const response = await supabase.from('categories').select('*').order('name');
  return isCategoryArray(response.data) ? response.data : [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const response = await supabase.from('categories').select('*').eq('id', id).single();
  const error = response.error;

  if (error) {
    throw error;
  }
  return isCategory(response.data) ? response.data : null;
}

function isCategoryArray(arr: unknown): arr is Category[] {
  return (
    Array.isArray(arr) &&
    arr.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Category).category_id === 'string' &&
        typeof (item as Category).name_de === 'string',
    )
  );
}

function isCategory(obj: unknown): obj is Category {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Category).id === 'string' &&
    typeof (obj as Category).name === 'string'
    // Add more field checks as needed
  );
}
