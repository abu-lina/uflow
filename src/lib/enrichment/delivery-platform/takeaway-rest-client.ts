/**
 * Lightweight REST API client for the Takeaway.com (cw-api) endpoint.
 *
 * Uses the undocumented but publicly accessible JSON API at
 * https://cw-api.takeaway.com/api/v33/ to list restaurants by coordinates.
 *
 * No Playwright dependency - pure fetch-based.
 *
 * Response shape is based on observed API output from multiple sources
 * (Apify takeaway-scraper, Thuisbezorgd-Scraper, network traffic analysis).
 * The parsing layer is isolated in `parseRestaurantsResponse` so it can be
 * adjusted if the upstream format drifts.
 */

// ── Public types ─────────────────────────────────────────────────────────────

export interface TakeawayRestaurant {
  id: string;
  slug: string;
  name: string;
  cuisines: string[];
  rating: number | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isOpen: boolean;
  deliveryFee: number | null;
  minimumOrder: number | null;
}

export interface TakeawayRestClientConfig {
  /** Minimum ms between consecutive HTTP requests. Default: 250 */
  requestDelayMs?: number;
  /** Max retry attempts on 429/5xx. Default: 3 */
  maxRetries?: number;
  /** HTTP User-Agent header. */
  userAgent?: string;
}

export interface TakeawayRestClient {
  searchRestaurants(lat: number, lon: number): Promise<TakeawayRestaurant[]>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'https://cw-api.takeaway.com/api/v33';

const DEFAULT_CONFIG: Required<TakeawayRestClientConfig> = {
  requestDelayMs: 250,
  maxRetries: 3,
  userAgent: 'UFlow-Discovery/1.0 (+https://ummahflow.com/discovery)',
};

// ── Raw API response types (isolated for easy adjustment) ────────────────────

/**
 * Shape of a single restaurant entry in the API response.
 *
 * The `/restaurants` endpoint returns a JSON object with a top-level
 * `restaurants` key whose value is an object keyed by restaurant ID.
 * Each value has the structure below (only the fields we use).
 *
 * Example:
 * ```json
 * {
 *   "restaurants": {
 *     "10015773": {
 *       "primarySlug": "burger-vision-schoenhauser-allee",
 *       "brand": { "name": "Burger Vision" },
 *       "cuisineTypes": ["Burgers", "100% Halal"],
 *       "rating": { "votes": 2822, "score": 4.3 },
 *       "location": { "lat": 52.529, "lng": 13.409, "streetAddress": "...", "city": "Berlin" },
 *       "shippingInfo": { "delivery": { "isOpenForOrder": true, "minOrderValue": 1000, "deliveryFeeDefault": 149 } },
 *       "supports": { "delivery": true }
 *     }
 *   }
 * }
 * ```
 */
interface RawRestaurantEntry {
  primarySlug?: string;
  brand?: { name?: string };
  cuisineTypes?: string[];
  rating?: { votes?: number; score?: number };
  location?: {
    lat?: number;
    lng?: number;
    streetAddress?: string;
    city?: string;
  };
  shippingInfo?: {
    delivery?: {
      isOpenForOrder?: boolean;
      minOrderValue?: number;
      deliveryFeeDefault?: number;
    };
  };
  supports?: { delivery?: boolean };
}

interface RawRestaurantsResponse {
  restaurants?: Record<string, RawRestaurantEntry>;
}

// ── Parsing (isolated for testability) ───────────────────────────────────────

/**
 * Parses the raw API JSON into our normalized `TakeawayRestaurant[]`.
 * Exported for unit testing.
 */
export function parseRestaurantsResponse(raw: unknown): TakeawayRestaurant[] {
  if (!raw || typeof raw !== 'object') return [];

  const body = raw as RawRestaurantsResponse;
  const restaurantsMap = body.restaurants;
  if (!restaurantsMap || typeof restaurantsMap !== 'object') return [];

  const results: TakeawayRestaurant[] = [];

  for (const [id, entry] of Object.entries(restaurantsMap)) {
    if (!entry || typeof entry !== 'object') continue;

    const name = entry.brand?.name ?? '';
    const slug = entry.primarySlug ?? '';
    if (!name && !slug) continue;

    const cuisines = Array.isArray(entry.cuisineTypes)
      ? entry.cuisineTypes.filter((c): c is string => typeof c === 'string')
      : [];

    const ratingScore = entry.rating?.score;
    const rating = typeof ratingScore === 'number' && !isNaN(ratingScore) ? ratingScore : null;

    const lat = entry.location?.lat ?? null;
    const lng = entry.location?.lng ?? null;
    const address = entry.location?.streetAddress ?? null;
    const city = entry.location?.city ?? null;

    const deliveryInfo = entry.shippingInfo?.delivery;
    const isOpen = deliveryInfo?.isOpenForOrder ?? false;

    // API returns cents (e.g. 149 = 1.49 EUR); convert to EUR
    const rawDeliveryFee = deliveryInfo?.deliveryFeeDefault;
    const deliveryFee = typeof rawDeliveryFee === 'number' ? rawDeliveryFee / 100 : null;

    const rawMinOrder = deliveryInfo?.minOrderValue;
    const minimumOrder = typeof rawMinOrder === 'number' ? rawMinOrder / 100 : null;

    results.push({
      id,
      slug,
      name,
      cuisines,
      rating,
      address,
      city,
      latitude: typeof lat === 'number' ? lat : null,
      longitude: typeof lng === 'number' ? lng : null,
      isOpen,
      deliveryFee,
      minimumOrder,
    });
  }

  return results;
}

// ── Client implementation ────────────────────────────────────────────────────

class TakeawayRestClientImpl implements TakeawayRestClient {
  private config: Required<TakeawayRestClientConfig>;
  private lastRequestTime = 0;

  constructor(config: Required<TakeawayRestClientConfig>) {
    this.config = config;
  }

  async searchRestaurants(lat: number, lon: number): Promise<TakeawayRestaurant[]> {
    await this.rateLimit();

    const url = `${API_BASE}/restaurants?lat=${lat}&lng=${lon}&limit=0&isAccurate=true`;
    const body = await this.fetchJson(url);
    return parseRestaurantsResponse(body);
  }

  private async fetchJson(url: string, attempt = 1): Promise<unknown> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          Accept: 'application/json',
          'Accept-Language': 'de,en;q=0.5',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt <= this.config.maxRetries
        ) {
          const backoff = attempt * 2000;
          console.warn(
            `  [takeaway-rest] HTTP ${response.status} for ${url} — retrying in ${backoff / 1000}s (attempt ${attempt}/${this.config.maxRetries})`
          );
          await sleep(backoff);
          return this.fetchJson(url, attempt + 1);
        }
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.json();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('HTTP ')) throw err;

      if (attempt <= this.config.maxRetries) {
        const backoff = attempt * 2000;
        console.warn(
          `  [takeaway-rest] Fetch error (${err instanceof Error ? err.message : String(err)}) — retrying in ${backoff / 1000}s (attempt ${attempt}/${this.config.maxRetries})`
        );
        await sleep(backoff);
        return this.fetchJson(url, attempt + 1);
      }

      throw err;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.config.requestDelayMs) {
      await sleep(this.config.requestDelayMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createTakeawayRestClient(
  config?: TakeawayRestClientConfig
): TakeawayRestClient {
  const merged: Required<TakeawayRestClientConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return new TakeawayRestClientImpl(merged);
}
