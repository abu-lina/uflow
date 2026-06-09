export interface LieferandoSearchResult {
  name: string;
  slug: string;
  city: string;
  address?: string;
  cuisineType?: string[];
  rating?: number | null;
  isActive: boolean;
  [key: string]: unknown;
}

export interface LieferandoRestaurantData {
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  openingHours: Record<string, unknown> | null;
  description: string | null;
  rating: number | null;
  menuCategories: LieferandoMenuCategory[];
  deliveryUrl: string;
}

export interface LieferandoMenuCategory {
  name: string;
  items: LieferandoMenuItem[];
}

export interface LieferandoMenuItem {
  name: string;
  description: string | null;
  priceCents: number;
}

export interface LieferandoClientConfig {
  requestDelayMs?: number;
  maxRetries?: number;
  userAgent?: string;
}

export interface LieferandoClient {
  searchRestaurants(city: string): Promise<LieferandoSearchResult[]>;
  getRestaurantPage(slug: string): Promise<LieferandoRestaurantData>;
}
