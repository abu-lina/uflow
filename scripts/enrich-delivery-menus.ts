import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createLieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-client';
import { createUberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-client';
import { fetchWoltRestaurant } from '../src/lib/enrichment/delivery-platform/apify-wolt-client';
import type { LieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-types';
import type { UberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-types';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = getArgValue('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function extractSlug(url: string, platform: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.replace(/\/$/, '').split('/');

    if (platform === 'wolt') {
      const venueIdx = segments.indexOf('venue');
      if (venueIdx >= 0 && venueIdx + 1 < segments.length) {
        return segments[venueIdx + 1];
      }
    }

    return segments[segments.length - 1] || '';
  } catch {
    return '';
  }
}

interface DeliveryLinkRow {
  provider_id: string;
  provider_name: string;
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platform_url: string;
  platform_slug: string | null;
}

interface RunStats {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  menuItemsWritten: number;
  openingHoursWritten: number;
}

async function main(): Promise<void> {
  const modeLabel = isDryRun ? 'DRY RUN (preview only)' : 'WRITE';
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Delivery Menu Enrichment`);
  console.log(`  Mode: ${modeLabel}`);
  console.log(`${'─'.repeat(50)}\n`);

  const { data: rows, error: linksError } = await supabase
    .from('provider_delivery_links')
    .select(`
      provider_id,
      platform,
      platform_url,
      platform_slug,
      providers!inner (
        provider_name,
        listing_type
      )
    `)
    .eq('is_active', true)
    .eq('providers.listing_type', 'food');

  if (linksError) {
    console.error(`Failed to fetch delivery links: ${linksError.message}`);
    process.exit(1);
  }

  const links: DeliveryLinkRow[] = (rows ?? []).map((r: Record<string, unknown>) => {
    const prov = r.providers as Record<string, unknown>;
    return {
      provider_id: r.provider_id as string,
      provider_name: prov.provider_name as string,
      platform: r.platform as 'wolt' | 'lieferando' | 'ubereats',
      platform_url: r.platform_url as string,
      platform_slug: (r.platform_slug as string) ?? null,
    };
  }).sort((a, b) => a.provider_name.localeCompare(b.provider_name));

  if (!APIFY_API_TOKEN && links.some((l) => l.platform === 'wolt')) {
    console.error('APIFY_API_TOKEN is required for Wolt enrichment but not set in .env.local');
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
  };

  console.log(`  Found ${links.length} active delivery link(s) for food providers`);
  if (limit) {
    console.log(`  Processing first ${limit}\n`);
  } else {
    console.log('');
  }

  let lieferandoClient: LieferandoClient | null = null;
  let ubereatsClient: UberEatsClient | null = null;

  // -----------------------------------------------------------------------
  // Phase 1: Pre-check all providers for existing menus + opening hours
  // -----------------------------------------------------------------------

  const providerIds = [...new Set(batch.map((l) => l.provider_id))];

  // Batch-query existing menu counts
  const { data: menuCounts, error: menuCountError } = await supabase
    .from('food_menu')
    .select('provider_id')
    .in('provider_id', providerIds);

  if (menuCountError) {
    console.error(`Failed to query menu counts: ${menuCountError.message}`);
    process.exit(1);
  }

  const menuCountMap = new Map<string, number>();
  for (const row of menuCounts ?? []) {
    const pid = row.provider_id as string;
    menuCountMap.set(pid, (menuCountMap.get(pid) ?? 0) + 1);
  }

  // Batch-query existing opening hours
  const { data: existingHours } = await supabase
    .from('providers')
    .select('provider_id, opening_hours')
    .in('provider_id', providerIds);

  const hasHoursMap = new Map<string, boolean>();
  for (const row of existingHours ?? []) {
    hasHoursMap.set(row.provider_id as string, (row.opening_hours as unknown) != null);
  }

  // -----------------------------------------------------------------------
  // Prepare tasks: classify each link by what work is needed
  // -----------------------------------------------------------------------

  interface MenuTask {
    link: DeliveryLinkRow;
    fetchMenus: boolean;  // true if menu items need fetching
    fetchHours: boolean;  // true if opening hours need fetching (Wolt only)
  }

  const woltTasks: MenuTask[] = [];
  const nonWoltTasks: MenuTask[] = [];
  let immediateSkipped = 0;

  for (const link of batch) {
    const existingCount = menuCountMap.get(link.provider_id) ?? 0;
    const hasMenus = existingCount > 0;
    const hasHours = hasHoursMap.get(link.provider_id) ?? false;

    if (link.platform === 'wolt') {
      if (hasMenus && hasHours) {
        process.stdout.write(`  ${link.provider_name} (${link.platform}) ... already has ${existingCount} menu item(s) and opening hours\n`);
        immediateSkipped++;
        continue;
      }
      woltTasks.push({
        link,
        fetchMenus: !hasMenus,
        fetchHours: !hasHours,
      });
    } else {
      if (hasMenus) {
        process.stdout.write(`  ${link.provider_name} (${link.platform}) ... already has ${existingCount} menu item(s)\n`);
        immediateSkipped++;
        continue;
      }
      nonWoltTasks.push({
        link,
        fetchMenus: true,
        fetchHours: false,
      });
    }
  }

  stats.skipped += immediateSkipped;

  console.log(`\n  Pre-check: ${batch.length} links → ${immediateSkipped} skipped, ${woltTasks.length} Wolt, ${nonWoltTasks.length} non-Wolt\n`);

  // -----------------------------------------------------------------------
  // Phase 2: Process Wolt tasks concurrently (Apify calls are slow)
  // -----------------------------------------------------------------------

  const CONCURRENCY = 5;

  async function processWoltTasks(tasks: MenuTask[]): Promise<void> {
    let idx = 0;

    async function worker(): Promise<void> {
      while (idx < tasks.length) {
        const task = tasks[idx++];
        const { link, fetchMenus, fetchHours } = task;
        const prefix = `  ${link.provider_name} (${link.platform})`;

        try {
          process.stdout.write(`${prefix} ... `);

          // Apify calls are rate-limited; fetch always since we need something
          const result = await fetchWoltRestaurant(link.platform_url, APIFY_API_TOKEN!);

          if (!result) {
            console.log('not found on Wolt');
            stats.skipped++;
            continue;
          }

          const menusToWrite = result.menuItems; // always fresh from Apify (used if fetchMenus true)
          const hoursToWrite = fetchHours && result.openingHours
            ? (result.openingHours as unknown as Record<string, unknown>)
            : null;

          if (!fetchMenus && !hoursToWrite) {
            // We only needed hours and they're not available
            if (result.openingHours) {
              console.log('opening hours not available from Apify');
            } else {
              console.log('opening hours not available from Apify');
            }
            stats.skipped++;
            continue;
          }

          await writeResult(
            link,
            fetchMenus ? menusToWrite : [],
            hoursToWrite,
            isDryRun,
            stats,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`${prefix} ... Fetch failed: ${msg}`);
          stats.failed++;
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.allSettled(workers);
  }

  await processWoltTasks(woltTasks);

  // -----------------------------------------------------------------------
  // Phase 3: Process non-Wolt tasks (Lieferando, UberEats) sequentially
  // -----------------------------------------------------------------------

  for (const task of nonWoltTasks) {
    const { link } = task;
    process.stdout.write(`  ${link.provider_name} (${link.platform}) ... `);

    try {
      let menuItems: Array<{
        name_de: string;
        description_de: string | null;
        category: string | null;
        price_cents: number | null;
        is_available: boolean;
        sort_order: number;
      }> = [];

      if (link.platform === 'lieferando') {
        const slug = link.platform_slug || extractSlug(link.platform_url, link.platform);
        if (!slug) {
          console.log('no slug could be extracted from URL');
          stats.failed++;
          continue;
        }

        if (!lieferandoClient) {
          lieferandoClient = createLieferandoClient();
        }
        const data = await lieferandoClient.getRestaurantPage(slug);
        menuItems = data.menuCategories.flatMap((cat) =>
          cat.items.map((item, i) => ({
            name_de: item.name,
            description_de: item.description || null,
            category: cat.name,
            price_cents: item.priceCents || null,
            is_available: true,
            sort_order: i,
          }))
        );
      } else if (link.platform === 'ubereats') {
        const slug = link.platform_slug || extractSlug(link.platform_url, link.platform);
        if (!slug) {
          console.log('no slug could be extracted from URL');
          stats.failed++;
          continue;
        }

        if (!ubereatsClient) {
          ubereatsClient = createUberEatsClient();
        }
        const data = await ubereatsClient.getRestaurantPage(slug);
        menuItems = data.menuCategories.flatMap((cat) =>
          cat.items.map((item, i) => ({
            name_de: item.name,
            description_de: item.description || null,
            category: cat.name,
            price_cents: item.priceCents || null,
            is_available: true,
            sort_order: i,
          }))
        );
      }

      if (menuItems.length === 0) {
        console.log('no menu items found');
        stats.skipped++;
        continue;
      }

      await writeResult(link, menuItems, null, isDryRun, stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`Fetch failed: ${msg}`);
      stats.failed++;
    }
  }

  if (ubereatsClient) {
    await ubereatsClient.close();
  }

  const lieferandoAny = lieferandoClient as { close?: () => Promise<void> } | null;
  if (lieferandoAny?.close) {
    await lieferandoAny.close();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Summary`);
  console.log(`     Total:                  ${stats.total}`);
  console.log(`     Processed:              ${stats.processed}`);
  console.log(`     Skipped:                ${stats.skipped}`);
  console.log(`     Failed:                 ${stats.failed}`);
  console.log(`     Menu items written:     ${stats.menuItemsWritten}`);
  console.log(`     Opening hours written:  ${stats.openingHoursWritten}`);
  console.log(`${'─'.repeat(50)}`);

  if (isDryRun) {
    console.log(`\n  Dry-run complete. Re-run without --dry-run to write.`);
  }
}

// ---------------------------------------------------------------------------
// Helper: write menu items and/or opening hours to the database
// ---------------------------------------------------------------------------
async function writeResult(
  link: DeliveryLinkRow,
  menuItems: Array<{ name_de: string; description_de: string | null; category: string | null; price_cents: number | null; is_available: boolean; sort_order: number }>,
  openingHoursToWrite: Record<string, unknown> | null,
  isDryRun: boolean,
  stats: RunStats,
): Promise<void> {
  const hasMenus = menuItems.length > 0;

  if (isDryRun) {
    let msg = '';
    if (hasMenus) {
      msg = `would write ${menuItems.length} menu item(s)`;
      if (openingHoursToWrite) msg += ' and opening hours';
    } else {
      msg = 'opening hours only (would write)';
    }
    console.log(msg);
    if (hasMenus) stats.menuItemsWritten += menuItems.length;
    if (openingHoursToWrite) stats.openingHoursWritten++;
    stats.processed++;
    return;
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
    return;
  }

  const { error: rpcError } = await supabase
    .rpc('admin_update_provider', {
      p_provider_id: link.provider_id,
      p_data,
    });

  if (rpcError) {
    console.log(`RPC write failed: ${rpcError.message}`);
    stats.failed++;
    return;
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
  console.log(msg);
  if (hasMenus) stats.menuItemsWritten += menuItems.length;
  if (openingHoursToWrite) stats.openingHoursWritten++;
  stats.processed++;
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
