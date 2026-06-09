import * as cheerio from 'cheerio';
import type {
  LieferandoSearchResult,
  LieferandoRestaurantData,
  LieferandoMenuCategory,
  LieferandoMenuItem,
  LieferandoClientConfig,
  LieferandoClient,
} from './lieferando-types';

const BASE_URL = 'https://www.lieferando.de';

const DEFAULT_CONFIG: Required<LieferandoClientConfig> = {
  requestDelayMs: 750,
  maxRetries: 3,
  userAgent: 'UFlow-Enrichment/1.0 (+https://ummahflow.com/enrichment)',
};

function parsePriceCents(priceText: string): number {
  const cleaned = priceText
    .replace(/[^\d,]/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

type CheerioDoc = ReturnType<typeof cheerio.load>;

function extractJsonLd($: CheerioDoc): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const raw = $(scripts[i]).html();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed['@type'] === 'Restaurant' || parsed['@type'] === 'FoodEstablishment') {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/speisekarte\/([^/]+)/);
  return match ? match[1] : '';
}

function parseRestaurantCards($: CheerioDoc, city: string): LieferandoSearchResult[] {
  const results: LieferandoSearchResult[] = [];

  const cards = $('a[href*="/speisekarte/"]').filter((_, el) => {
    const text = $(el).text().trim();
    return text.length > 0 && !text.includes('Anmelden') && !text.includes('Lieferando');
  });

  const seen = new Set<string>();

  cards.each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') ?? '';
    const slug = extractSlugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const name = $el.text().trim() || slug;
    const ratingText = $el.find('[class*="rating"], [class*="sterne"]').first().text().trim();
    const rating = ratingText ? parseFloat(ratingText.replace(',', '.')) : null;

    results.push({
      name,
      slug,
      city,
      rating: isNaN(rating ?? NaN) ? null : rating,
      isActive: true,
    });
  });

  return results;
}

function parseMenuCategories($: CheerioDoc): LieferandoMenuCategory[] {
  const categories: LieferandoMenuCategory[] = [];

  const categoryElements = $(
    '[class*="category"], [class*="menu-category"], [class*="gericht-gruppe"], section'
  ).filter((_, el) => {
    const header = $(el).find('h2, h3, [class*="category-name"], [class*="category-title"]');
    return header.length > 0 && $(el).find('[class*="menu-item"], [class*="gericht"]').length > 0;
  });

  if (categoryElements.length === 0) return categories;

  categoryElements.each((_, el) => {
    const $cat = $(el);
    const catName =
      $cat.find('h2').first().text().trim() ||
      $cat.find('h3').first().text().trim() ||
      $cat.find('[class*="category-name"], [class*="category-title"]').first().text().trim() ||
      'Sonstige';

    const items: LieferandoMenuItem[] = [];
    const itemElements = $cat.find('[class*="menu-item"], [class*="gericht"]');

    itemElements.each((_, itemEl) => {
      const $item = $(itemEl);
      const name =
        $item.find('[class*="item-name"], [class*="gericht-name"], h4').first().text().trim() ||
        $item.contents().first().text().trim();
      if (!name) return;

      const descEl = $item.find('[class*="item-description"], [class*="gericht-beschreibung"], p');
      const description = descEl.length > 0 ? descEl.first().text().trim() : null;

      const priceEl = $item.find(
        '[class*="item-price"], [class*="gericht-preis"], [class*="price"]'
      );
      const priceText = priceEl.length > 0 ? priceEl.first().text().trim() : '0,00 €';
      const priceCents = parsePriceCents(priceText);

      items.push({ name, description: description || null, priceCents });
    });

    if (items.length > 0) {
      categories.push({ name: catName, items });
    }
  });

  return categories;
}

class LieferandoHttpClient implements LieferandoClient {
  private config: Required<LieferandoClientConfig>;
  private lastRequestTime = 0;

  constructor(config: Required<LieferandoClientConfig>) {
    this.config = config;
  }

  async searchRestaurants(city: string): Promise<LieferandoSearchResult[]> {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zäöüß-]/g, '');
    const url = `${BASE_URL}/speisekarte/${encodeURIComponent(citySlug)}`;

    const html = await this.fetchHtmlWithRetry(url);
    const $ = cheerio.load(html);

    return parseRestaurantCards($, city);
  }

  async getRestaurantPage(slug: string): Promise<LieferandoRestaurantData> {
    const url = `${BASE_URL}/speisekarte/${encodeURIComponent(slug)}`;

    const html = await this.fetchHtmlWithRetry(url);
    const $ = cheerio.load(html);

    const jsonLd = extractJsonLd($);

    const name =
      (jsonLd?.name as string) ??
      $('h1').first().text().trim() ??
      slug;

    const address =
      (jsonLd?.address as Record<string, unknown>)?.streetAddress as string ?? '';

    const phone = (jsonLd?.telephone as string) ?? null;

    const description =
      $('[class*="description"], [class*="beschreibung"], meta[name="description"]').first().attr('content') ??
      $('[class*="description"], [class*="beschreibung"]').first().text().trim() ??
      null;

    const openingHoursRaw = jsonLd?.openingHoursSpecification ?? null;
    const openingHours = openingHoursRaw
      ? ({ source: 'lieferando', hours: openingHoursRaw } as unknown as Record<string, unknown>)
      : null;

    const rating = jsonLd?.aggregateRating
      ? ((jsonLd.aggregateRating as Record<string, unknown>)?.ratingValue as number) ?? null
      : null;

    const menuCategories = parseMenuCategories($);

    return {
      name,
      slug,
      address,
      phone,
      openingHours,
      description,
      rating,
      menuCategories,
      deliveryUrl: url,
    };
  }

  private async fetchHtmlWithRetry(url: string, attempt = 0): Promise<string> {
    await this.rateLimit();

    const response = await fetch(url, {
      headers: { 'User-Agent': this.config.userAgent },
    });

    if (response.ok) {
      return response.text();
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < this.config.maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchHtmlWithRetry(url, attempt + 1);
      }
      throw new Error(`Lieferando error: HTTP ${response.status} after ${this.config.maxRetries} retries`);
    }

    if (response.status === 404) {
      throw new Error(`Lieferando 404: resource not found at ${url}`);
    }

    throw new Error(`Lieferando error: HTTP ${response.status}`);
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.config.requestDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.requestDelayMs - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  }
}

export function createLieferandoClient(
  config?: LieferandoClientConfig
): LieferandoClient {
  const merged: Required<LieferandoClientConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return new LieferandoHttpClient(merged);
}

export { parsePriceCents, extractJsonLd, parseMenuCategories, parseRestaurantCards };
