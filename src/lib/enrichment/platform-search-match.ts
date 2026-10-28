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
const TOKEN_MATCH_THRESHOLD = 0.8;

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

type AddressState = 'match' | 'weak' | 'none' | 'mismatch';

/**
 * `match`: street and house number agree, or the venue only gives a zip and it agrees.
 * `weak`: the zip agrees but the provider has no street or house number to check the
 * venue's street against. A venue that states a street must match it; a shared zip alone
 * is not enough.
 */
function compareAddress(provider: SearchProvider, venue: SearchVenue): AddressState {
  const venueTokens = addressTokens([venue.address, venue.zip].filter(Boolean).join(' '));
  if (venueTokens.length === 0) return 'none';

  const cityTokens = new Set(addressTokens(venue.city ?? provider.city ?? ''));
  const venueStatesStreet = venueTokens.some((t) => !/^\d{5}$/.test(t) && !cityTokens.has(t));
  const zip = provider.zip?.trim();
  const zipMatches = !!zip && /^\d{5}$/.test(zip) && venueTokens.includes(zip);

  if (!venueStatesStreet) return zipMatches ? 'match' : 'mismatch';

  const providerTokens = addressTokens(provider.street ?? '');
  const providerNumber = parseHouseNumber(providerTokens[providerTokens.length - 1]);
  const nameTokens = providerNumber ? providerTokens.slice(0, -1) : providerTokens;
  const at = indexOfSequence(venueTokens, nameTokens);

  if (at >= 0 && providerNumber) {
    const venueNumber = parseHouseNumber(venueTokens[at + nameTokens.length]);
    if (venueNumber) return sameHouseNumber(providerNumber, venueNumber) ? 'match' : 'mismatch';
  }
  // Nothing to verify the venue's street against: a shared zip is only a weak signal.
  return zipMatches && (!providerNumber || nameTokens.length === 0) ? 'weak' : 'mismatch';
}

function sameCity(provider: SearchProvider, venue: SearchVenue): boolean {
  const expected = addressTokens(provider.city ?? '');
  if (expected.length === 0) return false;
  const venueCity = addressTokens(venue.city ?? '');
  if (venueCity.length > 0) return venueCity.join(' ') === expected.join(' ');
  return indexOfSequence(addressTokens(venue.address ?? ''), expected) >= 0;
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
 * The city must agree. A strong name needs a street or zip match, a venue without an
 * address stays ambiguous, and a similar name only ever reaches `ambiguous`.
 */
export function matchVenueToProvider(provider: SearchProvider, venue: SearchVenue): MatchVerdict {
  if (!normalizeName(provider.name) || !normalizeName(venue.name ?? '')) return 'no_match';
  if (!sameCity(provider, venue)) return 'no_match';

  const similarity = stringSimilarity(provider.name, venue.name);
  const strong = similarity >= NAME_MATCH_THRESHOLD;
  const near = similarity >= NAME_NEAR_THRESHOLD || namesAreRelated(provider.name, venue.name);
  if (!strong && !near) return 'no_match';

  const address = compareAddress(provider, venue);
  if (address === 'mismatch') return 'no_match';
  if (strong) return address === 'match' ? 'match' : 'ambiguous';
  return address === 'match' ? 'ambiguous' : 'no_match';
}
