/**
 * scripts/backfill-enrichment.ts
 *
 * Backfill script to fix incomplete/broken enrichment data for existing
 * providers across all sources (JoinHalal, Wolt, Lieferando, UberEats).
 *
 * PR #385 fixed the enrichment pipeline going forward, but existing providers
 * have broken data that re-running enrichment won't fix because of the
 * additive-only gate (non-null values are skipped, even if they're garbage).
 *
 * ─── WHAT IT FIXES ──────────────────────────────────────────────────────────
 * 1. Opening hours: normalizes broken formats (JoinHalal wrapper, UberEats
 *    raw, raw Schema.org arrays) to the canonical OpeningHours type.
 * 2. Locations: creates primary location rows for providers that have
 *    address/coordinate data on the providers table but no locations row.
 * 3. Categories: re-fetches JoinHalal pages to extract servesCuisine and
 *    map to category_id for providers with NULL category_id.
 * 4. Menus: identifies providers with names-only menus and flags them for
 *    delivery menu re-enrichment.
 *
 * ─── SAFETY ─────────────────────────────────────────────────────────────────
 * - Default mode is dry-run (never writes accidentally)
 * - Idempotent: safe to run multiple times
 * - Does NOT use admin_update_provider RPC for locations (avoids DELETE)
 * - Direct table upserts on the locations table instead
 *
 * Usage:
 *   npx tsx scripts/backfill-enrichment.ts
 *   npx tsx scripts/backfill-enrichment.ts --mode dry-run --source joinhalal --limit 10
 *   npx tsx scripts/backfill-enrichment.ts --mode write --source all
 *   npx tsx scripts/backfill-enrichment.ts --mode write --provider-id <uuid>
 *
 * Options:
 *   --mode <dry-run|write>   Execution mode (default: dry-run)
 *   --source <name|all>      Provider source to backfill (default: all)
 *   --limit <number>         Max providers per source (default: no limit).
 *                            When --source all, limit applies per source, not total.
 *   --provider-id <uuid>     Backfill a single provider by ID
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { normalizeOpeningHours } from '../src/utils/normalize-opening-hours';
import {
  isOpeningHoursBroken,
  normalizeUberEatsHours,
  needsLocationBackfill,
  isMenuNamesOnly,
} from '../src/utils/backfill-helpers';
import { extractSchemaOrgFromHtml, extractEnrichmentData } from '../src/utils/joinhalal-parser';
import {
  mapCuisineToCategory,
  type CategoryRow,
} from '../src/lib/enrichment/cuisine-category-mapper';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error(
    '  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
  );
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_DELAY_MS = 500; // Respectful delay for re-fetching pages
const USER_AGENT = 'UFlow-Backfill/1.0 (+https://ummahflow.com/backfill)';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

type RunMode = 'dry-run' | 'write';

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const modeArg = getArgValue('--mode') ?? 'dry-run';
if (!['dry-run', 'write'].includes(modeArg)) {
  console.error(`Invalid mode: ${modeArg}. Must be one of: dry-run, write`);
  process.exit(1);
}
const mode: RunMode = modeArg as RunMode;
const isDryRun = mode === 'dry-run';

const sourceArg = getArgValue('--source') ?? 'all';
const validSources = ['joinhalal', 'wolt', 'lieferando', 'ubereats', 'all'];
if (!validSources.includes(sourceArg)) {
  console.error(`Invalid source: ${sourceArg}. Must be one of: ${validSources.join(', ')}`);
  process.exit(1);
}

const limitArg = getArgValue('--limit');
if (limitArg !== undefined && isNaN(parseInt(limitArg, 10))) {
  console.error(`Invalid --limit value: "${limitArg}". Must be a positive integer.`);
  process.exit(1);
}
const limit: number | undefined = limitArg !== undefined ? parseInt(limitArg, 10) : undefined;

const providerIdFilter = getArgValue('--provider-id') ?? null;

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderRow {
  provider_id: string;
  provider_name: string;
  import_source: string | null;
  import_source_url: string | null;
  opening_hours: unknown;
  location_latitude: number | null;
  location_longitude: number | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  category_id: string | null;
  contact_phone: string | null;
  show_address: boolean | null;
}

interface LocationRow {
  location_id: string;
  provider_id: string;
  is_primary: boolean;
}

interface MenuRow {
  provider_id: string;
  name_de: string | null;
  price_cents: number | null;
  description_de: string | null;
  category: string | null;
}

interface BackfillStats {
  providersScanned: number;
  hoursFixed: number;
  hoursSkipped: number;
  locationsFixed: number;
  locationsSkipped: number;
  categoriesFixed: number;
  categoriesSkipped: number;
  categoryFetchFailed: number;
  menusNamesOnly: number;
  menusAlreadyRich: number;
  errors: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeLabel = isDryRun ? 'DRY-RUN (preview only)' : 'WRITE (modifying data)';
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Enrichment Backfill`);
  console.log(`  Mode:        ${modeLabel}`);
  console.log(`  Source:      ${sourceArg}`);
  const limitLabel =
    limit !== undefined
      ? `${limit}${sourceArg === 'all' ? ' per source' : ''}`
      : 'none (all providers)';
  console.log(`  Limit:       ${limitLabel}`);
  if (providerIdFilter) {
    console.log(`  Provider ID: ${providerIdFilter}`);
  }
  console.log(`${'─'.repeat(60)}\n`);

  const stats: BackfillStats = {
    providersScanned: 0,
    hoursFixed: 0,
    hoursSkipped: 0,
    locationsFixed: 0,
    locationsSkipped: 0,
    categoriesFixed: 0,
    categoriesSkipped: 0,
    categoryFetchFailed: 0,
    menusNamesOnly: 0,
    menusAlreadyRich: 0,
    errors: 0,
  };

  // 1. Load categories catalog (needed for JoinHalal category backfill)
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('category_id, name_de, name_en');
  if (categoriesError) {
    console.error(`Failed to load categories: ${categoriesError.message}`);
    process.exit(1);
  }
  const categories: CategoryRow[] = categoriesData ?? [];
  console.log(`  Loaded ${categories.length} categories from catalog`);

  // 2. Fetch providers that need backfill
  const providers = await fetchProvidersNeedingBackfill();
  console.log(`  Found ${providers.length} provider(s) to check\n`);

  if (providers.length === 0) {
    console.log('  Nothing to backfill.');
    return;
  }

  // 3. Batch-load existing primary locations
  const locationMap = await loadPrimaryLocations(providers.map((p) => p.provider_id));

  // 4. Batch-load existing menu items
  const menuMap = await loadMenuItems(providers.map((p) => p.provider_id));

  // 5. Process each provider
  for (const provider of providers) {
    stats.providersScanned++;
    const fixes: string[] = [];

    try {
      // ── Fix 1: Opening hours ──────────────────────────────────────
      if (isOpeningHoursBroken(provider.opening_hours)) {
        const fixed = fixOpeningHours(provider);
        if (fixed !== null) {
          if (!isDryRun) {
            await updateOpeningHours(
              provider.provider_id,
              fixed,
              locationMap.get(provider.provider_id)?.location_id ?? null,
            );
          }
          fixes.push('hours normalized');
          stats.hoursFixed++;
        } else {
          fixes.push('hours: could not normalize');
          stats.hoursSkipped++;
        }
      }

      // ── Fix 2: Missing primary location ───────────────────────────
      const existingLocation = locationMap.get(provider.provider_id);
      const hasPrimaryLocation = existingLocation?.is_primary ?? false;

      if (
        needsLocationBackfill(
          {
            location_latitude: provider.location_latitude,
            location_longitude: provider.location_longitude,
            address_street: provider.address_street,
            address_city: provider.address_city,
          },
          hasPrimaryLocation,
        )
      ) {
        if (!isDryRun) {
          await createPrimaryLocation(provider);
        }
        fixes.push('location created/updated');
        stats.locationsFixed++;
      } else {
        stats.locationsSkipped++;
      }

      // ── Fix 3: Category mapping (JoinHalal only) ─────────────────
      if (
        provider.category_id === null &&
        provider.import_source === 'joinhalal' &&
        provider.import_source_url
      ) {
        const categoryResult = await backfillCategory(provider, categories);
        if (categoryResult === 'fixed') {
          fixes.push('category mapped');
          stats.categoriesFixed++;
        } else if (categoryResult === 'no-match') {
          fixes.push('category: no cuisine match');
          stats.categoriesSkipped++;
        } else {
          fixes.push('category: fetch failed');
          stats.categoryFetchFailed++;
        }
      }

      // ── Fix 4: Identify names-only menus ──────────────────────────
      const menuItems = menuMap.get(provider.provider_id) ?? [];
      if (menuItems.length > 0) {
        if (isMenuNamesOnly(menuItems)) {
          fixes.push(`menu: ${menuItems.length} items, names-only (needs delivery enrichment)`);
          stats.menusNamesOnly++;
        } else {
          stats.menusAlreadyRich++;
        }
      }

      // ── Log result ────────────────────────────────────────────────
      if (fixes.length > 0) {
        console.log(`  ${provider.provider_name}`);
        for (const fix of fixes) {
          console.log(`    ${isDryRun ? 'would fix' : 'fixed'}: ${fix}`);
        }
      } else {
        console.log(`  ${provider.provider_name} ... no changes needed`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ${provider.provider_name} ... ERROR: ${msg}`);
      stats.errors++;
    }
  }

  // 6. Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Backfill Summary`);
  console.log(`     Providers scanned:    ${stats.providersScanned}`);
  console.log(`     Hours fixed:          ${stats.hoursFixed}`);
  console.log(`     Hours skipped:        ${stats.hoursSkipped}`);
  console.log(`     Locations fixed:      ${stats.locationsFixed}`);
  console.log(`     Locations skipped:    ${stats.locationsSkipped}`);
  console.log(`     Categories fixed:     ${stats.categoriesFixed}`);
  console.log(`     Categories skipped:   ${stats.categoriesSkipped}`);
  console.log(`     Category fetch failed:${stats.categoryFetchFailed}`);
  console.log(`     Menus names-only:     ${stats.menusNamesOnly}`);
  console.log(`     Menus already rich:   ${stats.menusAlreadyRich}`);
  console.log(`     Errors:               ${stats.errors}`);
  console.log(`${'─'.repeat(60)}`);

  if (isDryRun) {
    console.log(`\n  Dry-run complete. Use --mode write to apply changes.`);
  } else {
    console.log(`\n  Backfill complete.`);
  }

  if (stats.errors > 0) {
    console.error(`\n  Exiting with code 1 due to ${stats.errors} error(s).`);
  }

  // 7. Log names-only menu providers for easy follow-up
  const namesOnlyProviders = providers.filter((p) => {
    const items = menuMap.get(p.provider_id) ?? [];
    return items.length > 0 && isMenuNamesOnly(items);
  });

  if (namesOnlyProviders.length > 0) {
    console.log(`\n  Providers with names-only menus (run enrich-delivery-menus.ts for these):`);
    for (const p of namesOnlyProviders) {
      console.log(`    - ${p.provider_name} (${p.provider_id})`);
    }
  }

  if (stats.errors > 0) {
    process.exit(1);
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

async function fetchProvidersNeedingBackfill(): Promise<ProviderRow[]> {
  const selectFields =
    'provider_id, provider_name, import_source, import_source_url, opening_hours, location_latitude, location_longitude, address_street, address_zip, address_city, address_country, category_id, contact_phone, show_address';

  // Single provider mode
  if (providerIdFilter) {
    const { data, error } = await supabase
      .from('providers')
      .select(selectFields)
      .eq('provider_id', providerIdFilter);
    if (error) {
      console.error(`Failed to fetch provider: ${error.message}`);
      process.exit(1);
    }
    return (data ?? []) as ProviderRow[];
  }

  // Build source filter
  const sources =
    sourceArg === 'all' ? ['joinhalal', 'wolt', 'lieferando', 'ubereats'] : [sourceArg];

  const allProviders: ProviderRow[] = [];

  for (const src of sources) {
    let query = supabase.from('providers').select(selectFields).eq('import_source', src);

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Failed to fetch providers for ${src}: ${error.message}`);
      continue;
    }
    allProviders.push(...((data ?? []) as ProviderRow[]));
  }

  return allProviders;
}

async function loadPrimaryLocations(providerIds: string[]): Promise<Map<string, LocationRow>> {
  const map = new Map<string, LocationRow>();
  if (providerIds.length === 0) return map;

  // Chunk to avoid URL length limits
  const CHUNK_SIZE = 50;
  for (let i = 0; i < providerIds.length; i += CHUNK_SIZE) {
    const chunk = providerIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('locations')
      .select('location_id, provider_id, is_primary')
      .in('provider_id', chunk)
      .eq('is_primary', true);

    if (error) {
      console.warn(`  Warning: failed to load locations for chunk: ${error.message}`);
      continue;
    }

    for (const row of data ?? []) {
      map.set(row.provider_id, row as LocationRow);
    }
  }

  return map;
}

async function loadMenuItems(providerIds: string[]): Promise<Map<string, MenuRow[]>> {
  const map = new Map<string, MenuRow[]>();
  if (providerIds.length === 0) return map;

  const CHUNK_SIZE = 50;
  for (let i = 0; i < providerIds.length; i += CHUNK_SIZE) {
    const chunk = providerIds.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('food_menu')
      .select('provider_id, name_de, price_cents, description_de, category')
      .in('provider_id', chunk)
      .limit(10000);

    if (error) {
      console.warn(`  Warning: failed to load menu items for chunk: ${error.message}`);
      continue;
    }

    for (const row of data ?? []) {
      const pid = row.provider_id as string;
      const existing = map.get(pid) ?? [];
      existing.push(row as MenuRow);
      map.set(pid, existing);
    }
  }

  return map;
}

// ─── Fix functions ────────────────────────────────────────────────────────────

/**
 * Attempts to normalize broken opening_hours to the canonical OpeningHours format.
 * Tries multiple strategies:
 * 1. normalizeOpeningHours (handles JoinHalal wrapper, Schema.org spec, shorthand)
 * 2. normalizeUberEatsHours (handles UberEats proprietary format)
 */
function fixOpeningHours(provider: ProviderRow): Record<string, unknown> | null {
  const raw = provider.opening_hours;

  // Try the generic normalizer first (handles JoinHalal wrapper, Schema.org)
  const normalized = normalizeOpeningHours(raw);
  if (normalized) return normalized;

  // Try UberEats-specific normalizer
  const uberNormalized = normalizeUberEatsHours(raw);
  if (uberNormalized) return uberNormalized;

  return null;
}

/**
 * Updates opening_hours on both the providers table and the primary location.
 */
async function updateOpeningHours(
  providerId: string,
  normalizedHours: Record<string, unknown>,
  primaryLocationId: string | null,
): Promise<void> {
  // Update providers table
  const { error: provError } = await supabase
    .from('providers')
    .update({ opening_hours: normalizedHours })
    .eq('provider_id', providerId);

  if (provError) {
    throw new Error(`Failed to update provider hours: ${provError.message}`);
  }

  // Update primary location if it exists
  if (primaryLocationId) {
    const { error: locError } = await supabase
      .from('locations')
      .update({ opening_hours: normalizedHours })
      .eq('location_id', primaryLocationId);

    if (locError) {
      throw new Error(`Failed to update location hours: ${locError.message}`);
    }
  }
}

/**
 * Creates or updates a primary location row from provider address/coordinate data.
 * Uses direct INSERT/UPDATE (not the admin_update_provider RPC) to avoid the
 * destructive DELETE behavior.
 *
 * If a primary location already exists, updates it with the current provider data
 * to fix stale addresses/coordinates. If none exists, inserts a new one.
 */
async function createPrimaryLocation(provider: ProviderRow): Promise<void> {
  const locationData = {
    address_street: provider.address_street,
    address_zip: provider.address_zip,
    address_city: provider.address_city,
    address_country: provider.address_country ?? 'DE',
    location_latitude: provider.location_latitude,
    location_longitude: provider.location_longitude,
    opening_hours: isOpeningHoursBroken(provider.opening_hours)
      ? fixOpeningHours(provider)
      : provider.opening_hours,
    show_address: provider.show_address ?? true,
    contact_phone: provider.contact_phone,
  };

  // Check if a primary location already exists
  const { data: existing, error: selectError } = await supabase
    .from('locations')
    .select('location_id')
    .eq('provider_id', provider.provider_id)
    .eq('is_primary', true)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to check existing location: ${selectError.message}`);
  }

  if (existing) {
    // Update existing primary location with current provider data
    const { error: updateError } = await supabase
      .from('locations')
      .update(locationData)
      .eq('location_id', existing.location_id);

    if (updateError) {
      throw new Error(`Failed to update location: ${updateError.message}`);
    }
  } else {
    // Insert new primary location
    const { error: insertError } = await supabase.from('locations').insert({
      provider_id: provider.provider_id,
      ...locationData,
      is_primary: true,
    });

    if (insertError) {
      throw new Error(`Failed to create location: ${insertError.message}`);
    }
  }
}

/**
 * Re-fetches a JoinHalal page to extract servesCuisine and map to category_id.
 * Returns 'fixed', 'no-match', or 'fetch-failed'.
 */
async function backfillCategory(
  provider: ProviderRow,
  categories: CategoryRow[],
): Promise<'fixed' | 'no-match' | 'fetch-failed'> {
  const url = provider.import_source_url;
  if (!url) return 'fetch-failed';

  try {
    // Respectful delay before fetching
    await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return 'fetch-failed';
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const schema = extractSchemaOrgFromHtml(html);
    if (!schema) return 'fetch-failed';

    const enrichment = extractEnrichmentData(schema);
    if (!enrichment.servesCuisine) return 'no-match';

    const categoryId = mapCuisineToCategory(enrichment.servesCuisine, categories);
    if (!categoryId) return 'no-match';

    if (!isDryRun) {
      const { error } = await supabase
        .from('providers')
        .update({ category_id: categoryId })
        .eq('provider_id', provider.provider_id);

      if (error) {
        throw new Error(`Failed to update category: ${error.message}`);
      }
    }

    return 'fixed';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    category fetch error: ${msg}`);
    return 'fetch-failed';
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
