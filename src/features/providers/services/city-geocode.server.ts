import 'server-only';

/**
 * Server-side city resolution for the recommend path (#606 rework).
 *
 * The `cities` catalog is primary; this module is the fallback for towns the
 * catalog does not cover — nobody is blocked from recommending because their
 * town is not in our list. It wraps the same Nominatim endpoint the client
 * picker uses, under the usage policy (identifying User-Agent, max 1 req/s,
 * no bulk use: one lookup per submission, only after a catalog miss).
 *
 * The outcome is tri-state so the caller can distinguish the only
 * caller-visible failure — a lookup that ran and matched nothing — from an
 * outage, which must fail open rather than block submissions:
 *
 * - `resolved`    → the geocoder canonicalised the value; store that name.
 * - `no_match`    → the lookup ran and found nothing; reject CITY_NOT_SUPPORTED.
 * - `unavailable` → timeout, abort, network, non-OK (incl. 429 rate limit),
 *                   or an unparseable body. Pending human review is the
 *                   backstop, so the caller accepts the typed value.
 */

export type CityGeocodeOutcome =
  | { kind: 'resolved'; canonicalName: string }
  | { kind: 'no_match' }
  | { kind: 'unavailable' };

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
/** Short bound: a hung lookup must not stall a submission. */
const LOOKUP_TIMEOUT_MS = 4000;
/** Nominatim usage policy: max 1 request per second. */
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = 'UmmahFlow/1.0 (+https://ummahflow.com; recommend city check)';

interface NominatimCityResult {
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
  };
}

// Serialise requests through a promise chain and pace each one to the 1 req/s
// policy. No dependency: submissions are rare, the wait is bounded.
let lastRequestStartedAt = 0;
let requestChain: Promise<void> = Promise.resolve();

async function acquireRateLimitSlot(): Promise<void> {
  const previous = requestChain;
  let release!: () => void;
  requestChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = MIN_INTERVAL_MS - (Date.now() - lastRequestStartedAt);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestStartedAt = Date.now();
  release();
}

/**
 * Resolve a free-text city value to a canonical city name via Nominatim.
 * Never throws: any failure to reach or parse the service is `unavailable`,
 * never `no_match`.
 */
export async function lookupCanonicalCity(query: string): Promise<CityGeocodeOutcome> {
  const trimmed = query.trim();
  if (!trimmed) return { kind: 'no_match' };

  try {
    await acquireRateLimitSlot();
    const response = await fetch(
      `${NOMINATIM_URL}?` +
        `format=json&` +
        `q=${encodeURIComponent(trimmed)}&` +
        `addressdetails=1&` +
        `limit=5&` +
        `featuretype=settlement`,
      {
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'de,en',
        },
      },
    );

    // A non-OK response — 429 rate limit, 5xx — is an outage, not a miss.
    if (!response.ok) return { kind: 'unavailable' };

    const data = (await response.json()) as NominatimCityResult[];
    if (!Array.isArray(data)) return { kind: 'unavailable' };

    for (const result of data) {
      const canonical =
        result.address?.city ?? result.address?.town ?? result.address?.village ?? result.name;
      if (canonical && canonical.trim().length > 0) {
        return { kind: 'resolved', canonicalName: canonical.trim() };
      }
    }
    return { kind: 'no_match' };
  } catch {
    // Abort/timeout, DNS, connection refused, JSON parse — all outages.
    return { kind: 'unavailable' };
  }
}
