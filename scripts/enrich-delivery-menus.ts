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

  for (const link of batch) {
    process.stdout.write(`  ${link.provider_name} (${link.platform}) ... `);

    try {
      const { count: existingCount, error: countError } = await supabase
        .from('food_menu')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', link.provider_id);

      if (countError) {
        console.log(`menu count check failed: ${countError.message}`);
        stats.failed++;
        continue;
      }

      if (existingCount && existingCount > 0) {
        console.log(`already has ${existingCount} menu item(s)`);
        stats.skipped++;
        continue;
      }

      // ----- Fetch data from platform -----

      let menuItems: Array<{
        name_de: string;
        description_de: string | null;
        category: string | null;
        price_cents: number | null;
        is_available: boolean;
        sort_order: number;
      }> = [];

      // Opening hours collected from Wolt (Apify) — null for other platforms
      let openingHoursToWrite: Record<string, unknown> | null = null;

      if (link.platform === 'wolt') {
        // Use Apify Wolt actor instead of custom HTTP client
        const result = await fetchWoltRestaurant(link.platform_url, APIFY_API_TOKEN!);

        if (!result) {
          console.log(`not found on Wolt`);
          stats.skipped++;
          continue;
        }

        menuItems = result.menuItems;

        // Additive-only: only write opening hours if provider has none
        if (result.openingHours) {
          const { data: currentProvider } = await supabase
            .from('providers')
            .select('opening_hours')
            .eq('provider_id', link.provider_id)
            .single();

          if (!currentProvider?.opening_hours) {
            openingHoursToWrite = result.openingHours as unknown as Record<string, unknown>;
          }
        }
      } else if (link.platform === 'lieferando') {
        const slug = link.platform_slug || extractSlug(link.platform_url, link.platform);
        if (!slug) {
          console.log(`no slug could be extracted from URL`);
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
          console.log(`no slug could be extracted from URL`);
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
        console.log(`no menu items found`);
        stats.skipped++;
        continue;
      }

      // ----- Write to database -----

      if (isDryRun) {
        let msg = `would write ${menuItems.length} menu item(s)`;
        if (openingHoursToWrite) {
          msg += ` and opening hours`;
        }
        console.log(msg);
        stats.menuItemsWritten += menuItems.length;
        stats.processed++;
      } else {
        const p_data: Record<string, unknown> = { menu_items: menuItems };
        if (openingHoursToWrite) {
          p_data.providers = { opening_hours: openingHoursToWrite };
        }

        const { error: rpcError } = await supabase
          .rpc('admin_update_provider', {
            p_provider_id: link.provider_id,
            p_data,
          });

        if (rpcError) {
          console.log(`RPC write failed: ${rpcError.message}`);
          stats.failed++;
          continue;
        }

        await supabase
          .from('provider_delivery_links')
          .update({
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('provider_id', link.provider_id)
          .eq('platform', link.platform);

        let msg = `${menuItems.length} menu item(s) written`;
        if (openingHoursToWrite) {
          msg += ` + opening hours`;
          stats.openingHoursWritten++;
        }
        console.log(msg);
        stats.menuItemsWritten += menuItems.length;
        stats.processed++;
      }
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
  console.log(`     Skipped (has menu):     ${stats.skipped}`);
  console.log(`     Failed:                 ${stats.failed}`);
  console.log(`     Menu items written:     ${stats.menuItemsWritten}`);
  console.log(`     Opening hours written:  ${stats.openingHoursWritten}`);
  console.log(`${'─'.repeat(50)}`);

  if (isDryRun) {
    console.log(`\n  Dry-run complete. Re-run without --dry-run to write.`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
