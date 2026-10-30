import { runActorForItems } from '@/lib/enrichment/delivery-platform/apify-actor-run';

/**
 * Apify Lieferando menu scraper integration.
 *
 * Actor: kamerozkan/german-delivery-menu-price-intelligence
 * Cost: ~$0.005 per run start + ~$0.003 per menu item row (Free tier)
 * Input (direct-only run, one restaurant):
 *   { postalCodes: [], restaurantUrls: [<lieferando menu URL>], includeMenus: true }
 *   postalCodes must be [] or the actor adds its default Berlin postcode search.
 * Output: mixed dataset rows. Menu rows have recordType 'menu_item' with
 *   productName, description, category, price (EUR), isAvailable.
 *   Other recordTypes (restaurant, matrices, summaries) are ignored.
 */

export const LIEFERANDO_ACTOR_ID = 'kamerozkan~german-delivery-menu-price-intelligence';

export interface MenuItemRow {
  name_de: string;
  description_de: string | null;
  category: string | null;
  price_cents: number | null;
  is_available: boolean;
  sort_order: number;
}

interface LieferandoRow {
  recordType?: string;
  productName?: string | null;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  isAvailable?: boolean | null;
}

export function buildLieferandoInput(restaurantUrl: string): Record<string, unknown> {
  return {
    postalCodes: [],
    restaurantUrls: [restaurantUrl],
    includeMenus: true,
    trackPriceHistory: false,
    generateAnalytics: false,
    generateChangeDigest: false,
    maxConcurrency: 1,
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ['RESIDENTIAL'],
      apifyProxyCountry: 'DE',
    },
  };
}

export async function fetchLieferandoMenu(
  restaurantUrl: string,
  apiToken: string,
): Promise<MenuItemRow[]> {
  const rows = await runActorForItems<LieferandoRow>(
    LIEFERANDO_ACTOR_ID,
    buildLieferandoInput(restaurantUrl),
    apiToken,
  );

  return rows
    .filter((r) => r.recordType === 'menu_item' && r.productName)
    .map((r, i) => ({
      name_de: r.productName as string,
      description_de: r.description || null,
      category: r.category || null,
      price_cents: r.price != null ? Math.round(r.price * 100) : null,
      is_available: r.isAvailable !== false,
      sort_order: i,
    }));
}
