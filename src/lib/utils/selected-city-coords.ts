/**
 * Coordinates of the city picked during onboarding, when the picker knew them
 * (city search results do; the preset city buttons don't). Used as the origin
 * for the nearest-city lookup (#674).
 */
export interface CityCoords {
  lat: number;
  lon: number;
}

const STORAGE_KEY = 'selectedCityCoords';

export function setSelectedCityCoords(coords: CityCoords | null): void {
  try {
    if (coords) localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable, the lookup falls back to the stored city center */
  }
}

export function getSelectedCityCoords(): CityCoords | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<CityCoords> | null;
    return typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number'
      ? { lat: parsed.lat, lon: parsed.lon }
      : null;
  } catch {
    return null;
  }
}
