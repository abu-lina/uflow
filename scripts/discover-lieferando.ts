/**
 * scripts/discover-lieferando.ts
 *
 * Lieferando Halal Discovery Pipeline (Plan 225)
 *
 * Sweeps German cities via the Takeaway.com REST API, identifies
 * halal-tagged restaurants, deduplicates against existing providers,
 * and imports new ones as pending.
 *
 * Uses the lightweight REST client (no Playwright) for fast city sweeps.
 *
 * ─── IMPORTANT OPERATIONAL NOTES ───────────────────────────────────────────
 * - Always run with --dry-run first to inspect the discovery plan before writing.
 * - The script uses SUPABASE_SERVICE_ROLE_KEY (admin/service-role access).
 *   This bypasses RLS. Handle credentials with care.
 * - Imported rows default to review_status = 'pending' and are not publicly
 *   visible until approved via the admin moderation workflow.
 * - Rate-limited: 250ms between Takeaway API calls.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npx tsx scripts/discover-lieferando.ts --dry-run
 *   npx tsx scripts/discover-lieferando.ts --dry-run --limit 5
 *   npx tsx scripts/discover-lieferando.ts --write
 *   npx tsx scripts/discover-lieferando.ts --write --limit 5
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CITY_COORDS } from '../src/lib/enrichment/delivery-platform/city-coords';
import {
  createTakeawayRestClient,
  type TakeawayRestaurant,
} from '../src/lib/enrichment/delivery-platform/takeaway-rest-client';
import { normalizeName } from '../src/lib/enrichment/delivery-platform/provider-matcher';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Source-specific import-bot UUID for Lieferando discovery.
 * Uses plan number 225 as suffix for human traceability.
 */
const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000225000002';
const IMPORT_BOT_EMAIL = 'import-bot-lieferando-discovery@system.internal';

/** Supabase upsert batch size */
const BATCH_SIZE = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderInsert {
  provider_name: string;
  address_city: string;
  address_country: string;
  location_latitude: number | null;
  location_longitude: number | null;
  review_status: 'pending';
  import_source: string;
  import_source_id: string;
  import_source_url: string;
  listing_type: 'food';
  user_created_id: string;
  provider_owner_id: null;
  show_address: boolean;
  enrichment_eligible: boolean;
}

interface DeliveryLinkUpsert {
  provider_id: string;
  platform: 'lieferando';
  platform_url: string;
  platform_slug: string;
  is_active: boolean;
  last_verified_at: string;
}

interface CityResult {
  city: string;
  totalRestaurants: number;
  halalRestaurants: number;
  newProviders: number;
  existingWithLink: number;
}

interface DiscoveredRestaurant {
  restaurant: TakeawayRestaurant;
  city: string;
  isNew: boolean;
  existingProviderId?: string;
}

// ─── Supabase client ──────────────────────────────────────────────────────────

let supabase: ReturnType<typeof createClient>;

// ─── Import bot user setup ────────────────────────────────────────────────────

async function ensureImportBotUser(): Promise<boolean> {
  try {
    const { data: existing } = await supabase.auth.admin.getUserById(IMPORT_BOT_UUID);
    if (existing?.user) {
      console.log(`  + Import-bot user already exists (${IMPORT_BOT_UUID})`);
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
      display_name: 'Lieferando Discovery Bot',
      system_user: true,
    },
  });

  if (error) {
    console.error(`  Failed to create import-bot user: ${error.message}`);
    return false;
  }

  console.log(`  + Import-bot user created (${IMPORT_BOT_EMAIL})`);
  return true;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Builds a dedup key from name + city using the same normalization as the
 * provider-matcher module.
 */
function makeProviderKey(name: string, city: string | null): string {
  return `${normalizeName(name)}|${(city ?? '').toLowerCase().trim()}`;
}

interface ExistingProvider {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
}

/**
 * Loads all existing providers for dedup: name+city -> provider_id.
 */
async function loadExistingProviders(): Promise<{
  keySet: Set<string>;
  keyToId: Map<string, string>;
}> {
  const keySet = new Set<string>();
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
      keySet.add(key);
      keyToId.set(key, row.provider_id);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return { keySet, keyToId };
}

// ─── Halal detection ──────────────────────────────────────────────────────────

function isHalalRestaurant(r: TakeawayRestaurant): boolean {
  const nameHasHalal = r.name.toLowerCase().includes('halal');
  const cuisineHasHalal = r.cuisines.some((c) =>
    c.toLowerCase().includes('halal')
  );
  return nameHasHalal || cuisineHasHalal;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function printReport(
  cityResults: CityResult[],
  totalNew: number,
  totalExisting: number,
  isDryRun: boolean
) {
  console.log('\n================================================================');
  console.log(isDryRun
    ? '  DRY-RUN REPORT -- no data was written'
    : '  WRITE REPORT');
  console.log('================================================================');

  console.log('\n  City-by-city results:');
  console.log('  ' + '-'.repeat(62));
  console.log(
    '  ' +
    'City'.padEnd(30) +
    'Total'.padStart(8) +
    'Halal'.padStart(8) +
    'New'.padStart(8) +
    'Exists'.padStart(8)
  );
  console.log('  ' + '-'.repeat(62));

  for (const cr of cityResults) {
    console.log(
      '  ' +
      cr.city.padEnd(30) +
      String(cr.totalRestaurants).padStart(8) +
      String(cr.halalRestaurants).padStart(8) +
      String(cr.newProviders).padStart(8) +
      String(cr.existingWithLink).padStart(8)
    );
  }

  console.log('  ' + '-'.repeat(62));

  const totalCities = cityResults.length;
  const totalHalal = cityResults.reduce((s, c) => s + c.halalRestaurants, 0);
  const totalScanned = cityResults.reduce((s, c) => s + c.totalRestaurants, 0);

  console.log(`\n  Cities scanned       : ${totalCities}`);
  console.log(`  Total restaurants    : ${totalScanned}`);
  console.log(`  Halal restaurants    : ${totalHalal}`);
  console.log(`  New providers        : ${totalNew}`);
  console.log(`  Existing (link only) : ${totalExisting}`);

  if (isDryRun) {
    console.log('\n  To execute the import, run:');
    console.log('    npx tsx scripts/discover-lieferando.ts --write [--limit N]');
  } else {
    console.log('\n  To query imported records:');
    console.log(`    SELECT * FROM providers WHERE import_source = 'lieferando';`);
    console.log(`    SELECT * FROM provider_delivery_links WHERE platform = 'lieferando';`);
  }
  console.log('================================================================\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--write');
  const limitFlag = args.findIndex((a) => a === '--limit');
  const limitRaw = limitFlag >= 0 ? parseInt(args[limitFlag + 1], 10) : null;
  if (limitRaw !== null && (!Number.isInteger(limitRaw) || limitRaw <= 0)) {
    console.error(`--limit requires a positive integer (got: ${args[limitFlag + 1]})`);
    process.exit(1);
  }
  const limit = limitRaw;

  console.log('\n+======================================================+');
  console.log('|  UFlow -- Lieferando Halal Discovery (Plan 225)       |');
  console.log('+======================================================+');
  console.log(`  Mode       : ${isDryRun ? 'DRY-RUN (no writes)' : 'WRITE'}`);
  console.log(`  Limit      : ${limit !== null ? `${limit} cities` : 'all cities'}`);
  console.log(`  Cities     : ${Object.keys(CITY_COORDS).length} available\n`);

  // Initialize Supabase (after argument validation)
  supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Load existing providers for dedup
  console.log('> Loading existing providers for deduplication...');
  const { keySet: existingKeys, keyToId: existingKeyToId } = await loadExistingProviders();
  console.log(`  + Loaded ${existingKeys.size} existing providers\n`);

  // Prepare city list
  const cities = Object.entries(CITY_COORDS);
  const citiesToScan = limit !== null ? cities.slice(0, limit) : cities;

  // Initialize Takeaway REST client
  const client = createTakeawayRestClient();

  // Discovery loop
  const cityResults: CityResult[] = [];
  const newProviders: DiscoveredRestaurant[] = [];
  const existingWithLinks: DiscoveredRestaurant[] = [];
  const seenSlugs = new Set<string>();

  console.log(`> Scanning ${citiesToScan.length} cities...\n`);

  for (let i = 0; i < citiesToScan.length; i++) {
    const [cityName, coords] = citiesToScan[i];
    const progress = `[${i + 1}/${citiesToScan.length}]`;

    let restaurants: TakeawayRestaurant[];
    try {
      restaurants = await client.searchRestaurants(coords.lat, coords.lon);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${progress} ${cityName}: API error - ${msg}`);
      cityResults.push({
        city: cityName,
        totalRestaurants: 0,
        halalRestaurants: 0,
        newProviders: 0,
        existingWithLink: 0,
      });
      continue;
    }

    // Filter for halal
    const halalRestaurants = restaurants.filter(isHalalRestaurant);

    let newCount = 0;
    let existingCount = 0;

    for (const restaurant of halalRestaurants) {
      // Cross-city dedup: skip if same restaurant seen from a neighboring city scan
      if (seenSlugs.has(restaurant.slug)) continue;
      seenSlugs.add(restaurant.slug);

      // Use city from API response, fall back to the city name we searched
      const restaurantCity = restaurant.city || cityName;
      const key = makeProviderKey(restaurant.name, restaurantCity);

      if (existingKeys.has(key)) {
        // Existing provider: plan to upsert delivery link only
        const providerId = existingKeyToId.get(key);
        if (providerId) {
          existingWithLinks.push({
            restaurant,
            city: restaurantCity,
            isNew: false,
            existingProviderId: providerId,
          });
        }
        existingCount++;
      } else {
        // New provider
        newProviders.push({
          restaurant,
          city: restaurantCity,
          isNew: true,
        });
        existingKeys.add(key); // prevent dupes within this run
        newCount++;
      }
    }

    console.log(
      `  ${progress} ${cityName}: ${restaurants.length} total, ${halalRestaurants.length} halal (${newCount} new, ${existingCount} existing)`
    );

    cityResults.push({
      city: cityName,
      totalRestaurants: restaurants.length,
      halalRestaurants: halalRestaurants.length,
      newProviders: newCount,
      existingWithLink: existingCount,
    });
  }

  // Print sample new providers
  if (newProviders.length > 0) {
    console.log('\n  Sample new providers (first 5):');
    for (const item of newProviders.slice(0, 5)) {
      const r = item.restaurant;
      console.log(`    - ${r.name} (${item.city}) [${r.cuisines.join(', ')}]`);
      console.log(`      slug: ${r.slug} | rating: ${r.rating ?? 'n/a'}`);
    }
  }

  // Report
  printReport(cityResults, newProviders.length, existingWithLinks.length, isDryRun);

  if (isDryRun) return;

  // ─── Write mode ─────────────────────────────────────────────────────────

  // Ensure import-bot user exists
  console.log('> Ensuring import-bot user exists...');
  const botOk = await ensureImportBotUser();
  if (!botOk) {
    console.error('  Cannot proceed without import-bot user. Aborting.');
    process.exit(1);
  }

  // Insert new providers in batches
  if (newProviders.length > 0) {
    console.log(`\n> Inserting ${newProviders.length} new providers in batches of ${BATCH_SIZE}...`);

    const providerRecords: ProviderInsert[] = newProviders.map((item) => ({
      provider_name: item.restaurant.name,
      address_city: item.city,
      address_country: 'DE',
      location_latitude: item.restaurant.latitude,
      location_longitude: item.restaurant.longitude,
      review_status: 'pending' as const,
      import_source: 'lieferando',
      import_source_id: item.restaurant.slug,
      import_source_url: `https://www.lieferando.de/speisekarte/${item.restaurant.slug}`,
      listing_type: 'food' as const,
      user_created_id: IMPORT_BOT_UUID,
      provider_owner_id: null,
      show_address: true,
      enrichment_eligible: true,
    }));

    let inserted = 0;
    let failed = 0;

    for (let offset = 0; offset < providerRecords.length; offset += BATCH_SIZE) {
      const batch = providerRecords.slice(offset, offset + BATCH_SIZE);

      const { data, error } = await supabase
        .from('providers')
        .upsert(batch, {
          onConflict: 'import_source,import_source_id',
          ignoreDuplicates: true,
        })
        .select('provider_id, import_source_id');

      if (error) {
        console.error(
          `  Batch insert failed (offset ${offset}): ${error.message}`
        );
        failed += batch.length;
        continue;
      }

      inserted += batch.length;
      console.log(
        `  + Batch ${Math.floor(offset / BATCH_SIZE) + 1}: inserted ${batch.length} records`
      );

      // Create food_providers extension rows
      if (data && data.length > 0) {
        const foodRows = data.map((row: { provider_id: string }) => ({
          provider_id: row.provider_id,
          no_alcohol: false,
          no_pork: false,
        }));

        const { error: foodError } = await supabase
          .from('food_providers')
          .upsert(foodRows, { onConflict: 'provider_id' });

        if (foodError) {
          console.warn(`  food_providers upsert failed: ${foodError.message}`);
        }
      }

      // Create delivery links for newly inserted providers
      if (data && data.length > 0) {
        const links: DeliveryLinkUpsert[] = data.map((row: { provider_id: string; import_source_id: string }) => ({
          provider_id: row.provider_id,
          platform: 'lieferando' as const,
          platform_url: `https://www.lieferando.de/speisekarte/${row.import_source_id}`,
          platform_slug: row.import_source_id,
          is_active: true,
          last_verified_at: new Date().toISOString(),
        }));

        const { error: linkError } = await supabase
          .from('provider_delivery_links')
          .upsert(links, { onConflict: 'provider_id,platform', ignoreDuplicates: false });

        if (linkError) {
          console.warn(`  Delivery link upsert failed: ${linkError.message}`);
        }
      }
    }

    console.log(`\n  Inserted: ${inserted}, Failed: ${failed}`);
  }

  // Upsert delivery links for existing providers
  if (existingWithLinks.length > 0) {
    console.log(`\n> Upserting ${existingWithLinks.length} delivery links for existing providers...`);

    const links: DeliveryLinkUpsert[] = existingWithLinks.map((item) => ({
      provider_id: item.existingProviderId!,
      platform: 'lieferando' as const,
      platform_url: `https://www.lieferando.de/speisekarte/${item.restaurant.slug}`,
      platform_slug: item.restaurant.slug,
      is_active: true,
      last_verified_at: new Date().toISOString(),
    }));

    for (let offset = 0; offset < links.length; offset += BATCH_SIZE) {
      const batch = links.slice(offset, offset + BATCH_SIZE);

      const { error } = await supabase
        .from('provider_delivery_links')
        .upsert(batch, { onConflict: 'provider_id,platform', ignoreDuplicates: false });

      if (error) {
        console.warn(`  Delivery link batch failed (offset ${offset}): ${error.message}`);
      } else {
        console.log(
          `  + Batch ${Math.floor(offset / BATCH_SIZE) + 1}: upserted ${batch.length} delivery links`
        );
      }
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nUnhandled error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
