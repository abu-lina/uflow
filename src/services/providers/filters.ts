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
 * Fetch boolean filter attributes for approved providers, optionally scoped to
 * a section and/or city.
 *
 * Returns every known filter key together with a count of how many providers
 * match (i.e. have that boolean column set to `true`). The UI uses the count
 * to display badges and to gray-out filters with zero matches.
 */
export async function fetchAvailableFilters(
  section?: Section,
  city?: string,
  client?: SupabaseClient,
): Promise<{ key: FilterKey; count: number }[]> {
  try {
    const supabase = getSupabaseClient(client);

    // Build a single query that selects all boolean columns we care about,
    // filtered to approved providers in the section/city. Then count which
    // columns have true values.
    let query = supabase
      .from('providers')
      .select(
        'muslim_owned, makes_donations, economic_solidarity, has_parking, has_prayer_space, family_friendly, women_friendly, children_friendly',
      )
      .eq('review_status', 'approved');

    if (section) {
      query = query.eq('listing_type', section);
    }

    if (city) {
      query = query.ilike('address_city', city);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching available filters:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // For each filter key, count the number of rows where that column is true
    const result: { key: FilterKey; count: number }[] = [];
    for (const [key, column] of Object.entries(FILTER_KEY_TO_COLUMN)) {
      const count = data.filter((row: Record<string, unknown>) => row[column] === true).length;
      result.push({ key: key as FilterKey, count });
    }

    return result;
  } catch (error) {
    console.error('Error fetching available filters:', error);
    return [];
  }
}
