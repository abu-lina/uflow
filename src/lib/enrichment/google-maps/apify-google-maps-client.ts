/**
 * Apify Google Maps Scraper integration (compass/crawler-google-places, id nwua9Gu5YrADL7ZDj).
 *
 * Cost: about $0.017 per place on the Business plan, plus about $0.26 per 1,000 images.
 * One run per provider keeps failures isolated. All limits live in GOOGLE_MAPS_SETTINGS.
 * maxPlacesPerSearch is 1 so the hard cap of 100 providers per run is also a cap of 100 places.
 *
 * scrapeOrderOnline is a per-place paid add-on, so it is opt-in. The caller sets it only for an
 * applying run on a food provider that still misses a delivery platform (see screen-provider-google-maps).
 */

const APIFY_ACTOR_NAME = 'compass~crawler-google-places';
const APIFY_BASE = 'https://api.apify.com/v2';
const REQUEST_TIMEOUT_MS = 240_000;

export const GOOGLE_MAPS_SETTINGS = {
  maxReviews: 50,
  maxImages: 5,
  maxPlacesPerSearch: 1,
  // English keeps attribute keys ("Serves beer") and opening-hours text predictable.
  language: 'en',
  costPerPlaceUsd: 0.017,
  costPerImageUsd: 0.26 / 1000,
} as const;

export interface ApifyPlace {
  title?: string;
  description?: string | null;
  url?: string;
  categoryName?: string;
  categories?: string[];
  address?: string;
  postalCode?: string;
  location?: { lat: number; lng: number };
  website?: string | null;
  orderOnline?: {
    deliveries?: Array<{ name?: string; url?: string }>;
    pickUps?: Array<{ name?: string; orderUrl?: string }>;
  } | null;
  phone?: string | null;
  instagrams?: string[];
  openingHours?: Array<{ day: string; hours: string }>;
  imageUrls?: string[];
  reviews?: Array<{ text?: string | null; stars?: number | null }>;
  reviewsCount?: number;
  additionalInfo?: Record<string, Array<Record<string, boolean>>>;
}

export interface SearchableProvider {
  provider_name: string;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
}

export interface ActorOptions {
  /** Per-place paid add-on that returns the Maps "order online" links. Off unless asked for. */
  scrapeOrderOnline?: boolean;
}

/** `scrapeOrderOnline` is a per-place paid add-on; it stays off unless the caller opts in per provider. */
export function buildActorInput(
  provider: SearchableProvider,
  { scrapeOrderOnline = false }: ActorOptions = {},
) {
  const search = [
    provider.provider_name,
    provider.address_street,
    provider.address_zip,
    provider.address_city,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    searchStringsArray: [search],
    maxCrawledPlacesPerSearch: GOOGLE_MAPS_SETTINGS.maxPlacesPerSearch,
    language: GOOGLE_MAPS_SETTINGS.language,
    maxReviews: GOOGLE_MAPS_SETTINGS.maxReviews,
    maxImages: GOOGLE_MAPS_SETTINGS.maxImages,
    scrapeContacts: true,
    scrapeOrderOnline,
    scrapeImageAuthors: false,
    skipClosedPlaces: false,
  };
}

/** Run the actor for one provider and return its dataset items. Throws on HTTP errors and timeouts. */
export async function fetchGoogleMapsPlaces(
  provider: SearchableProvider,
  apiToken: string,
  options: ActorOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ApifyPlace[]> {
  const response = await fetchImpl(
    `${APIFY_BASE}/acts/${APIFY_ACTOR_NAME}/run-sync-get-dataset-items?format=json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(buildActorInput(provider, options)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Apify actor run failed: HTTP ${response.status} ${body.slice(0, 200)}`);
  }

  const items: unknown = await response.json();
  return Array.isArray(items) ? (items as ApifyPlace[]) : [];
}
