/**
 * scripts/discover-lieferando.ts
 *
 * Lieferando Halal Discovery Pipeline (Plan 225)
 *
 * Sweeps German cities via Playwright browser automation against lieferando.de,
 * using the `?dietary=halal` filter to get halal-tagged restaurants directly.
 * Deduplicates against existing providers and imports new ones as pending.
 *
 * Uses Playwright (the Takeaway REST API at cw-api.takeaway.com has been
 * deprecated). The `?dietary=halal` URL parameter returns only halal-filtered
 * results from Lieferando's SPA, avoiding unreliable name-only detection.
 *
 * --- IMPORTANT OPERATIONAL NOTES ------------------------------------------------
 * - Always run with --dry-run first to inspect the discovery plan before writing.
 * - The script uses SUPABASE_SERVICE_ROLE_KEY (admin/service-role access).
 *   This bypasses RLS. Handle credentials with care.
 * - Imported rows default to review_status = 'pending' and are not publicly
 *   visible until approved via the admin moderation workflow.
 * - Requires Playwright + Chromium installed (npx playwright install chromium).
 * - Rate-limited: 2s between page loads (browser automation per city).
 *   Consider using --limit for initial runs.
 * --------------------------------------------------------------------------------
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

const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000225000002';
const IMPORT_BOT_EMAIL = 'import-bot-lieferando-discovery@system.internal';
const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 2000;
const BASE_URL = 'https://www.lieferando.de';

/**
 * Representative postal codes for each city in CITY_COORDS.
 * Lieferando resolves delivery areas from postal codes, not city names.
 * URL format: /en/delivery/food/postcode-{PLZ}
 */
const CITY_POSTAL_CODES: Record<string, string> = {
  // Major cities
  'Berlin': '10115',
  'München': '80331',
  'Frankfurt am Main': '60311',
  'Stuttgart': '70173',
  'Köln': '50667',
  'Mannheim': '68161',
  'Augsburg': '86150',
  'Hamburg': '20095',
  'Dortmund': '44135',
  'Nürnberg': '90402',
  'Düsseldorf': '40213',
  'Bielefeld': '33602',
  'Kassel': '34117',
  'Offenbach am Main': '63065',
  'Bochum': '44787',
  'Wiesbaden': '65183',
  'Bremen': '28195',
  'Hanau': '63450',
  'Darmstadt': '64283',
  'Paderborn': '33098',
  'Germering': '82110',
  'Essen': '45127',
  'Duisburg': '47051',
  'Böblingen': '71032',
  // Medium cities
  'Hannover': '30159',
  'Ingolstadt': '85049',
  'Leipzig': '04109',
  'Ludwigsburg': '71638',
  'Wuppertal': '42103',
  'Hagen': '58095',
  // Small cities
  'Recklinghausen': '45657',
  'Herford': '32049',
  'Bad Oeynhausen': '32545',
  'Schweinfurt': '97421',
  'Freising': '85354',
  'Bergisch Gladbach': '51465',
  'Hofheim am Taunus': '65719',
  'Norderstedt': '22846',
  'Schorndorf': '73614',
  'Metzingen': '72555',
  'Sulzbach (Taunus)': '65843',
  'Siegburg': '53721',
  'Reutlingen': '72764',
  'Aachen': '52062',
  'Frechen': '50226',
  'Erkelenz': '41812',
  'Baesweiler': '52499',
  'Erding': '85435',
  'Leverkusen': '51373',
  'Rostock': '18055',
  'Mönchengladbach': '41061',
  'Witten': '58452',
  'Gelsenkirchen': '45879',
  'Arnsberg': '59821',
  'Münster': '48143',
  'Dachau': '85221',
  'Aschaffenburg': '63739',
  'Langen': '63225',
  'Dreieich': '63303',
  'Uhingen': '73066',
  'Ebersbach an der Fils': '73061',
  'Kirchheim unter Teck': '73230',
  'Leinfelden': '70771',
  'Pforzheim': '75172',
  'Gröbenzell': '82194',
  'Herne': '44623',
  'Datteln': '45711',
  'Kerpen': '50169',
  'Oberhaching': '82041',
  'Ottobrunn': '85521',
  'Oberschleißheim': '85764',
  'Villingen': '78048',
  'Ulm': '89073',
  'Heilbronn': '74072',
  'Bonn': '53111',
  'Oldenburg': '26122',
  'Osnabrück': '49074',
  'Heidelberg': '69117',
  'Solingen': '42651',
  'Regensburg': '93047',
  'Würzburg': '97070',
  'Wolfsburg': '38440',
  'Göttingen': '37073',
  'Dresden': '01067',
  'Karlsruhe': '76131',
  'Krefeld': '47798',
  'Mainz': '55116',
  'Lübeck': '23552',
  'Erfurt': '99084',
  'Oberhausen': '46045',
  'Halle': '06108',
  'Magdeburg': '39104',
  'Freiburg': '79098',
  'Potsdam': '14467',
  'Saarbrücken': '66111',
  'Hamm': '59065',
  'Ludwigshafen': '67059',
  'Braunschweig': '38100',
  'Kiel': '24103',
  'Chemnitz': '09111',
  'Altenstadt': '86972',
  'Lauf an der Pegnitz': '91207',
  'Starnberg': '82319',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScrapedRestaurant {
  name: string;
  slug: string;
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
  halalRestaurants: number;
  newProviders: number;
  existingWithLink: number;
}

interface DiscoveredRestaurant {
  restaurant: ScrapedRestaurant;
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

function makeProviderKey(name: string, city: string | null): string {
  return `${normalizeName(name)}|${(city ?? '').toLowerCase().trim()}`;
}

interface ExistingProvider {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
}

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

// ─── Playwright scraper ───────────────────────────────────────────────────────

/**
 * Scrapes halal restaurants from Lieferando for a given city using
 * the ?dietary=halal URL filter. Returns restaurant names and slugs.
 */
async function scrapeHalalRestaurants(
  page: import('playwright').Page,
  cityName: string,
): Promise<ScrapedRestaurant[]> {
  const postalCode = CITY_POSTAL_CODES[cityName];
  if (!postalCode) {
    throw new Error(`No postal code mapped for city: ${cityName}`);
  }
  const url = `${BASE_URL}/en/delivery/food/postcode-${postalCode}?dietary=halal`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Wait for restaurant cards to render
  await page.waitForSelector('a[href*="/menu/"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const results = await page.evaluate(() => {
    const allLinks = Array.prototype.slice.call(document.querySelectorAll('a'));
    const restaurants: Array<{ name: string; slug: string }> = [];
    const seen = new Set<string>();

    allLinks.forEach((el: HTMLAnchorElement) => {
      const href = el.href || '';
      const match = href.match(/\/(?:menu|speisekarte)\/([^/?]+)/);
      if (!match) return;
      const slug = match[1];
      if (seen.has(slug)) return;
      seen.add(slug);

      const name = (el.textContent || '').trim();
      if (name.length < 3) return;

      restaurants.push({ name, slug });
    });

    return restaurants;
  });

  return results;
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
  console.log('  ' + '-'.repeat(54));
  console.log(
    '  ' +
    'City'.padEnd(30) +
    'Halal'.padStart(8) +
    'New'.padStart(8) +
    'Exists'.padStart(8)
  );
  console.log('  ' + '-'.repeat(54));

  for (const cr of cityResults) {
    console.log(
      '  ' +
      cr.city.padEnd(30) +
      String(cr.halalRestaurants).padStart(8) +
      String(cr.newProviders).padStart(8) +
      String(cr.existingWithLink).padStart(8)
    );
  }

  console.log('  ' + '-'.repeat(54));

  const totalCities = cityResults.length;
  const totalHalal = cityResults.reduce((s, c) => s + c.halalRestaurants, 0);

  console.log(`\n  Cities scanned       : ${totalCities}`);
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
  console.log(`  Filter     : ?dietary=halal (server-side)`);
  console.log(`  Cities     : ${Object.keys(CITY_COORDS).length} available\n`);

  // Initialize Supabase
  supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Load existing providers for dedup
  console.log('> Loading existing providers for deduplication...');
  const { keySet: existingKeys, keyToId: existingKeyToId } = await loadExistingProviders();
  console.log(`  + Loaded ${existingKeys.size} existing providers\n`);

  // Prepare city list (only cities with postal code mappings)
  const cityNames = Object.keys(CITY_COORDS).filter((c) => c in CITY_POSTAL_CODES);
  const citiesToScan = limit !== null ? cityNames.slice(0, limit) : cityNames;

  // Launch Playwright browser
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const cityResults: CityResult[] = [];
  const newProviders: DiscoveredRestaurant[] = [];
  const existingWithLinks: DiscoveredRestaurant[] = [];
  const seenSlugs = new Set<string>();
  let lastRequestTime = 0;

  console.log(`> Scanning ${citiesToScan.length} cities...\n`);

  try {
    for (let i = 0; i < citiesToScan.length; i++) {
      const cityName = citiesToScan[i];
      const progress = `[${i + 1}/${citiesToScan.length}]`;

      // Rate limit between cities
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < RATE_LIMIT_MS) {
        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
      }
      lastRequestTime = Date.now();

      // Fresh context per city to avoid cookie/state pollution
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();

      let restaurants: ScrapedRestaurant[];
      try {
        restaurants = await scrapeHalalRestaurants(page, cityName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ${progress} ${cityName}: scrape error - ${msg}`);
        cityResults.push({
          city: cityName,
          halalRestaurants: 0,
          newProviders: 0,
          existingWithLink: 0,
        });
        await context.close();
        continue;
      } finally {
        await page.close();
        await context.close().catch(() => {});
      }

      let newCount = 0;
      let existingCount = 0;

      for (const restaurant of restaurants) {
        // Cross-city dedup
        if (seenSlugs.has(restaurant.slug)) continue;
        seenSlugs.add(restaurant.slug);

        const key = makeProviderKey(restaurant.name, cityName);

        if (existingKeys.has(key)) {
          const providerId = existingKeyToId.get(key);
          if (providerId) {
            existingWithLinks.push({
              restaurant,
              city: cityName,
              isNew: false,
              existingProviderId: providerId,
            });
          }
          existingCount++;
        } else {
          newProviders.push({
            restaurant,
            city: cityName,
            isNew: true,
          });
          existingKeys.add(key);
          newCount++;
        }
      }

      console.log(
        `  ${progress} ${cityName}: ${restaurants.length} halal (${newCount} new, ${existingCount} existing)`
      );

      cityResults.push({
        city: cityName,
        halalRestaurants: restaurants.length,
        newProviders: newCount,
        existingWithLink: existingCount,
      });
    }
  } finally {
    await browser.close();
  }

  // Print sample new providers
  if (newProviders.length > 0) {
    console.log('\n  Sample new providers (first 10):');
    for (const item of newProviders.slice(0, 10)) {
      const r = item.restaurant;
      console.log(`    - ${r.name} (${item.city})`);
      console.log(`      ${BASE_URL}/speisekarte/${r.slug}`);
    }
  }

  printReport(cityResults, newProviders.length, existingWithLinks.length, isDryRun);

  if (isDryRun) return;

  // ─── Write mode ─────────────────────────────────────────────────────────

  console.log('> Ensuring import-bot user exists...');
  const botOk = await ensureImportBotUser();
  if (!botOk) {
    console.error('  Cannot proceed without import-bot user. Aborting.');
    process.exit(1);
  }

  if (newProviders.length > 0) {
    console.log(`\n> Inserting ${newProviders.length} new providers in batches of ${BATCH_SIZE}...`);

    const providerRecords = newProviders.map((item) => ({
      provider_name: item.restaurant.name,
      address_city: item.city,
      address_country: 'DE',
      location_latitude: null as number | null,
      location_longitude: null as number | null,
      review_status: 'pending' as const,
      import_source: 'lieferando',
      import_source_id: item.restaurant.slug,
      import_source_url: `${BASE_URL}/speisekarte/${item.restaurant.slug}`,
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
        console.error(`  Batch insert failed (offset ${offset}): ${error.message}`);
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

      // Create delivery links
      if (data && data.length > 0) {
        const links: DeliveryLinkUpsert[] = data.map((row: { provider_id: string; import_source_id: string }) => ({
          provider_id: row.provider_id,
          platform: 'lieferando' as const,
          platform_url: `${BASE_URL}/speisekarte/${row.import_source_id}`,
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
      platform_url: `${BASE_URL}/speisekarte/${item.restaurant.slug}`,
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
