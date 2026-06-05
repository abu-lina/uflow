import { createSupabaseServerClient } from '@/lib/supabase/server';
import CitySelectionClient from './CitySelectionClient';

interface CityData {
  id: string;
  city_name: string;
  country: string;
  is_unlocked: boolean;
  provider_count: number;
  interest_count: number;
}

/**
 * City Selection Page (Server Component)
 *
 * Fetches city data server-side and passes it to the client component for
 * interactive rendering. This eliminates the client fetch waterfall, making
 * city data available immediately on hydration.
 *
 * On RPC error, passes an empty array — the client component's React Query
 * background fetch will retry after staleTime and populate the data.
 */
export default async function CitySelectionPage() {
  let initialCities: CityData[] = [];

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_cities_with_counts');

    if (error) {
      console.error('[City Selection] RPC error:', error);
    } else {
      initialCities = (data as CityData[]) || [];
    }
  } catch (err) {
    console.error('[City Selection] Unexpected error:', err);
  }

  return <CitySelectionClient initialCities={initialCities} />;
}
