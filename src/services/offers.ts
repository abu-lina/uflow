import { supabase } from '@/lib/supabase/client';
import type { Offer } from '@/types/offer';
import { searchByName } from './searchByName';

export interface FoodConcept {
  offer_id: string;
  name_de: string;
  name_en: string | null;
  provider_count: number;
}

export interface FoodCategory {
  category_id: string;
  name_de: string;
  name_en: string | null;
  description_de: string | null;
  description_en: string | null;
  category_images: string | null;
  provider_count: number;
}

export interface FoodMenuItem {
  name_de: string;
  name_en: string | null;
  provider_count: number;
}

export async function getOffers(limit?: number, offset?: number): Promise<Offer[]> {
  let query = supabase
    .from('offers')
    .select('*')
    .order('name_de', { ascending: true });

  // Add pagination if provided
  if (limit !== undefined) {
    query = query.limit(limit);
  }
  if (offset !== undefined) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get total count of offers (for pagination)
 */
export async function getOffersCount(): Promise<number> {
  const { count, error } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching offers count:', error);
    throw error;
  }

  return count ?? 0;
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('offer_id', id)
    .single();

  if (error) {
    console.error('Error fetching offer:', error);
    return null;
  }

  return data;
}

export async function searchOffers(query: string): Promise<Offer[]> {
  return searchByName<Offer>({
    query,
    rpcName: 'search_offers',
    tableName: 'offers',
    idField: 'offer_id',
  });
}

export async function searchFoodConcepts(params: {
  search_query: string;
  limit_count?: number;
}): Promise<FoodConcept[]> {
  const { search_query, limit_count = 10 } = params;

  const { data, error } = await supabase.rpc('search_food_concepts', {
    search_query,
    limit_count,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as FoodConcept[]) : [];
}

export async function searchFoodCategories(params: {
  search_query: string;
  limit_count?: number;
}): Promise<FoodCategory[]> {
  const { search_query, limit_count = 8 } = params;

  const { data, error } = await supabase.rpc('search_food_categories', {
    search_query,
    limit_count,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as FoodCategory[]) : [];
}

export async function searchFoodMenuItems(params: {
  search_query: string;
  limit_count?: number;
}): Promise<FoodMenuItem[]> {
  const { search_query, limit_count = 10 } = params;

  const { data, error } = await supabase.rpc('search_food_menu_items', {
    search_query,
    limit_count,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as FoodMenuItem[]) : [];
}
