import { supabase } from '@/lib/supabase/client';

/**
 * Determines if a category should create community services instead of providers
 * Currently: "Gemeinschaft & Spenden" (Community & Donations) creates community services
 */
export async function shouldCreateCommunityService(categoryId: string): Promise<boolean> {
  // Hardcoded check for "Gemeinschaft & Spenden" category
  // In the future, this could be based on a database field like category_type
  const COMMUNITY_SERVICE_CATEGORY_ID = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
  
  return categoryId === COMMUNITY_SERVICE_CATEGORY_ID;
}

/**
 * Get the category name for display purposes
 */
export async function getCategoryName(categoryId: string): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .select('name_de, name_en')
    .eq('category_id', categoryId)
    .single();
    
  if (error || !data) {
    return 'Unknown Category';
  }
  
  return data.name_de || data.name_en || 'Unknown Category';
}
