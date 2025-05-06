import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

// Fetch only categories that are referenced by at least one souk
export async function fetchUsedCategories(): Promise<
  Database['public']['Tables']['categories']['Row'][]
> {
  // 1. Get all category_ids from souks
  const { data: souks, error: souksError } = await supabase.from('souks').select('category_id');

  if (souksError) {
    throw souksError;
  }

  // Only include valid UUIDs, not 'null', not empty, and must be a string
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const allCategoryIds = (souks ?? []).map((s) => s.category_id);
  // Optional: log for debugging
  // console.log('category_ids:', allCategoryIds);
  const uniqueCategoryIds = Array.from(
    new Set(
      allCategoryIds.filter(
        (id): id is string =>
          typeof id === 'string' && id !== 'null' && id !== '' && uuidRegex.test(id),
      ),
    ),
  );

  if (uniqueCategoryIds.length === 0) {
    return [];
  }

  // 2. Fetch categories by those IDs
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .in('category_id', uniqueCategoryIds);

  if (categoriesError) {
    throw categoriesError;
  }

  return categories ?? [];
}
