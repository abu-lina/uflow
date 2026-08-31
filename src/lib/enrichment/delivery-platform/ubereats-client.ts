import type {
  UberEatsSearchResult,
  UberEatsRestaurantData,
  UberEatsMenuCategory,
  UberEatsMenuItem,
  UberEatsClientConfig,
  UberEatsClient,
} from './ubereats-types';

type Browser = import('playwright').Browser;
type BrowserContext = import('playwright').BrowserContext;
type Page = import('playwright').Page;

const DEFAULT_CONFIG: Required<UberEatsClientConfig> = {
  requestDelayMs: 2000,
  maxRetries: 2,
  headless: true,
};

const STEALTH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
];

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function toCitySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parsePriceToCents(priceStr: string): number {
  const cleaned = priceStr
    .replace(/[€$]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function extractStoreFromStateEntry(
  entry: Record<string, unknown>,
): UberEatsSearchResult | null {
  const store = entry.store as Record<string, unknown> | undefined;
  if (!store) return null;
  const name = store.title as string | undefined;
  const slug = store.slug as string | undefined;
  if (!name || !slug) return null;

  const ratingRaw = store.rating as Record<string, unknown> | undefined;
  let rating: number | null = null;
  if (ratingRaw && typeof ratingRaw.ratingValue === 'number') {
    rating = ratingRaw.ratingValue;
  } else if (typeof ratingRaw === 'number') {
    rating = ratingRaw;
  }

  const estimateRaw = store.estimate as Record<string, unknown> | undefined;
  let estimatedDeliveryMinutes: number | null = null;
  if (estimateRaw && typeof estimateRaw.estimate === 'number') {
    estimatedDeliveryMinutes = estimateRaw.estimate;
  } else if (typeof estimateRaw === 'number') {
    estimatedDeliveryMinutes = estimateRaw;
  }

  return {
    name,
    slug,
    rating,
    estimatedDeliveryMinutes,
    isActive: store.active !== false,
  };
}

export function extractSearchResultsFromState(
  state: Record<string, unknown>,
): UberEatsSearchResult[] {
  const results: UberEatsSearchResult[] = [];
  const seenSlugs = new Set<string>();

  // Path 1: pageData.catalog.sections[].items[].store
  const pageData = state.pageData as Record<string, unknown> | undefined;
  const catalog = pageData?.catalog as Record<string, unknown> | undefined;
  const sections = catalog?.sections as Record<string, unknown>[] | undefined;
  if (sections) {
    for (const section of sections) {
      const items = section.items as Record<string, unknown>[] | undefined;
      if (!items) continue;
      for (const item of items) {
        const result = extractStoreFromStateEntry(item);
        if (result && !seenSlugs.has(result.slug)) {
          seenSlugs.add(result.slug);
          results.push(result);
        }
      }
    }
  }

  // Path 2: searchResults array
  if (results.length === 0) {
    const searchResults = state.searchResults as Record<string, unknown>[] | undefined;
    if (searchResults) {
      for (const item of searchResults) {
        const result = extractStoreFromStateEntry(item);
        if (result && !seenSlugs.has(result.slug)) {
          seenSlugs.add(result.slug);
          results.push(result);
        }
      }
    }
  }

  return results;
}

export function extractMenuFromState(
  state: Record<string, unknown>,
): UberEatsMenuCategory[] {
  const categories: UberEatsMenuCategory[] = [];

  const storeData = state.store as Record<string, unknown> | undefined;
  if (!storeData) return categories;

  const menu = storeData.menu as Record<string, unknown>[] | undefined;
  if (!menu) return categories;

  for (const cat of menu) {
    const catName = cat.title as string | undefined;
    if (!catName) continue;

    const rawItems = cat.items as Record<string, unknown>[] | undefined;
    if (!rawItems) continue;

    const items: UberEatsMenuItem[] = [];
    for (const rawItem of rawItems) {
      const itemName = rawItem.title as string | undefined;
      if (!itemName) continue;

      let priceCents = 0;
      const rawPrice = rawItem.price as string | number | undefined;
      if (typeof rawPrice === 'string') {
        priceCents = parsePriceToCents(rawPrice);
      } else if (typeof rawPrice === 'number') {
        priceCents = Math.round(rawPrice * 100);
      }

      items.push({
        name: itemName,
        description: (rawItem.description as string) ?? null,
        priceCents,
      });
    }

    if (items.length > 0) {
      categories.push({ name: catName, items });
    }
  }

  return categories;
}

export function extractRestaurantFromState(
  slug: string,
  state: Record<string, unknown>,
): UberEatsRestaurantData | null {
  const storeData = state.store as Record<string, unknown> | undefined;
  if (!storeData) return null;

  const name = storeData.title as string | undefined;
  if (!name) return null;

  const ratingRaw = storeData.rating as Record<string, unknown> | undefined;
  let rating: number | null = null;
  if (ratingRaw && typeof ratingRaw.ratingValue === 'number') {
    rating = ratingRaw.ratingValue;
  } else if (typeof ratingRaw === 'number') {
    rating = ratingRaw;
  }

  const openingHoursRaw = storeData.hours as Record<string, unknown> | undefined;
  const openingHours = openingHoursRaw ?? null;
  const menuCategories = extractMenuFromState(state);

  return {
    name,
    slug,
    description: (storeData.description as string) ?? null,
    rating,
    openingHours,
    menuCategories,
    deliveryUrl: `https://www.ubereats.com/de/store/${slug}`,
  };
}

export async function extractSearchResultsFromDom(
  page: Page,
): Promise<UberEatsSearchResult[]> {
  return page.evaluate(() => {
    const results: Array<{
      name: string;
      slug: string;
      rating: number | null;
      estimatedDeliveryMinutes: number | null;
      isActive: boolean;
    }> = [];

    const tiles = Array.from(document.querySelectorAll('[data-testid="store-card"]'));
    for (const tile of tiles) {
      const link = tile.querySelector('a');
      const href = link?.getAttribute('href') ?? '';
      const slugMatch = href.match(/\/store\/([^/]+)/);
      const slug = slugMatch ? slugMatch[1] : '';

      const nameEl = tile.querySelector('[data-testid="store-name"]');
      const name = nameEl?.textContent?.trim() ?? '';

      if (!name || !slug) continue;

      results.push({
        name,
        slug,
        rating: null,
        estimatedDeliveryMinutes: null,
        isActive: true,
      });
    }

    return results;
  });
}

export async function extractRestaurantDataFromDom(
  page: Page,
  slug: string,
): Promise<UberEatsRestaurantData | null> {
  return page.evaluate(
    ({ slug }: { slug: string }) => {
      const nameEl =
        document.querySelector('[data-testid="store-name"]') ??
        document.querySelector('h1');
      const name = nameEl?.textContent?.trim() ?? '';

      if (!name) return null;

      const descEl = document.querySelector('[data-testid="store-description"]');
      const description = descEl?.textContent?.trim() ?? null;

      const categories: Array<{
        name: string;
        items: Array<{
          name: string;
          description: string | null;
          priceCents: number;
        }>;
      }> = [];

      const menuSections = Array.from(document.querySelectorAll('[data-testid="menu-section"]'));
      for (const section of menuSections) {
        const sectionNameEl = section.querySelector('[data-testid="section-title"]');
        const sectionName = sectionNameEl?.textContent?.trim() ?? '';
        if (!sectionName) continue;

        const items: Array<{
          name: string;
          description: string | null;
          priceCents: number;
        }> = [];

        const menuItems = Array.from(section.querySelectorAll('[data-testid="menu-item"]'));
        for (const item of menuItems) {
          const itemNameEl = item.querySelector('[data-testid="item-name"]');
          const itemName = itemNameEl?.textContent?.trim() ?? '';
          if (!itemName) continue;

          const descEl = item.querySelector('[data-testid="item-description"]');
          const itemDesc = descEl?.textContent?.trim() ?? null;

          const priceEl = item.querySelector('[data-testid="item-price"]');
          const priceText = priceEl?.textContent?.trim() ?? '';
          const priceCents = priceText
            ? (() => {
                const cleaned = priceText
                  .replace(/[€$]/g, '')
                  .replace(',', '.')
                  .trim();
                const parsed = parseFloat(cleaned);
                return isNaN(parsed) ? 0 : Math.round(parsed * 100);
              })()
            : 0;

          items.push({
            name: itemName,
            description: itemDesc,
            priceCents,
          });
        }

        if (items.length > 0) {
          categories.push({ name: sectionName, items });
        }
      }

      return {
        name,
        slug,
        description,
        rating: null,
        openingHours: null,
        menuCategories: categories,
        deliveryUrl: `https://www.ubereats.com/de/store/${slug}`,
      };
    },
    { slug },
  );
}

class PlaywrightUberEatsClient {
  private config: Required<UberEatsClientConfig>;
  private browser: Browser | null = null;
  private lastRequestTime = 0;

  constructor(config?: UberEatsClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      const { chromium } = await import('playwright');
      try {
        this.browser = await chromium.launch({
          headless: this.config.headless,
          args: STEALTH_ARGS,
        });
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes('browser') ||
            err.message.includes('executable') ||
            err.message.includes('playwright'))
        ) {
          throw new Error(
            "Playwright browser not installed. Run `npx playwright install chromium`.",
          );
        }
        throw err;
      }
    }
    return this.browser;
  }

  private async createContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: DEFAULT_USER_AGENT,
      locale: 'de-DE',
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    return context;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.config.requestDelayMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.requestDelayMs - elapsed),
      );
    }
    this.lastRequestTime = Date.now();
  }

  async searchRestaurants(
    city: string,
    _lat: number,
    _lon: number,
  ): Promise<UberEatsSearchResult[]> {
    await this.rateLimit();

    const context = await this.createContext();
    const page = await context.newPage();
    const citySlug = toCitySlug(city);

    try {
      await page.goto(
        `https://www.ubereats.com/de/location/${citySlug}`,
        {
          timeout: 30000,
          waitUntil: 'networkidle',
        },
      );

      // Try parsing embedded __INITIAL_STATE__ first
      const initialState = await page.evaluate(() => {
        return ((window as unknown as Record<string, unknown>).__INITIAL_STATE__ as Record<string, unknown>) ?? null;
      });

      if (initialState && typeof initialState === 'object') {
        const fromState = extractSearchResultsFromState(
          initialState as Record<string, unknown>,
        );
        if (fromState.length > 0) return fromState;
      }

      // Fallback to DOM parsing
      const fromDom = await extractSearchResultsFromDom(page);
      return fromDom;
    } finally {
      await page.close();
      await context.close();
    }
  }

  async getRestaurantPage(slug: string): Promise<UberEatsRestaurantData> {
    await this.rateLimit();

    const context = await this.createContext();
    const page = await context.newPage();

    try {
      await page.goto(
        `https://www.ubereats.com/de/store/${slug}`,
        {
          timeout: 30000,
          waitUntil: 'networkidle',
        },
      );

      // Try parsing embedded __INITIAL_STATE__ first
      const initialState = await page.evaluate(() => {
        return ((window as unknown as Record<string, unknown>).__INITIAL_STATE__ as Record<string, unknown>) ?? null;
      });

      if (initialState && typeof initialState === 'object') {
        const fromState = extractRestaurantFromState(
          slug,
          initialState as Record<string, unknown>,
        );
        if (fromState) return fromState;
      }

      // Fallback to DOM parsing
      const fromDom = await extractRestaurantDataFromDom(page, slug);
      if (fromDom) return fromDom;

      throw new Error('Could not extract restaurant data from page');
    } finally {
      await page.close();
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export function createUberEatsClient(
  config?: UberEatsClientConfig,
): UberEatsClient {
  return new PlaywrightUberEatsClient(config);
}


