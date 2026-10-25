/**
 * Shared Nominatim address geocoding (#756). Pure and importable from scripts
 * as well as server code. Pacing to the 1 req/s usage policy is the caller's
 * job: `beforeRequest` hook, or the serialised slot in `nominatim.server.ts`.
 */

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_USER_AGENT = 'UmmahFlow/1.0 (+https://ummahflow.com; support@ummahflow.com)';

export interface AddressFields {
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
}

export class GeocodeHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Geocoder HTTP ${status}`);
  }
}

export function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  );
}

/** Geocodable only with (street or zip) and city. */
export function hasEnoughAddress(a: AddressFields): boolean {
  return Boolean((a.address_street?.trim() || a.address_zip?.trim()) && a.address_city?.trim());
}

export function buildAddressParams(a: AddressFields): URLSearchParams {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1' });
  if (a.address_street?.trim()) params.set('street', a.address_street.trim());
  if (a.address_city?.trim()) params.set('city', a.address_city.trim());
  if (a.address_zip?.trim()) params.set('postalcode', a.address_zip.trim());
  params.set('country', a.address_country?.trim() || 'Germany');
  return params;
}

export async function geocodeAddress(
  a: AddressFields,
  opts: { beforeRequest?: () => Promise<void>; timeoutMs?: number } = {},
): Promise<{ lat: number; lon: number } | null> {
  await opts.beforeRequest?.();
  const res = await fetch(`${NOMINATIM_URL}?${buildAddressParams(a).toString()}`, {
    signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    headers: { 'User-Agent': NOMINATIM_USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new GeocodeHttpError(res.status);

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!Array.isArray(results) || results.length === 0) return null;
  const lat = Number.parseFloat(results[0].lat);
  const lon = Number.parseFloat(results[0].lon);
  return isValidCoord(lat, lon) ? { lat, lon } : null;
}

/** The primary `locations` row written when a provider has none (#756). */
export function buildPrimaryLocationRow(
  providerId: string,
  a: AddressFields,
  coords: { lat: number; lon: number },
) {
  return {
    provider_id: providerId,
    address_street: a.address_street,
    address_zip: a.address_zip,
    address_city: a.address_city,
    address_country: a.address_country,
    location_latitude: coords.lat,
    location_longitude: coords.lon,
    is_primary: true,
  };
}
