import { runActorForItems } from '@/lib/enrichment/delivery-platform/apify-actor-run';
import type { MenuItemRow } from '@/lib/enrichment/delivery-platform/apify-lieferando-client';

/**
 * Apify UberEats menu scraper integration.
 *
 * Actor: memo23/uber-eats-scraper
 * Cost: ~$0.008 per run start + ~$0.0025 per dataset row
 * Input (one store): { startUrls: [{ url: <ubereats store URL> }], maxItems: 1 }
 *   maxReviews: 0 skips the review rows, which are billed separately.
 * Output: one row per store with menuItems[] { name, description, section, price, currency }.
 */

export const UBEREATS_ACTOR_ID = 'memo23~uber-eats-scraper';

interface UberEatsStoreRow {
  menuItems?: Array<{
    name?: string | null;
    description?: string | null;
    section?: string | null;
    price?: number | null;
  }> | null;
}

export function buildUberEatsInput(storeUrl: string): Record<string, unknown> {
  return {
    startUrls: [{ url: storeUrl }],
    maxItems: 1,
    maxReviews: 0,
  };
}

export async function fetchUberEatsMenu(
  storeUrl: string,
  apiToken: string,
): Promise<MenuItemRow[]> {
  const rows = await runActorForItems<UberEatsStoreRow>(
    UBEREATS_ACTOR_ID,
    buildUberEatsInput(storeUrl),
    apiToken,
  );

  return rows
    .flatMap((r) => r.menuItems ?? [])
    .filter((item) => item.name)
    .map((item, i) => ({
      name_de: item.name as string,
      description_de: item.description || null,
      category: item.section || null,
      price_cents: item.price != null ? Math.round(item.price * 100) : null,
      is_available: true,
      sort_order: i,
    }));
}
