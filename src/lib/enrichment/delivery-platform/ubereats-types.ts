export interface UberEatsSearchResult {
  name: string;
  slug: string;
  rating: number | null;
  estimatedDeliveryMinutes: number | null;
  isActive: boolean;
}

export interface UberEatsRestaurantData {
  name: string;
  slug: string;
  description: string | null;
  rating: number | null;
  openingHours: Record<string, unknown> | null;
  menuCategories: UberEatsMenuCategory[];
  deliveryUrl: string;
}

export interface UberEatsMenuCategory {
  name: string;
  items: UberEatsMenuItem[];
}

export interface UberEatsMenuItem {
  name: string;
  description: string | null;
  priceCents: number;
}

export interface UberEatsClientConfig {
  requestDelayMs?: number;
  maxRetries?: number;
  headless?: boolean;
}

export interface UberEatsClient {
  searchRestaurants(city: string, lat: number, lon: number): Promise<UberEatsSearchResult[]>;
  getRestaurantPage(slug: string): Promise<UberEatsRestaurantData>;
  close(): Promise<void>;
}
