import * as cheerio from 'cheerio';
import type { Browser, Page } from 'playwright';
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
  headless: true,
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

class LieferandoPlaywrightClient implements LieferandoClient {
  private config: Required<LieferandoClientConfig>;
  private lastRequestTime = 0;
  private browser: Browser | null = null;

  constructor(config: Required<LieferandoClientConfig>) {
    this.config = config;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const { chromium } = await import('playwright');
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });
    }
    return this.browser;
  }

  private async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });
    return context.newPage();
  }

  async searchRestaurants(city: string): Promise<LieferandoSearchResult[]> {
    await this.rateLimit();
    const citySlug = city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zäöüß-]/g, '');
    const url = `${BASE_URL}/speisekarte/${encodeURIComponent(citySlug)}`;

    const page = await this.createPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForSelector('a[href*="/speisekarte/"]', { timeout: 15000 }).catch(() => {});

      const results = await page.evaluate((cityName) => {
        const cardNodes = document.querySelectorAll('a[href*="/speisekarte/"]');
        const cards = Array.prototype.slice.call(cardNodes);
        const results: Array<{name: string; slug: string; city: string; rating: number | null; isActive: boolean}> = [];
        const seen = new Set<string>();

        cards.forEach((el) => {
          const href = (el as HTMLAnchorElement).href || '';
          const match = href.match(/\/speisekarte\/([^/]+)/);
          const slug = match ? match[1] : '';
          if (!slug || seen.has(slug)) return;
          seen.add(slug);

          const name = (el.textContent || '').trim() || slug;
          const ratingEl = el.querySelector('[class*="rating"], [class*="sterne"]');
          const ratingText = ratingEl ? (ratingEl.textContent || '').trim() : '';
          const rating = ratingText ? parseFloat(ratingText.replace(',', '.')) : null;

          results.push({
            name,
            slug,
            city: cityName,
            rating: (rating !== null && !isNaN(rating)) ? rating : null,
            isActive: true,
          });
        });

        return results;
      }, city);

      return results;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Lieferando search error for ${city}: ${msg}`);
    } finally {
      await page.close();
    }
  }

  async getRestaurantPage(slug: string): Promise<LieferandoRestaurantData> {
    await this.rateLimit();
    const url = `${BASE_URL}/speisekarte/${encodeURIComponent(slug)}`;

    const page = await this.createPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

      const data = await page.evaluate(() => {
        const scriptNodes = document.querySelectorAll('script[type="application/ld+json"]');
        const scripts = Array.prototype.slice.call(scriptNodes);
        let jsonLd: Record<string, unknown> | null = null;
        for (const script of scripts) {
          try {
            const parsed = JSON.parse(script.textContent || '{}');
            if (parsed['@type'] === 'Restaurant' || parsed['@type'] === 'FoodEstablishment') {
              jsonLd = parsed;
              break;
            }
          } catch {
            // skip malformed JSON-LD
          }
        }

        const name = (jsonLd?.name as string) || document.querySelector('h1')?.textContent?.trim() || '';
        const address = ((jsonLd?.address as Record<string, unknown>)?.streetAddress as string) || '';
        const phone = (jsonLd?.telephone as string) || null;

        const descEl = document.querySelector('[class*="description"], [class*="beschreibung"], meta[name="description"]');
        const description = descEl?.getAttribute('content') || descEl?.textContent?.trim() || null;

        const rating = jsonLd?.aggregateRating
          ? ((jsonLd.aggregateRating as Record<string, unknown>)?.ratingValue as number) || null
          : null;

        const categories: Array<{name: string; items: Array<{name: string; description: string | null; priceCents: number}>}> = [];
        const catNodeList = document.querySelectorAll('[class*="category"], [class*="menu-category"], [class*="gericht-gruppe"], section');
        const catElements = Array.prototype.slice.call(catNodeList);

        catElements.forEach((cat) => {
          const header = cat.querySelector('h2, h3, [class*="category-name"], [class*="category-title"]');
          if (!header) return;
          const catName = header.textContent?.trim() || 'Sonstige';

          const items: Array<{name: string; description: string | null; priceCents: number}> = [];
          const itemNodeList = cat.querySelectorAll('[class*="menu-item"], [class*="gericht"]');
          const itemElements = Array.prototype.slice.call(itemNodeList);

          itemElements.forEach((item) => {
            const nameEl = item.querySelector('[class*="item-name"], [class*="gericht-name"], h4');
            const name = nameEl?.textContent?.trim() || (item.childNodes[0]?.textContent || '').trim();
            if (!name) return;

            const descEl = item.querySelector('[class*="item-description"], [class*="gericht-beschreibung"], p');
            const description = descEl ? descEl.textContent?.trim() || null : null;

            const priceEl = item.querySelector('[class*="item-price"], [class*="gericht-preis"], [class*="price"]');
            const priceText = priceEl ? priceEl.textContent?.trim() || '0,00 €' : '0,00 €';
            const cleaned = priceText.replace(/[^\d,]/g, '').replace(',', '.');
            const priceCents = Math.round((parseFloat(cleaned) || 0) * 100);

            items.push({ name, description: description || null, priceCents });
          });

          if (items.length > 0) {
            categories.push({ name: catName, items });
          }
        });

        return {
          name,
          slug: '',
          address,
          phone,
          description,
          rating,
          menuCategories: categories,
          deliveryUrl: window.location.href,
          openingHours: null,
        };
      });

      return {
        ...data,
        slug,
        openingHours: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Lieferando error for slug ${slug}: ${msg}`);
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.config.requestDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.requestDelayMs - elapsed));
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
  return new LieferandoPlaywrightClient(merged);
}

export { parsePriceCents, extractJsonLd, parseMenuCategories, parseRestaurantCards };
