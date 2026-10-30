import { runActorForItems } from '@/lib/enrichment/delivery-platform/apify-actor-run';
import { LIEFERANDO_PAGE_FUNCTION } from '@/lib/enrichment/delivery-platform/apify-lieferando-page-function';

/**
 * Apify Lieferando menu scraper integration.
 *
 * Actor: apify/web-scraper with a custom page function (see
 *   apify-lieferando-page-function.ts), run against one restaurant page.
 * Cost: pay per platform usage (compute + residential proxy traffic). No per-item charge.
 * Input: { startUrls: [{ url: 'https://www.lieferando.de/speisekarte/<slug>' }],
 *   pageFunction, linkSelector: '' and maxPagesPerCrawl: 1 (no crawling),
 *   proxyConfiguration: residential, country DE }.
 *   Datacenter IPs are blocked by Lieferando, hence the residential proxy.
 * Output: one row { url, menuCategories: [{ name, items: [{ name, description, priceCents }] }] }.
 */

export const LIEFERANDO_ACTOR_ID = 'apify~web-scraper';

export interface MenuItemRow {
  name_de: string;
  description_de: string | null;
  category: string | null;
  price_cents: number | null;
  is_available: boolean;
  sort_order: number;
}

interface LieferandoPageRow {
  menuCategories?: Array<{
    name?: string | null;
    items?: Array<{
      name?: string | null;
      description?: string | null;
      priceCents?: number | null;
    }> | null;
  }> | null;
}

const MENU_URL_PATTERN =
  /^https?:\/\/(?:www\.)?lieferando\.de\/(?:[a-z]{2}\/)?(?:menu|speisekarte)\/([^/?#]+)/;

/** Canonicalises /menu/<slug> and /speisekarte/<slug> links to the /speisekarte/<slug> page. */
export function toLieferandoMenuUrl(url: string): string {
  const slug = url.match(MENU_URL_PATTERN)?.[1];
  if (!slug) throw new Error(`Not a Lieferando restaurant URL: ${url}`);
  return `https://www.lieferando.de/speisekarte/${slug}`;
}

export function buildLieferandoInput(restaurantUrl: string): Record<string, unknown> {
  return {
    runMode: 'PRODUCTION',
    startUrls: [{ url: toLieferandoMenuUrl(restaurantUrl) }],
    pageFunction: LIEFERANDO_PAGE_FUNCTION,
    linkSelector: '',
    maxPagesPerCrawl: 1,
    maxRequestRetries: 2,
    injectJQuery: false,
    waitUntil: ['networkidle2'],
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
  const rows = await runActorForItems<LieferandoPageRow>(
    LIEFERANDO_ACTOR_ID,
    buildLieferandoInput(restaurantUrl),
    apiToken,
  );

  return rows
    .flatMap((row) => row.menuCategories ?? [])
    .flatMap((cat) => (cat.items ?? []).map((item) => ({ cat, item })))
    .filter(({ item }) => item.name)
    .map(({ cat, item }, i) => ({
      name_de: item.name as string,
      description_de: item.description || null,
      category: cat.name || null,
      price_cents: item.priceCents || null,
      is_available: true,
      sort_order: i,
    }));
}
