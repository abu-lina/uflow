import { normalizeName, stringSimilarity } from './delivery-platform/provider-matcher';

export interface SearchProvider {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
}

export interface SearchVenue {
  name: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
}

export type MatchVerdict = 'match' | 'ambiguous' | 'no_match';

export const NAME_MATCH_THRESHOLD = 0.85;
export const NAME_NEAR_THRESHOLD = 0.6;

function normalizeAddress(value: string): string {
  const folded = value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/stra(?:ss)?e\b/g, 'str')
    .replace(/[^a-z0-9äöü]+/g, ' ')
    .trim();
  return ` ${folded} `;
}

type AddressState = 'match' | 'none' | 'mismatch';

function compareAddress(provider: SearchProvider, venue: SearchVenue): AddressState {
  const venueAddress = [venue.address, venue.zip].filter(Boolean).join(' ').trim();
  if (!venueAddress) return 'none';
  const haystack = normalizeAddress(venueAddress);

  const street = provider.street ? normalizeAddress(provider.street) : '';
  if (street.trim() && haystack.includes(street)) return 'match';

  const zip = provider.zip?.trim();
  if (zip && /^\d{5}$/.test(zip) && haystack.includes(` ${zip} `)) return 'match';

  return 'mismatch';
}

function sameCity(provider: SearchProvider, venue: SearchVenue): boolean {
  const providerCity = provider.city?.trim();
  if (!providerCity) return false;
  const expected = normalizeAddress(providerCity);
  const venueCity = venue.city?.trim();
  if (venueCity) return normalizeAddress(venueCity) === expected;
  return !!venue.address && normalizeAddress(venue.address).includes(expected);
}

/**
 * Decides whether a platform search result is the provider's venue.
 * `match` is safe to write; `ambiguous` is staged for review; `no_match` is dropped.
 * The city must agree. A strong name needs a street or zip match, a venue without an
 * address stays ambiguous, and a similar name only ever reaches `ambiguous`.
 */
export function matchVenueToProvider(provider: SearchProvider, venue: SearchVenue): MatchVerdict {
  if (!normalizeName(provider.name) || !normalizeName(venue.name ?? '')) return 'no_match';
  if (!sameCity(provider, venue)) return 'no_match';

  const similarity = stringSimilarity(provider.name, venue.name);
  if (similarity < NAME_NEAR_THRESHOLD) return 'no_match';

  const address = compareAddress(provider, venue);
  if (address === 'mismatch') return 'no_match';
  if (similarity >= NAME_MATCH_THRESHOLD) return address === 'match' ? 'match' : 'ambiguous';
  return address === 'match' ? 'ambiguous' : 'no_match';
}
