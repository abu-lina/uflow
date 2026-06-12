import type { OpeningHours, OpeningHoursDay, OpeningHoursWindow } from '@/types/openingHours';

/**
 * Apify Wolt Restaurant & Menu Scraper integration.
 *
 * Replaces the custom Wolt HTTP client (fetchMenuData) for URL-based
 * enrichment. Provides menu items AND opening hours from the Apify
 * actor, which handles anti-bot measures and returns structured data.
 *
 * Actor: needy_hammock/wolt-restaurant-menu-scraper
 * Cost: ~$0.0015 per detailed result (FREE tier)
 * Input: Wolt restaurant URL + includeDetails=true
 * Output: restaurant data with menuItems, openingTimesSchedule, etc.
 */

const APIFY_ACTOR_ID = 'y0NfA98a3bpJBTodv';
const APIFY_BASE = 'https://api.apify.com/v2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw menu item returned by the Apify actor. */
interface ApifyRawMenuItem {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number | null;
  originalPriceInCents: number | null;
  category: string | null;
  imageUrl: string | null;
  dietaryPreferences: string[];
}

/** Raw opening-hours entry from Apify. */
interface ApifyRawScheduleEntry {
  day: string; // "Monday" | "Tuesday" | ... | "Sunday"
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

/** Raw actor response (first item in the dataset). */
interface ApifyActorOutput {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  postCode: string | null;
  city: string | null;
  ratingScore: number | null;
  reviewCount: number;
  menuItems: ApifyRawMenuItem[];
  openingTimesSchedule: ApifyRawScheduleEntry[] | null;
  deliveryTimesSchedule: ApifyRawScheduleEntry[] | null;
  [key: string]: unknown;
}

/** Normalized result returned to the caller. */
export interface ApifyWoltResult {
  name: string;
  slug: string;
  url: string;
  description: string | null;
  website: string | null;
  phone: string | null;
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
// Day-name normalization
// ---------------------------------------------------------------------------

const DAY_NAME_MAP: Record<string, keyof OpeningHours> = {
  // English
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
  // German (Apify returns these for German Wolt pages)
  montag: 'monday',
  dienstag: 'tuesday',
  mittwoch: 'wednesday',
  donnerstag: 'thursday',
  freitag: 'friday',
  samstag: 'saturday',
  sonntag: 'sunday',
};

/**
 * Normalize Apify's openingTimesSchedule (array of { day, open, close }) to
 * our internal OpeningHours type.
 */
function normalizeApifySchedule(
  schedule: ApifyRawScheduleEntry[] | null | undefined,
): OpeningHours | null {
  if (!schedule || schedule.length === 0) return null;

  const result: OpeningHours = {};
  let validCount = 0;

  for (const entry of schedule) {
    const dayKey = DAY_NAME_MAP[entry.day.toLowerCase()];
    if (!dayKey) continue;

    // Validate time format
    const timeRe = /^(\d{1,2}):(\d{2})$/;
    const openMatch = entry.open.match(timeRe);
    const closeMatch = entry.close.match(timeRe);
    if (!openMatch || !closeMatch) continue;

    const openH = parseInt(openMatch[1], 10);
    const closeH = parseInt(closeMatch[1], 10);
    if (openH < 0 || openH > 24 || closeH < 0 || closeH > 24) continue;

    const window: OpeningHoursWindow = { open: entry.open, close: entry.close };
    result[dayKey] = window as OpeningHoursDay;
    validCount++;
  }

  return validCount > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Apify API calls
// ---------------------------------------------------------------------------

/**
 * Run the Apify Wolt actor with a restaurant URL and wait for completion.
 * Returns the default dataset ID on success, or throws on failure.
 */
async function runActor(
  restaurantUrl: string,
  apiToken: string,
): Promise<string> {
  const url = `${APIFY_BASE}/acts/${APIFY_ACTOR_ID}/runs?token=${apiToken}&waitForFinish=60`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantUrl,
      includeDetails: true,
      maxItems: 0, // 0 = unlimited
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
    const statusMessage = runData?.statusMessage as string ?? 'unknown error';
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
async function getDatasetItems<T>(
  datasetId: string,
  apiToken: string,
): Promise<T[]> {
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
 * @param restaurantUrl - Full Wolt restaurant URL (e.g., https://wolt.com/...)
 * @param apiToken - Apify API token (APIFY_API_TOKEN)
 * @returns Normalized restaurant data, or null if the restaurant wasn't found
 *          on Wolt (empty result from Apify).
 */
export async function fetchWoltRestaurant(
  restaurantUrl: string,
  apiToken: string,
): Promise<ApifyWoltResult | null> {
  const datasetId = await runActor(restaurantUrl, apiToken);
  const items = await getDatasetItems<ApifyActorOutput>(datasetId, apiToken);

  // Empty dataset = restaurant not found
  if (!items || items.length === 0) return null;

  const raw = items[0];

  // Normalize menu items
  const menuItems = (raw.menuItems ?? []).map((item, i) => ({
    name_de: item.name,
    description_de: item.description ?? null,
    category: item.category ?? null,
    price_cents: item.priceInCents ?? null,
    is_available: true,
    sort_order: i,
  }));

  // Normalize opening hours
  const openingHours = normalizeApifySchedule(raw.openingTimesSchedule);

  return {
    name: raw.name ?? '',
    slug: raw.slug ?? '',
    url: raw.url ?? restaurantUrl,
    description: raw.description ?? null,
    website: raw.website ?? null,
    phone: raw.phone ?? null,
    menuItems,
    openingHours,
  };
}
