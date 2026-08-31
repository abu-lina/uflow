/**
 * Backfill missing location coordinates for approved and pending food providers.
 *
 * Powers Plan 196 "Near me" search: search_food_near_me() can only return rows
 * whose locations have location_latitude / location_longitude. Seed/imported
 * rows currently have NULL coordinates, so this script geocodes their postal
 * addresses (OpenStreetMap / Nominatim) and writes the coordinates back.
 *
 * Nominatim usage policy: max 1 request/second, descriptive User-Agent, no bulk
 * abuse. This script sleeps >=1.1s between requests and processes one row at a
 * time. For large/production backfills prefer a paid geocoder.
 *
 * Usage:
 *   npx tsx scripts/backfill-location-coords.ts --dry-run   # preview only (default)
 *   npx tsx scripts/backfill-location-coords.ts --apply      # write coordinates
 *   npx tsx scripts/backfill-location-coords.ts --apply --limit 5
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'UmmahFlow-coord-backfill/1.0 (https://ummahflow.com; support@ummahflow.com)';
const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 3;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY; // safe by default: never writes unless --apply is passed
const LIMIT = (() => {
  const idx = args.indexOf('--limit');
  if (idx >= 0 && idx + 1 < args.length) {
    const n = Number.parseInt(args[idx + 1], 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
})();

interface LocationRow {
  location_id: string;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/** Row is geocodable only if it has enough address signal (street or zip + city). */
function hasEnoughAddress(row: LocationRow): boolean {
  const hasStreet = Boolean(row.address_street?.trim());
  const hasZip = Boolean(row.address_zip?.trim());
  const hasCity = Boolean(row.address_city?.trim());
  return (hasStreet || hasZip) && hasCity;
}

async function geocode(row: LocationRow): Promise<{ lat: number; lon: number } | null> {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1' });
  if (row.address_street?.trim()) params.set('street', row.address_street.trim());
  if (row.address_city?.trim()) params.set('city', row.address_city.trim());
  if (row.address_zip?.trim()) params.set('postalcode', row.address_zip.trim());
  params.set('country', row.address_country?.trim() || 'Germany');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (res.status === 429) {
      const backoff = RATE_LIMIT_MS * (attempt + 2);
      console.warn(`  429 rate-limited, backing off ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      console.warn(`  geocode HTTP ${res.status} for ${row.location_id}`);
      return null;
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(results) || results.length === 0) return null;

    const lat = Number.parseFloat(results[0].lat);
    const lon = Number.parseFloat(results[0].lon);
    return isValidCoord(lat, lon) ? { lat, lon } : null;
  }

  console.warn(`  geocode exhausted retries for ${row.location_id}`);
  return null;
}

async function main(): Promise<void> {
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY (writing coordinates)'}`);

  let query = supabase
    .from('locations')
    .select(
      'location_id, address_street, address_zip, address_city, address_country, providers!inner(listing_type, review_status)',
    )
    .eq('providers.listing_type', 'food')
    .in('providers.review_status', ['approved', 'pending'])
    .or('location_latitude.is.null,location_longitude.is.null');

  if (LIMIT) query = query.limit(LIMIT);

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load locations:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as unknown as LocationRow[];
  console.log(`Found ${rows.length} approved/pending food location(s) without coordinates.\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const label = [row.address_street, row.address_zip, row.address_city].filter(Boolean).join(', ') || '(no address)';

    if (!hasEnoughAddress(row)) {
      console.log(`SKIP  ${row.location_id} — insufficient address: ${label}`);
      skipped += 1;
      continue;
    }

    try {
      const coords = await geocode(row);
      await sleep(RATE_LIMIT_MS);

      if (!coords) {
        console.log(`MISS  ${row.location_id} — no geocode match: ${label}`);
        failed += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(`WOULD ${row.location_id} — ${label} -> ${coords.lat}, ${coords.lon}`);
        updated += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('locations')
        .update({ location_latitude: coords.lat, location_longitude: coords.lon })
        .eq('location_id', row.location_id);

      if (updateError) {
        console.log(`FAIL  ${row.location_id} — update error: ${updateError.message}`);
        failed += 1;
        continue;
      }

      console.log(`OK    ${row.location_id} — ${label} -> ${coords.lat}, ${coords.lon}`);
      updated += 1;
    } catch (err) {
      console.log(`FAIL  ${row.location_id} — ${(err as Error).message}`);
      failed += 1;
    }
  }

  console.log(
    `\nDone. ${DRY_RUN ? 'would update' : 'updated'}: ${updated}, skipped: ${skipped}, failed: ${failed}, total: ${rows.length}`,
  );
  if (DRY_RUN && updated > 0) {
    console.log('Re-run with --apply to persist these coordinates.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
