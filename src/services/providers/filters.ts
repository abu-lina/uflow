import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import type { Section } from '@/config/sectionFilters';

/**
 * Boolean filter columns on the providers table.
 * Each key is the URL-facing filter key; the value is the DB column name.
 */
const FILTER_KEY_TO_COLUMN = {
  muslim: 'muslim_owned',
  spenden: 'makes_donations',
  solidaritaet: 'economic_solidarity',
  parken: 'has_parking',
  gebet: 'has_prayer_space',
  familien: 'family_friendly',
  frauen: 'women_friendly',
  kinder: 'children_friendly',
} as const;

export type FilterKey = keyof typeof FILTER_KEY_TO_COLUMN;

/** All known filter keys. */
export const ALL_FILTER_KEYS = Object.keys(FILTER_KEY_TO_COLUMN) as FilterKey[];

/**
 * Fetch which boolean filter attributes actually have at least one approved
 * provider with that attribute set to true, scoped to the given section.
 *
 * Returns only the filter keys that have data, so the UI can hide empty ones.
 */
export async function fetchAvailableFilters(
  section?: Section,
  client?: SupabaseClient,
): Promise<FilterKey[]> {
  try {
    const supabase = getSupabaseClient(client);

    // Build a single query that selects all boolean columns we care about,
    // filtered to approved providers in the section. Then check which columns
    // have at least one true value.
    let query = supabase
      .from('providers')
      .select(
        'muslim_owned, makes_donations, economic_solidarity, has_parking, has_prayer_space, family_friendly, women_friendly, children_friendly',
      )
      .eq('review_status', 'approved');

    if (section) {
      query = query.eq('listing_type', section);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available filters:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // For each filter key, check if any row has that column set to true
    const available: FilterKey[] = [];
    for (const [key, column] of Object.entries(FILTER_KEY_TO_COLUMN)) {
      const hasTrue = data.some((row: Record<string, unknown>) => row[column] === true);
      if (hasTrue) {
        available.push(key as FilterKey);
      }
    }

    return available;
  } catch (error) {
    console.error('Error fetching available filters:', error);
    return [];
  }
}
