import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logging/structuredLogger';

/**
 * Give a freshly approved provider map coordinates (#756). The map reads only
 * `locations` rows with latitude and longitude, so a provider without them is
 * list-only. Best effort: this never throws, because approval must not fail
 * on a geocoder problem.
 */

export type EnsureCoordinatesResult = 'has_coordinates' | 'geocoded' | 'no_address' | 'failed';

interface AddressFields {
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
}

interface LocationRow extends AddressFields {
  location_id: string;
  is_primary: boolean | null;
  location_latitude: number | null;
  location_longitude: number | null;
}

const ADDRESS_COLUMNS = 'address_street, address_zip, address_city, address_country';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'UmmahFlow/1.0 (+https://ummahflow.com; geocode on approval)';
const TIMEOUT_MS = 5000;

function hasEnoughAddress(a: AddressFields): boolean {
  return Boolean((a.address_street?.trim() || a.address_zip?.trim()) && a.address_city?.trim());
}

async function geocodeAddress(a: AddressFields): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1' });
  if (a.address_street?.trim()) params.set('street', a.address_street.trim());
  if (a.address_city?.trim()) params.set('city', a.address_city.trim());
  if (a.address_zip?.trim()) params.set('postalcode', a.address_zip.trim());
  params.set('country', a.address_country?.trim() || 'Germany');

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(results) || results.length === 0) return null;
  const lat = Number.parseFloat(results[0].lat);
  const lon = Number.parseFloat(results[0].lon);
  const valid =
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return valid ? { lat, lon } : null;
}

export async function ensureProviderCoordinates(
  providerId: string,
): Promise<EnsureCoordinatesResult> {
  try {
    const admin = getSupabaseAdmin();

    const { data: locData, error: locError } = await admin
      .from('locations')
      .select(`location_id, is_primary, ${ADDRESS_COLUMNS}, location_latitude, location_longitude`)
      .eq('provider_id', providerId);
    if (locError) throw locError;
    const locations = (locData ?? []) as LocationRow[];

    if (locations.some((l) => l.location_latitude != null && l.location_longitude != null)) {
      return 'has_coordinates';
    }

    const target = locations.find((l) => l.is_primary) ?? locations[0];

    let address: AddressFields | null = target && hasEnoughAddress(target) ? target : null;
    if (!address) {
      const { data: provider, error: provError } = await admin
        .from('providers')
        .select(ADDRESS_COLUMNS)
        .eq('provider_id', providerId)
        .maybeSingle();
      if (provError) throw provError;
      address = (provider as AddressFields | null) ?? null;
    }

    if (!address || !hasEnoughAddress(address)) {
      logger.warn('geocode_on_approval_no_address', { providerId });
      return 'no_address';
    }

    const coords = await geocodeAddress(address);
    if (!coords) {
      logger.warn('geocode_on_approval_no_match', { providerId });
      return 'failed';
    }

    if (target) {
      const { error } = await admin
        .from('locations')
        .update({ location_latitude: coords.lat, location_longitude: coords.lon })
        .eq('location_id', target.location_id);
      if (error) throw error;
    } else {
      const { error } = await admin.from('locations').insert({
        provider_id: providerId,
        address_street: address.address_street,
        address_zip: address.address_zip,
        address_city: address.address_city,
        address_country: address.address_country,
        location_latitude: coords.lat,
        location_longitude: coords.lon,
        is_primary: true,
      });
      if (error) throw error;
    }
    return 'geocoded';
  } catch (error) {
    logger.warn('geocode_on_approval_failed', {
      providerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'failed';
  }
}
