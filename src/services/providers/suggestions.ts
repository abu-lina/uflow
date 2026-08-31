import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

export interface SearchSuggestion {
  label: string;
  type: 'provider' | 'menuItem' | 'cuisine';
}

/**
 * Fetch typeahead suggestions across providers, food menu items, and categories.
 * Used by SearchBar for autocomplete.
 */
export async function fetchSearchSuggestions(
  query: string,
  limit = 10,
  client?: SupabaseClient,
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = getSupabaseClient(client);

  const [providerRes, menuRes, categoryRes] = await Promise.all([
    supabase
      .from('providers')
      .select('provider_name')
      .ilike('provider_name', `%${trimmed}%`)
      .limit(5),
    supabase.from('food_menu').select('name_de, name_en').ilike('name_de', `%${trimmed}%`).limit(5),
    supabase
      .from('categories')
      .select('name_de, name_en')
      .ilike('name_de', `%${trimmed}%`)
      .limit(5),
  ]);

  const providerNames: SearchSuggestion[] = (providerRes.data || [])
    .map((p) => ({ label: p.provider_name, type: 'provider' as const }))
    .filter((p) => p.label);

  const menuItems: SearchSuggestion[] = (menuRes.data || [])
    .map((m) => ({ label: m.name_de || m.name_en || '', type: 'menuItem' as const }))
    .filter((m) => m.label);

  const categories: SearchSuggestion[] = (categoryRes.data || [])
    .map((c) => ({ label: c.name_de || c.name_en || '', type: 'cuisine' as const }))
    .filter((c) => c.label);

  const combined = [...providerNames, ...menuItems, ...categories];

  // Deduplicate by label
  const seen = new Set<string>();
  const deduped = combined.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });

  return deduped.slice(0, limit);
}
