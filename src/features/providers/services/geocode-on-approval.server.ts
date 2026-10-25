import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { geocodeAddress, hasEnoughAddress, type AddressFields } from '@/lib/geocoding/nominatim';
import { acquireNominatimSlot } from '@/lib/geocoding/nominatim.server';
import { logger } from '@/lib/logging/structuredLogger';

/**
 * Give a freshly approved provider map coordinates (#756). The map reads only
 * `locations` rows with latitude and longitude, so a provider without them is
 * list-only. Best effort: this never throws, because approval must not fail
 * on a geocoder problem.
 */

export type EnsureCoordinatesResult = 'has_coordinates' | 'geocoded' | 'no_address' | 'failed';

interface LocationRow extends AddressFields {
  location_id: string;
  is_primary: boolean | null;
  location_latitude: number | null;
  location_longitude: number | null;
}

const ADDRESS_COLUMNS = 'address_street, address_zip, address_city, address_country';

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

    const coords = await geocodeAddress(address, { beforeRequest: acquireNominatimSlot });
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
      if (error?.code === '23505') {
        // A primary row appeared since the read (create flow, admin edit):
        // fill its coordinates instead of failing, unless it already has them.
        const { error: raceError } = await admin
          .from('locations')
          .update({ location_latitude: coords.lat, location_longitude: coords.lon })
          .eq('provider_id', providerId)
          .eq('is_primary', true)
          .is('location_latitude', null);
        if (raceError) throw raceError;
      } else if (error) {
        throw error;
      }
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
