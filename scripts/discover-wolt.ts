/**
 * scripts/discover-wolt.ts
 *
 * Sweeps all 83 German cities via the Wolt public consumer API, identifies
 * halal-tagged venues, deduplicates against existing providers, and imports
 * new ones as pending.
 *
 * Usage:
 *   npx tsx scripts/discover-wolt.ts --dry-run          # default, preview only
 *   npx tsx scripts/discover-wolt.ts --write            # actually upsert
 *   npx tsx scripts/discover-wolt.ts --write --limit 5  # limit to first 5 cities
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CITY_COORDS } from '../src/lib/enrichment/delivery-platform/city-coords';
import { StaticCityGeocoder } from '../src/lib/enrichment/delivery-platform/geocoder';
import { createWoltClient } from '../src/lib/enrichment/delivery-platform/wolt-client';
import type { WoltVenue } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { normalizeName } from '../src/lib/enrichment/delivery-platform/provider-matcher';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000225000001';
const IMPORT_BOT_EMAIL = 'import-bot-wolt-discovery@system.internal';

/** Supabase upsert batch size */
const BATCH_SIZE = 50;

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isWrite = args.includes('--write');
const isDryRun = !isWrite;
const limitArg = getArgValue('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredVenue {
  name: string;
  slug: string;
  address: string | null;
  city: string;
  lat: number | null;
  lon: number | null;
  shortDescription: string | null;
  online: boolean;
  woltUrl: string;
  isNew: boolean;
  existingProviderId: string | null;
}

interface CityResult {
  city: string;
  totalVenues: number;
  halalVenues: number;
  newVenues: number;
  existingVenues: number;
  errors: string[];
}

// ─── Import bot user setup ────────────────────────────────────────────────────

async function ensureImportBotUser(): Promise<boolean> {
  try {
    const { data: existing } = await supabase.auth.admin.getUserById(IMPORT_BOT_UUID);
    if (existing?.user) {
      console.log(`  Import-bot user exists (${IMPORT_BOT_UUID})`);
      return true;
    }
  } catch {
    // Not found, proceed to create
  }

  const { error } = await supabase.auth.admin.createUser({
    id: IMPORT_BOT_UUID,
    email: IMPORT_BOT_EMAIL,
    email_confirm: true,
    user_metadata: {
      display_name: 'Wolt Discovery Import Bot',
      system_user: true,
    },
  });

  if (error) {
    console.error(`  Failed to create import-bot user: ${error.message}`);
    return false;
  }

  console.log(`  Import-bot user created (${IMPORT_BOT_EMAIL})`);
  return true;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function makeProviderKey(name: string, city: string | null): string {
  return `${normalizeName(name)}|${(city ?? '').toLowerCase().trim()}`;
}

interface ExistingProvider {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
}

/**
 * Loads all existing providers and builds:
 * 1. A dedup Set of normalized "name|city" keys
 * 2. A Map from key -> provider_id for linking delivery links to existing providers
 */
async function loadExistingProviders(): Promise<{
  dedupSet: Set<string>;
  keyToId: Map<string, string>;
}> {
  const dedupSet = new Set<string>();
  const keyToId = new Map<string, string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('provider_id, provider_name, address_city')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn(`  Could not load existing providers: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data as ExistingProvider[]) {
      const key = makeProviderKey(row.provider_name ?? '', row.address_city);
      dedupSet.add(key);
      keyToId.set(key, row.provider_id);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { dedupSet, keyToId };
}

// ─── Halal detection ──────────────────────────────────────────────────────────

function isHalalVenue(venue: WoltVenue): boolean {
  const check = (value: unknown): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase().includes('halal');
    }
    return false;
  };

  // Check name
  if (check(venue.name)) return true;

  // Check short_description
  if (check(venue.short_description)) return true;

  // Check tags array
  if (Array.isArray(venue.tags)) {
    for (const tag of venue.tags) {
      if (check(tag)) return true;
    }
  }

  // Check description (alternate field name)
  if (check(venue['description'])) return true;

  // Check food_tags or cuisine (common Wolt API fields)
  const foodTags = venue['food_tags'];
  if (Array.isArray(foodTags)) {
    for (const tag of foodTags) {
      if (check(tag)) return true;
    }
  }

  return false;
}

// ─── Venue URL builder ────────────────────────────────────────────────────────

function buildWoltUrl(venueSlug: string): string {
  return `https://wolt.com/de/deu/venue/${venueSlug}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nWolt Halal Discovery Pipeline`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (preview only)' : 'WRITE (upsert new providers)'}`);
  if (limit) console.log(`City limit: ${limit}`);
  console.log('');

  // 1. Ensure import bot user
  if (isWrite) {
    const botReady = await ensureImportBotUser();
    if (!botReady) {
      console.error('Cannot proceed without import-bot user.');
      process.exit(1);
    }
  }

  // 2. Load existing providers for dedup
  console.log('  Loading existing providers for dedup...');
  const { dedupSet, keyToId } = await loadExistingProviders();
  console.log(`  ${dedupSet.size} existing provider keys loaded\n`);

  // 3. Init Wolt client
  const geocoder = new StaticCityGeocoder();
  const woltClient = createWoltClient(
    { requestDelayMs: 800, maxRetries: 3 },
    geocoder
  );

  // 4. Iterate cities
  const cityEntries = Object.entries(CITY_COORDS);
  const citiesToProcess = limit ? cityEntries.slice(0, limit) : cityEntries;

  const allDiscovered: DiscoveredVenue[] = [];
  const cityResults: CityResult[] = [];
  const seenSlugs = new Set<string>();

  for (let i = 0; i < citiesToProcess.length; i++) {
    const [cityName, coords] = citiesToProcess[i];
    const cityResult: CityResult = {
      city: cityName,
      totalVenues: 0,
      halalVenues: 0,
      newVenues: 0,
      existingVenues: 0,
      errors: [],
    };

    console.log(`  [${i + 1}/${citiesToProcess.length}] ${cityName} (${coords.lat}, ${coords.lon})`);

    try {
      const searchResult = await woltClient.searchVenuesByLocation(coords.lat, coords.lon);
      cityResult.totalVenues = searchResult.venues.length;

      // Filter for halal venues
      const halalVenues = searchResult.venues.filter(isHalalVenue);
      cityResult.halalVenues = halalVenues.length;

      for (const venue of halalVenues) {
        // Deduplicate across cities (same slug seen from neighboring city scans)
        if (seenSlugs.has(venue.slug)) continue;
        seenSlugs.add(venue.slug);

        // Extract coordinates
        let venueLat: number | null = null;
        let venueLon: number | null = null;
        if (venue.location?.coordinates && venue.location.coordinates.length >= 2) {
          // Wolt returns [lon, lat] (GeoJSON order)
          venueLon = venue.location.coordinates[0];
          venueLat = venue.location.coordinates[1];
        }

        // Use venue city if available, fall back to iteration city
        const venueCity = (venue.city as string) ?? cityName;

        // Check dedup against existing providers
        const dedupKey = makeProviderKey(venue.name, venueCity);
        const existingProviderId = keyToId.get(dedupKey) ?? null;
        const isNew = !dedupSet.has(dedupKey);

        if (isNew) {
          cityResult.newVenues++;
        } else {
          cityResult.existingVenues++;
        }

        allDiscovered.push({
          name: venue.name,
          slug: venue.slug,
          address: venue.address ?? null,
          city: venueCity,
          lat: venueLat,
          lon: venueLon,
          shortDescription: venue.short_description ?? null,
          online: venue.online ?? true,
          woltUrl: buildWoltUrl(venue.slug),
          isNew,
          existingProviderId,
        });
      }

      if (halalVenues.length > 0) {
        console.log(`    ${searchResult.venues.length} total, ${halalVenues.length} halal`);
      } else {
        console.log(`    ${searchResult.venues.length} total, 0 halal`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      cityResult.errors.push(message);
      console.log(`    Error: ${message}`);
    }

    cityResults.push(cityResult);
  }

  // 5. Split into new providers and existing (delivery link only)
  const newVenues = allDiscovered.filter((v) => v.isNew);
  const existingVenues = allDiscovered.filter((v) => !v.isNew);

  // 6. Report
  console.log(`\n${'='.repeat(60)}`);
  console.log('  Discovery Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Cities scanned       : ${citiesToProcess.length}`);
  console.log(`  Unique halal venues  : ${allDiscovered.length}`);
  console.log(`  New (to import)      : ${newVenues.length}`);
  console.log(`  Existing (link only) : ${existingVenues.length}`);

  // City breakdown for cities with halal results
  const citiesWithHalal = cityResults.filter((c) => c.halalVenues > 0);
  if (citiesWithHalal.length > 0) {
    console.log(`\n  Cities with halal venues (${citiesWithHalal.length}):`);
    for (const cr of citiesWithHalal.sort((a, b) => b.halalVenues - a.halalVenues)) {
      console.log(`    ${cr.city}: ${cr.halalVenues} halal (${cr.newVenues} new, ${cr.existingVenues} existing)`);
    }
  }

  // Errors
  const citiesWithErrors = cityResults.filter((c) => c.errors.length > 0);
  if (citiesWithErrors.length > 0) {
    console.log(`\n  Cities with errors (${citiesWithErrors.length}):`);
    for (const cr of citiesWithErrors) {
      console.log(`    ${cr.city}: ${cr.errors.join(', ')}`);
    }
  }

  // Sample new venues
  if (newVenues.length > 0) {
    console.log(`\n  Sample new venues (first 10):`);
    for (const v of newVenues.slice(0, 10)) {
      console.log(`    ${v.name} (${v.city}) - ${v.woltUrl}`);
      if (v.shortDescription) {
        console.log(`      "${v.shortDescription.slice(0, 80)}${v.shortDescription.length > 80 ? '...' : ''}"`);
      }
    }
  }

  console.log(`${'='.repeat(60)}`);

  // 7. Write if not dry-run
  if (isDryRun) {
    console.log(`\n  Dry-run complete. Use --write to upsert providers and delivery links.`);
    return;
  }

  // ── Write new providers ───────────────────────────────────────────────────
  if (newVenues.length > 0) {
    console.log(`\n  Inserting ${newVenues.length} new providers...`);

    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < newVenues.length; i += BATCH_SIZE) {
      const batch = newVenues.slice(i, i + BATCH_SIZE);
      const records = batch.map((v) => ({
        provider_name: v.name,
        provider_description: v.shortDescription || null,
        address_street: v.address || null,
        address_city: v.city,
        address_country: 'DE',
        location_latitude: v.lat,
        location_longitude: v.lon,
        review_status: 'pending',
        import_source: 'wolt',
        import_source_id: v.slug,
        import_source_url: v.woltUrl,
        listing_type: 'food',
        user_created_id: IMPORT_BOT_UUID,
        provider_owner_id: null,
        show_address: true,
        enrichment_eligible: true,
      }));

      const { data, error } = await supabase
        .from('providers')
        .upsert(records, {
          onConflict: 'import_source,import_source_id',
          ignoreDuplicates: true,
        })
        .select('provider_id, provider_name');

      if (error) {
        console.error(`    Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
        failedCount += batch.length;
      } else {
        const count = data?.length ?? batch.length;
        insertedCount += count;

        // Create delivery links for newly inserted providers
        if (data && data.length > 0) {
          const deliveryLinks = data.map((row, idx) => ({
            provider_id: row.provider_id,
            platform: 'wolt' as const,
            platform_url: batch[idx].woltUrl,
            platform_slug: batch[idx].slug,
            is_active: batch[idx].online,
            last_verified_at: new Date().toISOString(),
          }));

          const { error: linkError } = await supabase
            .from('provider_delivery_links')
            .upsert(deliveryLinks, {
              onConflict: 'provider_id,platform',
              ignoreDuplicates: false,
            });

          if (linkError) {
            console.error(`    Delivery link batch failed: ${linkError.message}`);
          }
        }
      }
    }

    console.log(`  Inserted: ${insertedCount}, Failed: ${failedCount}`);
  }

  // ── Upsert delivery links for existing providers ──────────────────────────
  if (existingVenues.length > 0) {
    console.log(`\n  Upserting delivery links for ${existingVenues.length} existing providers...`);

    let linkedCount = 0;
    let linkFailCount = 0;

    for (let i = 0; i < existingVenues.length; i += BATCH_SIZE) {
      const batch = existingVenues.slice(i, i + BATCH_SIZE);
      const links = batch
        .filter((v) => v.existingProviderId !== null)
        .map((v) => ({
          provider_id: v.existingProviderId!,
          platform: 'wolt' as const,
          platform_url: v.woltUrl,
          platform_slug: v.slug,
          is_active: v.online,
          last_verified_at: new Date().toISOString(),
        }));

      if (links.length === 0) continue;

      const { error } = await supabase
        .from('provider_delivery_links')
        .upsert(links, {
          onConflict: 'provider_id,platform',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`    Delivery link batch failed: ${error.message}`);
        linkFailCount += links.length;
      } else {
        linkedCount += links.length;
      }
    }

    console.log(`  Linked: ${linkedCount}, Failed: ${linkFailCount}`);
  }

  console.log(`\n  Write complete.`);
  console.log(`  Query imported records:`);
  console.log(`    SELECT * FROM providers WHERE import_source = 'wolt' AND user_created_id = '${IMPORT_BOT_UUID}';`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
