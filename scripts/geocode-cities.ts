/**
 * Geocode city names to city-center coordinates for public.cities (#674).
 *
 * Reads a JSON array of { city_name, country } from the file given as the
 * first argument and prints one SQL VALUES row per resolved city, ready to
 * paste into a migration's UPDATE ... FROM (VALUES ...). Unresolved names
 * (regions, countries, typos) are reported on stderr and skipped.
 *
 * No database access: the output is reviewed and committed as a migration.
 * Nominatim usage policy: one request at a time, >=1.1s apart, descriptive
 * User-Agent.
 *
 * Usage:
 *   npx tsx scripts/geocode-cities.ts cities.json > values.sql
 */
import { readFileSync } from 'fs';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'UmmahFlow-city-geocode/1.0 (https://ummahflow.com; support@ummahflow.com)';
const RATE_LIMIT_MS = 1100;

interface CityInput {
  city_name: string;
  country: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  addresstype?: string;
}

const SETTLEMENT_TYPES = new Set(['city', 'town', 'village', 'municipality', 'borough', 'suburb']);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const sqlText = (value: string): string => `'${value.replace(/'/g, "''")}'`;

async function geocode(city: CityInput): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({
    format: 'json',
    city: city.city_name,
    country: city.country,
    limit: '1',
  });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'de,en' },
  });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const [hit] = (await response.json()) as NominatimResult[];
  if (!hit || (hit.addresstype && !SETTLEMENT_TYPES.has(hit.addresstype))) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon) };
}

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npx tsx scripts/geocode-cities.ts <cities.json>');
    process.exit(1);
  }
  const cities = JSON.parse(readFileSync(file, 'utf-8')) as CityInput[];
  const rows: string[] = [];

  for (const city of cities) {
    try {
      const coords = await geocode(city);
      if (coords) {
        rows.push(`  (${sqlText(city.city_name)}, ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)})`);
      } else {
        console.error(`unresolved: ${city.city_name} (${city.country})`);
      }
    } catch (error) {
      console.error(`failed: ${city.city_name}: ${(error as Error).message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(rows.join(',\n'));
}

void main();
