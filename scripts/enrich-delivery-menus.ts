/**
 * Enrich food providers with delivery-platform menu items (halal compliance input).
 *
 * Per provider the script walks MENU_CASCADE_ORDER and stops at the first
 * platform that returns at least one menu item. One menu is enough for
 * detectAlcohol() / detectPork(), so later platforms are never paid for.
 * A platform that returns zero items is recorded and the cascade moves on.
 *
 * All three platforms run through Apify (APIFY_API_TOKEN required) and take ONE
 * restaurant URL; nothing is searched by area or postal code:
 *
 *   wolt        teodor_banea/wolt-restaurant-menu-scraper
 *               input { mode: 'venueUrls', venueUrls: [{ url }], language: 'de' }
 *   lieferando  apify/web-scraper with a custom page function
 *               input { startUrls: [{ url: 'https://www.lieferando.de/speisekarte/<slug>' }],
 *                       pageFunction, linkSelector: '', maxPagesPerCrawl: 1,
 *                       proxyConfiguration: residential, country DE }
 *               page function: finds menu categories (heading + items) in the DOM and
 *               returns { url, menuCategories: [{ name, items: [{ name, description,
 *               priceCents }] }] }. Same extraction as the former Playwright client, run on
 *               Apify with proxy rotation. Source: apify-lieferando-page-function.ts
 *   ubereats    memo23/uber-eats-scraper
 *               input { startUrls: [{ url }], maxItems: 1, maxReviews: 0 }
 *               output: one store row with menuItems[] { name, description, section, price }
 *
 * Flags:
 *   --platform wolt|lieferando|ubereats  bypass the cascade, call only that platform
 *   --provider-id <id>   one provider (also re-checks platforms already checked)
 *   --limit <n>          first n delivery links
 *   --force              re-check platforms already checked via Apify
 *   --dry-run            fetch and preview, write nothing
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchWoltRestaurant,
  type ApifyWoltResult,
} from '../src/lib/enrichment/delivery-platform/apify-wolt-client';
import {
  fetchLieferandoMenu,
  type MenuItemRow,
} from '../src/lib/enrichment/delivery-platform/apify-lieferando-client';
import { fetchUberEatsMenu } from '../src/lib/enrichment/delivery-platform/apify-ubereats-client';

export type Platform = 'wolt' | 'lieferando' | 'ubereats';

/** Order in which platforms are tried per provider; first one with items wins. */
export const MENU_CASCADE_ORDER: readonly Platform[] = ['wolt', 'lieferando', 'ubereats'];

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

let supabase: SupabaseClient;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const limitArg = getArgValue('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const providerIdFilter = getArgValue('--provider-id');

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

export function parsePlatformFlag(value: string | undefined): Platform | undefined {
  if (value === undefined) return undefined;
  if (!(MENU_CASCADE_ORDER as readonly string[]).includes(value)) {
    throw new Error(`Invalid --platform "${value}". Use wolt|lieferando|ubereats.`);
  }
  return value as Platform;
}

export interface DeliveryLinkRow {
  provider_id: string;
  provider_name: string;
  platform: Platform;
  platform_url: string;
  platform_slug: string | null;
  apify_checked_at: string | null;
}

export interface FetchedMenu {
  menuItems: MenuItemRow[];
  /** Set for Wolt only; carries hours/contact/address written alongside the menu. */
  wolt?: ApifyWoltResult;
}

export interface CascadeAttempt {
  platform: Platform;
  itemCount: number;
  error?: string;
}

export interface CascadeResult {
  winner: { link: DeliveryLinkRow; menu: FetchedMenu } | null;
  attempts: CascadeAttempt[];
  /** Platforms with a link that were never called because an earlier one returned items. */
  cascadeSkipped: Platform[];
  forcedPlatform?: Platform;
}

/**
 * Tries a provider's platform links in cascade order and stops at the first
 * one that returns items. With forcedPlatform, only that platform is called.
 * A thrown error counts as zero items for that platform; the cascade continues.
 */
export async function runMenuCascade(opts: {
  links: DeliveryLinkRow[];
  fetchMenu: (link: DeliveryLinkRow) => Promise<FetchedMenu>;
  forcedPlatform?: Platform;
}): Promise<CascadeResult> {
  const { links, fetchMenu, forcedPlatform } = opts;
  const order = forcedPlatform ? [forcedPlatform] : MENU_CASCADE_ORDER;
  const candidates = order
    .map((platform) => links.find((l) => l.platform === platform))
    .filter((l): l is DeliveryLinkRow => l !== undefined);

  const attempts: CascadeAttempt[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const link = candidates[i];
    try {
      const menu = await fetchMenu(link);
      attempts.push({ platform: link.platform, itemCount: menu.menuItems.length });
      if (menu.menuItems.length > 0) {
        return {
          winner: { link, menu },
          attempts,
          cascadeSkipped: candidates.slice(i + 1).map((l) => l.platform),
          forcedPlatform,
        };
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      attempts.push({ platform: link.platform, itemCount: 0, error });
    }
  }

  return { winner: null, attempts, cascadeSkipped: [], forcedPlatform };
}

export function formatCascadeLogLine(
  providerName: string,
  result: CascadeResult,
  alreadyChecked: Platform[] = [],
): string {
  const tried = result.attempts.length
    ? result.attempts
        .map((a) =>
          a.error ? `${a.platform} (error: ${a.error})` : `${a.platform} (${a.itemCount} items)`,
        )
        .join(', ')
    : 'none';
  const parts = [`${providerName}: tried: ${tried}`];
  if (result.cascadeSkipped.length) {
    parts.push(`skipped (cascade): ${result.cascadeSkipped.join(', ')}`);
  }
  if (alreadyChecked.length) {
    parts.push(`skipped (already checked): ${alreadyChecked.join(', ')}`);
  }
  if (result.forcedPlatform) parts.push(`forced: ${result.forcedPlatform}`);
  return `  ${parts.join(' | ')}`;
}

interface RunStats {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  menuItemsWritten: number;
  openingHoursWritten: number;
  contactFieldsWritten: number;
  addressFieldsWritten: number;
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables.');
    console.error(
      '  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    );
    process.exit(1);
  }
  supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let forcedPlatform: Platform | undefined;
  try {
    forcedPlatform = parsePlatformFlag(getArgValue('--platform'));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  const modeLabel = isDryRun ? 'DRY RUN (preview only)' : 'WRITE';
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Delivery Menu Enrichment`);
  console.log(`  Mode: ${modeLabel}`);
  console.log(`${'─'.repeat(50)}\n`);

  let linksQuery = supabase
    .from('provider_delivery_links')
    .select(
      `
      provider_id,
      platform,
      platform_url,
      platform_slug,
      apify_checked_at,
      providers!inner (
        provider_name,
        listing_type
      )
    `,
    )
    .eq('is_active', true)
    .eq('providers.listing_type', 'food');

  // Apply --provider-id filter when supplied (Fix 239-4)
  if (providerIdFilter) {
    linksQuery = linksQuery.eq('provider_id', providerIdFilter);
    console.log(`  Filtering to provider: ${providerIdFilter}`);
  }

  const { data: rows, error: linksError } = await linksQuery;

  if (linksError) {
    console.error(`Failed to fetch delivery links: ${linksError.message}`);
    process.exit(1);
  }

  const links: DeliveryLinkRow[] = (rows ?? [])
    .map((r: Record<string, unknown>) => {
      const prov = r.providers as Record<string, unknown>;
      return {
        provider_id: r.provider_id as string,
        provider_name: prov.provider_name as string,
        platform: r.platform as Platform,
        platform_url: r.platform_url as string,
        platform_slug: (r.platform_slug as string) ?? null,
        apify_checked_at: (r.apify_checked_at as string) ?? null,
      };
    })
    .sort((a, b) => a.provider_name.localeCompare(b.provider_name));

  if (!APIFY_API_TOKEN && links.length > 0) {
    console.error('APIFY_API_TOKEN is required for menu enrichment but not set in .env.local');
    process.exit(1);
  }

  const applyLimit = limit ?? links.length;
  const batch = links.slice(0, applyLimit);
  const stats: RunStats = {
    total: batch.length,
    processed: 0,
    skipped: 0,
    failed: 0,
    menuItemsWritten: 0,
    openingHoursWritten: 0,
    contactFieldsWritten: 0,
    addressFieldsWritten: 0,
  };

  console.log(`  Found ${links.length} active delivery link(s) for food providers`);
  if (limit) {
    console.log(`  Processing first ${limit}\n`);
  } else {
    console.log('');
  }

  // -----------------------------------------------------------------------
  // Phase 1: Pre-check all providers for existing menus + opening hours
  // -----------------------------------------------------------------------

  const providerIds = Array.from(new Set(batch.map((l) => l.provider_id)));

  // -----------------------------------------------------------------------
  // Batch-query existing state (menu counts + opening hours)
  // Chunk the provider IDs to avoid Supabase REST API URL limits.
  // If batch query fails, fall back to sequential lookups (slower but safe).
  // -----------------------------------------------------------------------

  const CHUNK_SIZE = 50;
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  async function buildMenuCountMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const chunk of chunkArray(providerIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('food_menu')
        .select('provider_id')
        .in('provider_id', chunk);
      if (error) {
        console.warn(
          `  Batch menu query failed for ${
            chunk.length
          } IDs (${error.message}), falling back to sequential`,
        );
        // Fallback: query one by one
        for (const pid of chunk) {
          const { count } = await supabase
            .from('food_menu')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', pid);
          map.set(pid, count ?? 0);
        }
      } else {
        for (const row of data ?? []) {
          const pid = row.provider_id as string;
          map.set(pid, (map.get(pid) ?? 0) + 1);
        }
      }
    }
    return map;
  }

  async function buildHasHoursMap(): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    for (const chunk of chunkArray(providerIds, CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('providers')
        .select('provider_id, opening_hours')
        .in('provider_id', chunk);
      if (error) {
        console.warn(
          `  Batch hours query failed for ${
            chunk.length
          } IDs (${error.message}), falling back to sequential`,
        );
        for (const pid of chunk) {
          const { data: row } = await supabase
            .from('providers')
            .select('opening_hours')
            .eq('provider_id', pid)
            .single();
          map.set(pid, (row as Record<string, unknown> | null)?.opening_hours != null);
        }
      } else {
        for (const row of data ?? []) {
          map.set(row.provider_id as string, (row.opening_hours as unknown) != null);
        }
      }
    }
    return map;
  }

  const [menuCountMap, hasHoursMap] = await Promise.all([buildMenuCountMap(), buildHasHoursMap()]);

  // -----------------------------------------------------------------------
  // Group links by provider and drop platforms that need no work
  // -----------------------------------------------------------------------

  interface ProviderTask {
    providerId: string;
    providerName: string;
    candidates: DeliveryLinkRow[];
    alreadyChecked: Platform[];
    fetchHours: boolean;
  }

  const byProvider = new Map<string, DeliveryLinkRow[]>();
  for (const link of batch) {
    byProvider.set(link.provider_id, [...(byProvider.get(link.provider_id) ?? []), link]);
  }

  const tasks: ProviderTask[] = [];
  let immediateSkipped = 0;

  for (const [providerId, providerLinks] of Array.from(byProvider)) {
    const providerName = providerLinks[0].provider_name;
    const hasMenus = (menuCountMap.get(providerId) ?? 0) > 0;
    const candidates: DeliveryLinkRow[] = [];
    const alreadyChecked: Platform[] = [];

    for (const link of providerLinks) {
      // Wolt data (prices, categories) is richer than existing joinhalal menus, so Wolt
      // is only skipped once checked; other platforms are skipped when any menu exists.
      const checked = link.apify_checked_at && !isForce && !providerIdFilter;
      if (checked || (link.platform !== 'wolt' && hasMenus)) {
        alreadyChecked.push(link.platform);
      } else {
        candidates.push(link);
      }
    }

    if (candidates.length === 0) {
      console.log(
        `  ${providerName}: tried: none | skipped (already checked): ${alreadyChecked.join(', ')}`,
      );
      immediateSkipped++;
      continue;
    }

    tasks.push({
      providerId,
      providerName,
      candidates,
      alreadyChecked,
      fetchHours: !(hasHoursMap.get(providerId) ?? false),
    });
  }

  stats.total = byProvider.size;
  stats.skipped += immediateSkipped;

  console.log(
    `\n  Pre-check: ${byProvider.size} providers → ${immediateSkipped} skipped, ${tasks.length} to fetch` +
      `${forcedPlatform ? ` (forced platform: ${forcedPlatform})` : ` (cascade: ${MENU_CASCADE_ORDER.join(' → ')})`}\n`,
  );

  // -----------------------------------------------------------------------
  // Fetch menus per provider via the cascade, concurrently (Apify calls are slow)
  // -----------------------------------------------------------------------

  const CONCURRENCY = 5;

  async function fetchMenu(link: DeliveryLinkRow): Promise<FetchedMenu> {
    switch (link.platform) {
      case 'wolt': {
        const result = await fetchWoltRestaurant(link.platform_url, APIFY_API_TOKEN!);
        return result ? { menuItems: result.menuItems, wolt: result } : { menuItems: [] };
      }
      case 'lieferando':
        return { menuItems: await fetchLieferandoMenu(link.platform_url, APIFY_API_TOKEN!) };
      case 'ubereats':
        return { menuItems: await fetchUberEatsMenu(link.platform_url, APIFY_API_TOKEN!) };
    }
  }

  async function processTask(task: ProviderTask): Promise<void> {
    const { providerId, providerName, candidates, alreadyChecked, fetchHours } = task;

    try {
      const result = await runMenuCascade({ links: candidates, fetchMenu, forcedPlatform });
      console.log(formatCascadeLogLine(providerName, result, alreadyChecked));

      // Zero items without an error is a final answer for that platform; errors are retried
      for (const attempt of result.attempts) {
        if (attempt.itemCount === 0 && !attempt.error) {
          const link = candidates.find((l) => l.platform === attempt.platform);
          if (link) await markApifyChecked(link);
        }
      }

      if (!result.winner) {
        if (result.attempts.length > 0 && result.attempts.every((a) => a.error)) stats.failed++;
        else stats.skipped++;
        return;
      }

      const { link, menu } = result.winner;
      const hoursToWrite =
        link.platform === 'wolt' && fetchHours && menu.wolt?.openingHours
          ? (menu.wolt.openingHours as unknown as Record<string, unknown>)
          : null;

      const written = await writeResult(
        link,
        menu.menuItems,
        hoursToWrite,
        isDryRun,
        stats,
        `    ↳ ${providerName} (${link.platform})`,
      );

      // Write phone/website/address from Apify Wolt (additive only) — Fix 239-2
      if (!isDryRun && menu.wolt) {
        await writeApifyContactFields(providerId, menu.wolt, stats);
        await writeApifyAddressFields(providerId, menu.wolt, stats);
      }

      // Mark only after the writes, so a failed write is retried next run
      if (written) await markApifyChecked(link);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${providerName}: failed: ${msg}`);
      stats.failed++;
    }
  }

  let nextTask = 0;
  async function worker(): Promise<void> {
    while (nextTask < tasks.length) {
      await processTask(tasks[nextTask++]);
    }
  }
  await Promise.allSettled(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Summary`);
  console.log(`     Total:                  ${stats.total}`);
  console.log(`     Processed:              ${stats.processed}`);
  console.log(`     Skipped:                ${stats.skipped}`);
  console.log(`     Failed:                 ${stats.failed}`);
  console.log(`     Menu items written:     ${stats.menuItemsWritten}`);
  console.log(`     Opening hours written:  ${stats.openingHoursWritten}`);
  if (stats.contactFieldsWritten > 0) {
    console.log(`     Contact fields written: ${stats.contactFieldsWritten}`);
  }
  if (stats.addressFieldsWritten > 0) {
    console.log(`     Address fields written: ${stats.addressFieldsWritten}`);
  }
  console.log(`${'─'.repeat(50)}`);

  if (isDryRun) {
    console.log(`\n  Dry-run complete. Re-run without --dry-run to write.`);
  }
}

// Records that Apify was called for this link so later runs skip it (not in dry-run).
async function markApifyChecked(link: DeliveryLinkRow): Promise<void> {
  if (isDryRun) return;
  const { error } = await supabase
    .from('provider_delivery_links')
    .update({ apify_checked_at: new Date().toISOString() })
    .eq('provider_id', link.provider_id)
    .eq('platform', link.platform);
  if (error) {
    console.error(
      `     ⚠️  apify_checked_at write failed for ${link.provider_id}: ${error.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: write menu items and/or opening hours to the database
// ---------------------------------------------------------------------------
async function writeResult(
  link: DeliveryLinkRow,
  menuItems: Array<{
    name_de: string;
    description_de: string | null;
    category: string | null;
    price_cents: number | null;
    is_available: boolean;
    sort_order: number;
  }>,
  openingHoursToWrite: Record<string, unknown> | null,
  isDryRun: boolean,
  stats: RunStats,
  label: string,
): Promise<boolean> {
  const hasMenus = menuItems.length > 0;

  if (isDryRun) {
    let msg = '';
    if (hasMenus) {
      msg = `would write ${menuItems.length} menu item(s)`;
      if (openingHoursToWrite) msg += ' and opening hours';
    } else {
      msg = 'opening hours only (would write)';
    }
    console.log(`${label}: ${msg}`);
    if (hasMenus) stats.menuItemsWritten += menuItems.length;
    if (openingHoursToWrite) stats.openingHoursWritten++;
    stats.processed++;
    return true;
  }

  // Build payload
  const p_data: Record<string, unknown> = {};
  if (hasMenus) {
    p_data.menu_items = menuItems;
  }
  if (openingHoursToWrite) {
    p_data.providers = { opening_hours: openingHoursToWrite };
  }

  if (Object.keys(p_data).length === 0) {
    stats.skipped++;
    return true;
  }

  const { error: rpcError } = await supabase.rpc('admin_update_provider', {
    p_provider_id: link.provider_id,
    p_data,
  });

  if (rpcError) {
    console.log(`${label}: RPC write failed: ${rpcError.message}`);
    stats.failed++;
    return false;
  }

  await supabase
    .from('provider_delivery_links')
    .update({
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_id', link.provider_id)
    .eq('platform', link.platform);

  let msg = '';
  if (hasMenus) {
    msg = `${menuItems.length} menu item(s) written`;
    if (openingHoursToWrite) msg += ' + opening hours';
  } else {
    msg = 'opening hours written';
  }
  console.log(`${label}: ${msg}`);
  if (hasMenus) stats.menuItemsWritten += menuItems.length;
  if (openingHoursToWrite) stats.openingHoursWritten++;
  stats.processed++;
  return true;
}

// ---------------------------------------------------------------------------
// Helper: write phone/website from Apify Wolt result (additive only)
// Uses direct table update — NOT the destructive admin_update_provider RPC.
// ---------------------------------------------------------------------------
async function writeApifyContactFields(
  providerId: string,
  result: ApifyWoltResult,
  stats: RunStats,
): Promise<void> {
  // Fetch current provider values to check for additive-only writes
  const { data: provider, error: fetchError } = await supabase
    .from('providers')
    .select('contact_phone, social_website')
    .eq('provider_id', providerId)
    .single();

  if (fetchError || !provider) return;

  const updates: Record<string, string> = {};

  if (result.phone && !provider.contact_phone) {
    updates.contact_phone = result.phone;
  }
  if (result.website && !provider.social_website) {
    updates.social_website = result.website;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from('providers').update(updates).eq('provider_id', providerId);

  if (error) {
    console.error(`     ⚠️  Contact field write failed for ${providerId}: ${error.message}`);
  } else {
    stats.contactFieldsWritten += Object.keys(updates).length;
  }
}

// ---------------------------------------------------------------------------
// Helper: write address fields from Apify Wolt result (additive only)
// Uses direct locations table update — NOT the destructive admin_update_provider RPC.
// ---------------------------------------------------------------------------
async function writeApifyAddressFields(
  providerId: string,
  result: ApifyWoltResult,
  stats: RunStats,
): Promise<void> {
  if (!result.address && !result.postCode && !result.city) return;

  // Find the primary location for this provider
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('location_id, address_street, address_zip, address_city')
    .eq('provider_id', providerId)
    .eq('is_primary', true)
    .limit(1)
    .single();

  if (locError && locError.code !== 'PGRST116') return; // unexpected error (not "no rows")

  if (!location) {
    // No primary location exists — create one if we have data
    const newLoc: Record<string, unknown> = {
      provider_id: providerId,
      is_primary: true,
      show_address: true,
      address_country: 'DE',
    };
    if (result.address) newLoc.address_street = result.address;
    if (result.postCode) newLoc.address_zip = result.postCode;
    if (result.city) newLoc.address_city = result.city;

    const { error: insertError } = await supabase.from('locations').insert(newLoc);
    if (insertError) {
      console.error(`     ⚠️  Location create failed for ${providerId}: ${insertError.message}`);
    } else {
      const fieldCount = [result.address, result.postCode, result.city].filter(Boolean).length;
      stats.addressFieldsWritten += fieldCount;
      console.log(`     + created primary location for ${providerId}`);
    }
    return;
  }

  // Only write if current values are empty (additive)
  const updates: Record<string, string> = {};

  if (result.address && !location.address_street) {
    updates.address_street = result.address;
  }
  if (result.postCode && !location.address_zip) {
    updates.address_zip = result.postCode;
  }
  if (result.city && !location.address_city) {
    updates.address_city = result.city;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('locations')
    .update(updates)
    .eq('location_id', location.location_id);

  if (error) {
    console.error(`     ⚠️  Address field write failed for ${providerId}: ${error.message}`);
  } else {
    stats.addressFieldsWritten += Object.keys(updates).length;
  }
}

if (path.basename(process.argv[1] ?? '') === path.basename(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}
