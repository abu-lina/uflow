import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { searchProviders } from './search';
import type { PopularCity } from './types';
import type { Section } from '@/config/sectionFilters';

/**
 * Fetch all valid cities from the cities table
 * (includes cities that exist but may not have providers yet)
 */
export async function fetchAllValidCities(client?: SupabaseClient): Promise<string[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('cities')
      .select('city_name')
      .returns<{ city_name: string }[]>();

    if (error) {
      throw error;
    }

    return (data || []).map((c) => c.city_name).sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    console.error('Error fetching valid cities:', error);
    return [];
  }
}

/**
 * Check whether a city exists in the canonical cities table.
 * Uses an exact, case-insensitive match and returns a boolean only.
 */
export async function checkCityExists(cityName: string, client?: SupabaseClient): Promise<boolean> {
  const normalizedCity = cityName.trim();

  if (!normalizedCity) {
    return false;
  }

  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('cities')
      .select('city_name')
      .ilike('city_name', normalizedCity)
      .limit(1);

    if (error) {
      throw error;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking city existence:', error);
    return false;
  }
}

/**
 * Fetch cities that currently have providers (includes all listing_types: food, store, ummah).
 */
export async function fetchProviderCities(client?: SupabaseClient): Promise<string[]> {
  try {
    const supabase = getSupabaseClient(client);
    const { data, error } = await supabase
      .from('providers')
      .select('address_city')
      .returns<{ address_city: string | null }[]>();

    if (error) {
      throw error;
    }

    const allCities = data?.map((p) => p.address_city) ?? [];

    const uniqueCities = Array.from(
      new Set(
        allCities.filter((city): city is string => {
          return typeof city === 'string' && city.trim() !== '' && city !== 'null';
        }),
      ),
    );
    return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching cities: ${error.message}. ` +
          'This usually means:\n' +
          '1. Check your internet connection\n' +
          '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
          '3. Check if Supabase project is accessible\n' +
          '4. Restart your dev server after updating .env.local',
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}

/**
 * Fetch most popular cities by listing count across providers.
 * Optionally filter by section (listing_type).
 */
export async function fetchPopularCities(
  limit = 5,
  section?: Section,
  client?: SupabaseClient,
): Promise<PopularCity[]> {
  if (limit <= 0) {
    return [];
  }

  try {
    const supabase = getSupabaseClient(client);
    let query = supabase.from('providers').select('address_city');

    if (section) {
      query = query.eq('listing_type', section);
    }

    query = query.eq('review_status', 'approved');

    const { data, error } = await query.returns<{ address_city: string | null }[]>();

    if (error) {
      throw error;
    }

    const allCities = (data ?? [])
      .map((row) => row.address_city)
      .filter((city): city is string => {
        return typeof city === 'string' && city.trim() !== '' && city !== 'null';
      });

    const countByCity = new Map<string, number>();
    for (const city of allCities) {
      countByCity.set(city, (countByCity.get(city) ?? 0) + 1);
    }

    return Array.from(countByCity.entries())
      .map(([city, provider_count]) => ({ city, provider_count }))
      .sort((a, b) => {
        if (b.provider_count !== a.provider_count) {
          return b.provider_count - a.provider_count;
        }

        return a.city.localeCompare(b.city, 'de');
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular cities:', error);
    return [];
  }
}

// Fetch cities that have content based on current search filters.
// Uses providers-only full-text search path (searchProviders) when a search query is provided
// to avoid legacy dependencies on removed community_services artifacts.
export async function fetchFilteredCities(
  selectedCategory?: string | null,
  searchQuery?: string | null,
  client?: SupabaseClient,
): Promise<string[]> {
  try {
    const supabase = getSupabaseClient(client);
    const trimmedQuery = searchQuery?.trim() || '';

    if (trimmedQuery) {
      const normalizedCategory =
        selectedCategory && selectedCategory !== 'Alle' ? selectedCategory : '';

      const providers = await searchProviders(
        trimmedQuery,
        normalizedCategory,
        '',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        client,
      );

      const cities = Array.from(
        new Set(
          providers
            .map((provider) => provider.address_city)
            .filter(
              (city): city is string =>
                typeof city === 'string' && city.trim() !== '' && city !== 'null',
            ),
        ),
      );

      return cities.sort((a, b) => a.localeCompare(b, 'de'));
    }

    // No search query — use direct query on providers only
    let providersReq = supabase.from('providers').select('address_city');

    // Apply category filter if specified
    if (selectedCategory && selectedCategory !== 'Alle') {
      providersReq = providersReq.eq('category_id', selectedCategory);
    }

    const { data, error: providersError } =
      await providersReq.returns<{ address_city: string | null }[]>();

    if (providersError) {
      throw providersError;
    }

    const allCities = data?.map((p) => p.address_city) ?? [];

    const uniqueCities = Array.from(
      new Set(
        allCities.filter((city): city is string => {
          return typeof city === 'string' && city.trim() !== '' && city !== 'null';
        }),
      ),
    );
    return uniqueCities.sort((a, b) => a.localeCompare(b, 'de'));
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const enhancedError = new Error(
        `Network error fetching filtered cities: ${error.message}. ` +
          'This usually means:\n' +
          '1. Check your internet connection\n' +
          '2. Verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local\n' +
          '3. Check if Supabase project is accessible\n' +
          '4. Restart your dev server after updating .env.local',
      );
      enhancedError.cause = error;
      throw enhancedError;
    }
    throw error;
  }
}
