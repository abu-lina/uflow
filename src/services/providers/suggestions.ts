import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type { AdminSearchOptions } from './types';

export interface SearchSuggestion {
  label: string;
  type: 'provider' | 'menuItem' | 'cuisine';
}

/** Plan 266: scope for suggestions, mirroring the active results scope. */
export interface SearchSuggestionScope {
  /** Active section; omit to search all sections. */
  section?: 'food' | 'store' | 'ummah';
  /** Selected city; omit when "everywhere" is selected. */
  city?: string;
  /** Explicit admin review scope; omitted callers retain the approved-only DB default. */
  reviewStatusScope?: AdminSearchOptions['status'];
  client?: SupabaseClient;
}

/**
 * Fetch typeahead suggestions across providers, food menu items, and categories.
 *
 * Plan 266: suggestions are produced by the same DB matcher that produces the
 * results list (`search_providers_for_query`), so a suggestion can never be
 * offered for a scope that would return an empty result list. The
 * `review_status = 'approved'` restriction is enforced inside the RPC.
 */
export async function fetchSearchSuggestions(
  query: string,
  limit = 10,
  scope: SearchSuggestionScope = {},
): Promise<SearchSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = getSupabaseClient(scope.client);
  const { data, error } = await supabase.rpc('search_scoped_suggestions', {
    search_query: trimmed,
    section_filter: scope.section ?? null,
    city_filter: scope.city ?? null,
    result_limit: limit,
    ...(scope.reviewStatusScope ? { review_status_scope: scope.reviewStatusScope } : {}),
  });

  if (error) throw error;
  return (data ?? []) as SearchSuggestion[];
}
