import { normalizeName, stringSimilarity } from './delivery-platform/provider-matcher';

export interface SearchProvider {
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SearchVenue {
  name: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type MatchVerdict = 'match' | 'ambiguous' | 'no_match';

export const NAME_MATCH_THRESHOLD = 0.85;
export const NAME_NEAR_THRESHOLD = 0.6;
/** Wolt has no zip, so a venue this close to the provider's coordinates stands in for it. */
export const NEAR_METERS = 250;
const TOKEN_MATCH_THRESHOLD = 0.8;
const EARTH_RADIUS_METERS = 6_371_000;

function distanceMeters(provider: SearchProvider, venue: SearchVenue): number | null {
  const { latitude: lat1, longitude: lon1 } = provider;
  const { latitude: lat2, longitude: lon2 } = venue;
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    ![lat1, lon1, lat2, lon2].every(Number.isFinite)
  ) {
    return null;
  }
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

function addressTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/stra(?:ss)?e\b/g, 'str')
    .replace(/[^a-z0-9äöü]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

interface HouseNumber {
  digits: string;
  suffix: string;
}

function parseHouseNumber(token: string | undefined): HouseNumber | null {
  const m = token?.match(/^(\d{1,4})([a-z]?)$/);
  return m ? { digits: m[1], suffix: m[2] } : null;
}

function sameHouseNumber(a: HouseNumber, b: HouseNumber): boolean {
  // Platforms often drop the letter, so only two different letters count as a mismatch.
  return a.digits === b.digits && (!a.suffix || !b.suffix || a.suffix === b.suffix);
}

function indexOfSequence(haystack: string[], needle: string[]): number {
  if (needle.length === 0) return -1;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((t, j) => haystack[i + j] === t)) return i;
  }
  return -1;
}

type AddressState = 'match' | 'partial' | 'none' | 'mismatch';

/**
 * `match`: street, house number and zip all agree, or, for a venue without a zip (Wolt), street and
 * house number agree and the venue is within NEAR_METERS of the provider. Only this can be
 * written without review.
 * `partial`: nothing contradicts the provider but something could not be confirmed (no zip,
 * zip-only venue, or the provider has no house number to check against).
 * A venue that states a street must match it; a shared zip alone never settles that.
 */
function compareAddress(provider: SearchProvider, venue: SearchVenue): AddressState {
  const venueTokens = addressTokens([venue.address, venue.zip].filter(Boolean).join(' '));
  if (venueTokens.length === 0) return 'none';

  const cityTokens = new Set(addressTokens(venue.city ?? provider.city ?? ''));
  const venueStatesStreet = venueTokens.some((t) => !/^\d{5}$/.test(t) && !cityTokens.has(t));
  const zip = provider.zip?.trim();
  const zipMatches = !!zip && /^\d{5}$/.test(zip) && venueTokens.includes(zip);

  if (!venueStatesStreet) return zipMatches ? 'partial' : 'mismatch';

  const providerTokens = addressTokens(provider.street ?? '');
  const providerNumber = parseHouseNumber(providerTokens[providerTokens.length - 1]);
  const nameTokens = providerNumber ? providerTokens.slice(0, -1) : providerTokens;
  const at = indexOfSequence(venueTokens, nameTokens);

  if (at >= 0 && providerNumber) {
    const venueNumber = parseHouseNumber(venueTokens[at + nameTokens.length]);
    if (venueNumber) {
      if (!sameHouseNumber(providerNumber, venueNumber)) return 'mismatch';
      if (zipMatches) return 'match';
      // No zip on the venue (Wolt): the same street and number must also be the same place.
      const venueStatesZip = venueTokens.some((t) => /^\d{5}$/.test(t));
      const meters = venueStatesZip ? null : distanceMeters(provider, venue);
      if (meters !== null) return meters <= NEAR_METERS ? 'match' : 'mismatch';
      return 'partial';
    }
  }
  // Nothing to verify the venue's street against: a shared zip is only a weak signal.
  return zipMatches && (!providerNumber || nameTokens.length === 0) ? 'partial' : 'mismatch';
}

type CityState = 'same' | 'unknown' | 'different';

function compareCity(provider: SearchProvider, venue: SearchVenue): CityState {
  const expected = addressTokens(provider.city ?? '');
  if (expected.length === 0) return 'different';
  const venueCity = addressTokens(venue.city ?? '');
  if (venueCity.length === 0) return 'unknown';
  return venueCity.join(' ') === expected.join(' ') ? 'same' : 'different';
}

/** Every token of the shorter name has a close counterpart in the longer one. */
function namesAreRelated(a: string, b: string): boolean {
  const [short, long] = [normalizeName(a).split(' '), normalizeName(b).split(' ')].sort(
    (x, y) => x.length - y.length,
  );
  if (short.length < 2) return false;
  return short.every((t) => long.some((u) => stringSimilarity(t, u) >= TOKEN_MATCH_THRESHOLD));
}

/**
 * Decides whether a platform search result is the provider's venue.
 * `match` is safe to write; `ambiguous` is staged for review; `no_match` is dropped.
 * A venue city that is given must agree; an empty one is unknown, not a mismatch. Only Wolt's
 * empty city can still `match` (its coordinates settle the place); on any other platform an
 * unknown city caps the verdict at `ambiguous`.
 * `match` needs a strong name plus a `match` address; a
 * strong name with a weaker or missing address is `ambiguous`, and a similar name only ever
 * reaches `ambiguous` with a full address match.
 */
export function matchVenueToProvider(
  provider: SearchProvider,
  venue: SearchVenue,
  platform?: string,
): MatchVerdict {
  if (!normalizeName(provider.name) || !normalizeName(venue.name ?? '')) return 'no_match';
  const city = compareCity(provider, venue);
  if (city === 'different') return 'no_match';

  const similarity = stringSimilarity(provider.name, venue.name);
  const strong = similarity >= NAME_MATCH_THRESHOLD;
  const near = similarity >= NAME_NEAR_THRESHOLD || namesAreRelated(provider.name, venue.name);
  if (!strong && !near) return 'no_match';

  const address = compareAddress(provider, venue);
  if (address === 'mismatch') return 'no_match';
  if (strong)
    return address === 'match' && (city === 'same' || platform === 'wolt') ? 'match' : 'ambiguous';
  return address === 'match' ? 'ambiguous' : 'no_match';
}
