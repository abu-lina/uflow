import type { Geocoder } from './geocoder';

export interface WoltClientConfig {
  requestDelayMs?: number;
  maxRetries?: number;
  userAgent?: string;
}

export interface WoltVenue {
  name: string;
  slug: string;
  tags?: string[];
  short_description?: string;
  address?: string;
  city?: string;
  location?: { coordinates?: [number, number] };
  online?: boolean;
  [key: string]: unknown;
}

export interface WoltVenueSearchResult {
  venues: WoltVenue[];
  lat: number;
  lon: number;
}

export interface WoltClient {
  searchVenuesByLocation(lat: number, lon: number): Promise<WoltVenueSearchResult>;
  fetchMenuData(venueSlug: string): Promise<{
    items: Array<{ name: string; description?: string; category?: string }>;
    categories: Array<{ name: string; items: string[] }>;
  }>;
  geocodeCity(cityName: string): Promise<{ lat: number; lon: number } | null>;
}

const DEFAULT_CONFIG: Required<WoltClientConfig> = {
  requestDelayMs: 500,
  maxRetries: 5,
  userAgent: 'UFlow-Enrichment/1.0 (+https://ummahflow.com/enrichment)',
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

class WoltHttpClient implements WoltClient {
  private config: Required<WoltClientConfig>;
  private geocoder: Geocoder;
  private lastRequestTime = 0;

  constructor(config: Required<WoltClientConfig>, geocoder: Geocoder) {
    this.config = config;
    this.geocoder = geocoder;
  }

  async searchVenuesByLocation(lat: number, lon: number): Promise<WoltVenueSearchResult> {
    await this.rateLimit();

    const url = `https://consumer-api.wolt.com/v1/pages/restaurants?lat=${lat}&lon=${lon}`;
    const data = await this.fetchWithRetry(url) as Record<string, unknown>;

    const sections = asArray<Record<string, unknown>>(data?.sections);
    const venues: WoltVenue[] = [];

    for (const section of sections) {
      const items = asArray<Record<string, unknown>>(section?.items);
      for (const item of items) {
        const venue = item?.venue as Record<string, unknown> | undefined;
        if (venue?.slug) {
          venues.push({
            name: (venue.name as string) ?? (venue.slug as string),
            slug: venue.slug as string,
            ...venue,
          });
        }
      }
    }

    return { venues, lat, lon };
  }

  async fetchMenuData(venueSlug: string): Promise<{
    items: Array<{ name: string; description?: string; category?: string }>;
    categories: Array<{ name: string; items: string[] }>;
  }> {
    await this.rateLimit();

    const url = `https://restaurant-api.wolt.com/v4/venues/slug/${venueSlug}/menu/data?unit_prices=true&show_weighted_items=true&show_subcategories=true`;
    const data = await this.fetchWithRetry(url) as Record<string, unknown>;

    const items: Array<{ name: string; description?: string; category?: string }> = [];
    const categories: Array<{ name: string; items: string[] }> = [];

    const rawCategories = asArray<Record<string, unknown>>(data?.categories);
    for (const cat of rawCategories) {
      const categoryName = typeof cat?.name === 'string' ? cat.name : '';
      const catItems: string[] = [];

      const categoryItems = asArray<Record<string, unknown>>(cat?.items);
      for (const rawItem of categoryItems) {
        const itemName = typeof rawItem?.name === 'string' ? rawItem.name : '';
        if (itemName) {
          items.push({
            name: itemName,
            description: typeof rawItem?.description === 'string' ? rawItem.description : undefined,
            category: categoryName || undefined,
          });
          catItems.push(itemName);
        }
      }

      if (categoryName && catItems.length > 0) {
        categories.push({ name: categoryName, items: catItems });
      }
    }

    return { items, categories };
  }

  async geocodeCity(cityName: string): Promise<{ lat: number; lon: number } | null> {
    return this.geocoder.geocode(cityName);
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

  private async fetchWithRetry(url: string, attempt = 0): Promise<unknown> {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.config.userAgent },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < this.config.maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw new Error(`Wolt API error: HTTP ${response.status} after ${this.config.maxRetries} retries`);
    }

    if (response.status === 404) {
      throw new Error(`Wolt API 404: resource not found at ${url}`);
    }

    throw new Error(`Wolt API error: HTTP ${response.status}`);
  }
}

export function createWoltClient(
  config?: WoltClientConfig,
  geocoder?: Geocoder
): WoltClient {
  if (!geocoder) {
    throw new Error('Geocoder is required for WoltClient');
  }
  const merged: Required<WoltClientConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return new WoltHttpClient(merged, geocoder);
}
