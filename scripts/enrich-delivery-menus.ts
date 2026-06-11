import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createWoltClient } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { createLieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-client';
import { createUberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-client';
import { StaticCityGeocoder } from '../src/lib/enrichment/delivery-platform/geocoder';
import type { LieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-types';
import type { UberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-types';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const applyLimit = limit ?? links.length;
  const batch = links.slice(0, applyLimit);
  const stats: RunStats = {
    total: batch.length,
    processed: 0,
    skipped: 0,
    failed: 0,
    menuItemsWritten: 0,
  };

  console.log(`  Found ${links.length} active delivery link(s) for food providers`);
  if (limit) {
    console.log(`  Processing first ${limit}\n`);
  } else {
    console.log('');
  }

  const geocoder = new StaticCityGeocoder();
  let woltClient: ReturnType<typeof createWoltClient> | null = null;
  let lieferandoClient: LieferandoClient | null = null;
  let ubereatsClient: UberEatsClient | null = null;

  for (const link of batch) {
    const slug = link.platform_slug || extractSlug(link.platform_url, link.platform);
    if (!slug) {
      process.stdout.write(`  ${link.provider_name} (${link.platform}) ... `);
      console.log(`no slug could be extracted from URL`);
      stats.failed++;
      continue;
    }

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

      let menuItems: Array<{
        name_de: string;
        description_de: string | null;
        category: string | null;
        price_cents: number | null;
        is_available: boolean;
        sort_order: number;
      }> = [];

      if (link.platform === 'wolt') {
        if (!woltClient) {
          woltClient = createWoltClient(undefined, geocoder);
        }
        const data = await woltClient.fetchMenuData(slug);
        menuItems = data.items.map((item, i) => ({
          name_de: item.name,
          description_de: item.description || null,
          category: item.category || null,
          price_cents: null,
          is_available: true,
          sort_order: i,
        }));
      } else if (link.platform === 'lieferando') {
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

      if (isDryRun) {
        console.log(`would write ${menuItems.length} menu item(s)`);
        stats.menuItemsWritten += menuItems.length;
        stats.processed++;
      } else {
        const { error: rpcError } = await supabase
          .rpc('admin_update_provider', {
            p_provider_id: link.provider_id,
            p_data: {
              menu_items: menuItems,
            },
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

        console.log(`${menuItems.length} menu item(s) written`);
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
  console.log(`     Total:              ${stats.total}`);
  console.log(`     Processed:          ${stats.processed}`);
  console.log(`     Skipped (has menu): ${stats.skipped}`);
  console.log(`     Failed:             ${stats.failed}`);
  console.log(`     Menu items written: ${stats.menuItemsWritten}`);
  console.log(`${'─'.repeat(50)}`);

  if (isDryRun) {
    console.log(`\n  Dry-run complete. Re-run without --dry-run to write.`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
