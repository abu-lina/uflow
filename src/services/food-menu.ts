import { supabase } from '@/lib/supabase/client';

export interface FoodMenuItemRaw {
  name_de: string;
  name_en: string | null;
  provider_count: number;
}

export interface ProviderMenuItemRow {
  id: string;
  provider_id: string;
  name_de: string;
  name_en: string | null;
  price_cents: number | null;
  is_available: boolean;
  sort_order: number | null;
}

export async function searchFoodMenuItems(
  searchQuery: string,
  limitCount = 10,
): Promise<FoodMenuItemRaw[]> {
  const { data, error } = await supabase.rpc('search_food_menu_items', {
    search_query: searchQuery,
    limit_count: limitCount,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as FoodMenuItemRaw[]) : [];
}

export async function getProviderMenu(
  providerId: string,
): Promise<ProviderMenuItemRow[]> {
  const { data, error } = await supabase
    .from('food_menu')
    .select('id, provider_id, name_de, name_en, price_cents, is_available, sort_order')
    .eq('provider_id', providerId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })
    .order('name_de', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
