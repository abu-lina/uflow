import { supabase } from '@/lib/supabase/client';
import { slugify } from '@/lib/slugify';

/**
 * Reverse-lookup: given a URL slug like "muenchen", find the original
 * city name from the cities table.
 */
export async function findCityBySlug(slug: string): Promise<string | null> {
  const { data: cities } = await supabase
    .from('cities')
    .select('city_name')
    .limit(500);

  if (cities) {
    const match = cities.find(
      (c: { city_name: string }) => slugify(c.city_name) === slug,
    );
    if (match) return match.city_name;
  }

  // Fallback: check distinct provider cities
  const { data: providerCities } = await supabase
    .from('providers')
    .select('address_city')
    .eq('review_status', 'approved')
    .not('address_city', 'is', null);

  if (providerCities) {
    const seen = new Set<string>();
    for (const row of providerCities) {
      const city = (row as { address_city: string }).address_city;
      if (!seen.has(city)) {
        seen.add(city);
        if (slugify(city) === slug) return city;
      }
    }
  }

  return null;
}
