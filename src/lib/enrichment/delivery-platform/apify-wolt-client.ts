import type { OpeningHours } from '@/types/openingHours';

/**
 * Apify Wolt Restaurant & Menu Scraper integration.
 *
 * Uses the teodor_banea/wolt-restaurant-menu-scraper actor which talks
 * to Wolt's JSON API directly (no browser). This is more reliable than
 * browser-based scrapers because Wolt's anti-bot measures don't apply.
 *
 * Actor: teodor_banea/wolt-restaurant-menu-scraper
 * Cost: ~$0.001 per result (menu item) + $0.01 actor start
 * Input: venueUrls mode with Wolt venue page URLs
 * Output: flat menu-item rows with embedded venue metadata
 */

const APIFY_ACTOR_NAME = 'teodor_banea~wolt-restaurant-menu-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Menu-item row returned by the teodor_banea actor (venueUrls mode). */
interface ApifyMenuItem {
  venueId: string;
  venueSlug: string;
  venueName: string;
  url: string;
  venueCity: string;
  venueCountry: string;
  venueAddress: string | null;
  venueRating: number | null;
  searchQuery: string | null;
  itemId: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  price: number | null;
  originalPrice: number | null;
  lowestPrice: number | null;
  isDiscounted: boolean;
  currency: string;
  vatPercentage: number | null;
  unitInfo: string | null;
  unitPrice: number | null;
  dietaryPreferences: string[];
  isWoltPlusOnly: boolean;
  optionGroupCount: number;
  language: string;
  isAutotranslated: boolean;
  scrapedAt: string;
  runId: string;
}

/** Normalized result returned to the caller. */
export interface ApifyWoltResult {
  name: string;
  slug: string;
  url: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  postCode: string | null;
  city: string | null;
  menuItems: Array<{
    name_de: string;
    description_de: string | null;
    category: string | null;
    price_cents: number | null;
    is_available: boolean;
    sort_order: number;
  }>;
  /** Opening hours normalized to our internal format. */
  openingHours: OpeningHours | null;
}

// ---------------------------------------------------------------------------
// Apify API calls
// ---------------------------------------------------------------------------

/**
 * Run the Apify Wolt actor with a venue URL and wait for completion.
 * Returns the default dataset ID on success, or throws on failure.
 */
async function runActor(venueUrl: string, apiToken: string): Promise<string> {
  const url = `${APIFY_BASE}/acts/${APIFY_ACTOR_NAME}/runs?token=${apiToken}&waitForFinish=120`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'venueUrls',
      venueUrls: [{ url: venueUrl }],
      language: 'de',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Apify actor run failed: HTTP ${response.status} ${body}`);
  }

  const data: Record<string, unknown> = await response.json();
  const runData = data?.data as Record<string, unknown> | undefined;
  const status = runData?.status as string | undefined;
  const datasetId = runData?.defaultDatasetId as string | undefined;

  if (status !== 'SUCCEEDED') {
    const statusMessage = (runData?.statusMessage as string) ?? 'unknown error';
    throw new Error(`Apify actor run ${status}: ${statusMessage}`);
  }

  if (!datasetId) {
    throw new Error('Apify actor run succeeded but no dataset ID returned');
  }

  return datasetId;
}

/**
 * Fetch items from an Apify dataset.
 */
async function getDatasetItems<T>(datasetId: string, apiToken: string): Promise<T[]> {
  const url = `${APIFY_BASE}/datasets/${datasetId}/items?format=json&token=${apiToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Apify dataset fetch failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<T[]>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch restaurant data from Wolt via the Apify scraper.
 *
 * @param restaurantUrl - Full Wolt venue URL (e.g., https://wolt.com/de/deu/berlin/venue/slug)
 * @param apiToken - Apify API token (APIFY_API_TOKEN)
 * @returns Normalized restaurant data, or null if the venue wasn't found.
 */
export async function fetchWoltRestaurant(
  restaurantUrl: string,
  apiToken: string,
): Promise<ApifyWoltResult | null> {
  const datasetId = await runActor(restaurantUrl, apiToken);
  const items = await getDatasetItems<ApifyMenuItem>(datasetId, apiToken);

  // Empty dataset = venue not found or no menu
  if (!items || items.length === 0) return null;

  // Extract venue metadata from the first menu item
  const first = items[0];

  // Normalize menu items: price from major units (euros) to cents
  const menuItems = items.map((item, i) => ({
    name_de: item.name,
    description_de: item.description ?? null,
    category: item.categoryName ?? null,
    price_cents: item.price != null ? Math.round(item.price * 100) : null,
    is_available: true,
    sort_order: i,
  }));

  return {
    name: first.venueName ?? '',
    slug: first.venueSlug ?? '',
    url: first.url ?? restaurantUrl,
    description: null, // teodor_banea actor doesn't return venue description
    website: null, // not available in menu-item rows
    phone: null, // not available in menu-item rows
    address: first.venueAddress ?? null,
    postCode: null, // not a separate field; may be part of venueAddress
    city: first.venueCity ?? null,
    menuItems,
    // teodor_banea actor doesn't return opening hours
    openingHours: null,
  };
}
