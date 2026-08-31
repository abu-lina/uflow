import { CITY_COORDS, CITY_ALIASES } from './city-coords';

export interface Geocoder {
  geocode(cityName: string): Promise<{ lat: number; lon: number } | null>;
}

export class StaticCityGeocoder implements Geocoder {
  async geocode(cityName: string): Promise<{ lat: number; lon: number } | null> {
    const normalized = cityName.trim();
    if (!normalized) return null;

    // 1. Exact match
    const exact = CITY_COORDS[normalized];
    if (exact) return exact;

    // 2. Alias lookup (e.g., "Frankfurt" → "Frankfurt am Main")
    const aliased = CITY_ALIASES[normalized];
    if (aliased) {
      const resolved = CITY_COORDS[aliased];
      if (resolved) return resolved;
    }

    // 3. Case-insensitive match
    const lower = normalized.toLowerCase();
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (key.toLowerCase() === lower) return coords;
    }

    // 4. Alias case-insensitive fallback
    for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
      if (alias.toLowerCase() === lower) {
        const resolved = CITY_COORDS[canonical];
        if (resolved) return resolved;
      }
    }

    // 5. Strip phone numbers and try again (e.g., "Frankfurt am Main069 21001381")
    const cleaned = normalized.replace(/\d[\d\s-]+$/, '').trim();
    if (cleaned !== normalized) {
      return this.geocode(cleaned);
    }

    return null;
  }
}
