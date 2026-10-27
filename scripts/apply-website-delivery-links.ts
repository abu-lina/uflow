/**
 * Write Wolt, Lieferando and Uber Eats links found on an approved provider's own website
 * straight to provider_delivery_links (#806). Staging for review stays in
 * scripts/screen-provider-google-maps.ts (#801).
 *
 * Only providers with review_status = 'approved' and a social_website are read. A platform is
 * skipped when the provider already has a provider_delivery_links row or any delivery_links
 * enrichment candidate (any status) for it, so reruns never duplicate, overwrite or resurrect a
 * rejected link. Fetch failures (for example an incomplete TLS chain) log a WARN and never fail
 * the run; fetchPublicPage keeps strict TLS and the SSRF guard. --limit counts providers that
 * still lack a link, not providers scanned.
 *
 * Usage:
 *   npx tsx scripts/apply-website-delivery-links.ts --dry-run                 # default, writes nothing
 *   npx tsx scripts/apply-website-delivery-links.ts --apply [--provider-id <uuid>] [--limit <n>]
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import {
  DELIVERY_PLATFORMS,
  extractDeliveryLinksFromHtml,
  fetchPublicPage,
} from '../src/lib/enrichment/website-delivery-links';
import { loadHeldPlatforms } from '../src/lib/enrichment/held-delivery-platforms';

export const PAGE_SIZE = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LinkProvider {
  provider_id: string;
  provider_name: string;
  social_website: string | null;
  /** Platforms that already have a link row or a delivery_links candidate. */
  held: Set<string>;
}

export interface DeliveryLinkRow {
  provider_id: string;
  platform: string;
  platform_url: string;
  platform_slug: string | null;
  is_active: boolean;
}

export interface LinkStore {
  /** Approved providers with a website that still lack a link for at least one platform. */
  listProviders(opts: { providerId?: string; limit?: number }): Promise<LinkProvider[]>;
  writeLink(row: DeliveryLinkRow): Promise<void>;
}

export interface LinkSummary {
  processed: number;
  written: number;
  skipped: number;
  warned: number;
}

export async function runApplyLinks(deps: {
  store: LinkStore;
  fetchPage: (url: string) => Promise<{ html: string; url: string }>;
  log?: (message: string) => void;
  options: { apply: boolean; limit?: number; providerId?: string };
}): Promise<LinkSummary> {
  const { store, fetchPage, options } = deps;
  const log = deps.log ?? (() => undefined);
  const providers = await store.listProviders({
    providerId: options.providerId,
    limit: options.limit,
  });
  const summary: LinkSummary = { processed: 0, written: 0, skipped: 0, warned: 0 };

  for (const provider of providers) {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    const site = provider.social_website?.trim();
    if (!site) {
      summary.skipped += 1;
      continue;
    }
    if (DELIVERY_PLATFORMS.every((p) => provider.held.has(p))) {
      summary.skipped += 1;
      continue;
    }
    try {
      summary.processed += 1;

      const page = await fetchPage(site);
      const found = extractDeliveryLinksFromHtml(page.html, page.url);
      for (const link of found.filter((l) => !provider.held.has(l.platform))) {
        log(
          `  ${options.apply ? 'WRITE' : 'WOULD WRITE'} ${label}: ${link.platform} ${link.platform_url}`,
        );
        if (!options.apply) continue;
        await store.writeLink({
          provider_id: provider.provider_id,
          platform: link.platform,
          platform_url: link.platform_url,
          platform_slug: link.platform_slug,
          is_active: true,
        });
        summary.written += 1;
      }
    } catch (err) {
      summary.warned += 1;
      log(
        `WARN ${label}: website links skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return summary;
}

export function createSupabaseLinkStore(supabase: SupabaseClient): LinkStore {
  return {
    async listProviders({ providerId, limit }) {
      const selected: LinkProvider[] = [];
      let cursor = '';
      while (limit === undefined || selected.length < limit) {
        let query = supabase
          .from('providers')
          .select('provider_id, provider_name, social_website')
          .eq('review_status', 'approved')
          .not('social_website', 'is', null);
        if (providerId) query = query.eq('provider_id', providerId);
        if (cursor) query = query.gt('provider_id', cursor);
        const { data, error } = await query
          .order('provider_id', { ascending: true })
          .limit(PAGE_SIZE);
        if (error) throw new Error(`Failed to load providers: ${error.message}`);
        const rows = (data ?? []) as Array<Omit<LinkProvider, 'held'>>;

        // The done-once check runs here so --limit counts providers still to do.
        for (const row of rows) {
          if (limit !== undefined && selected.length >= limit) break;
          const held = await loadHeldPlatforms(supabase, row.provider_id);
          if (!DELIVERY_PLATFORMS.every((p) => held.has(p))) selected.push({ ...row, held });
        }
        if (rows.length < PAGE_SIZE || providerId) break;
        cursor = rows[rows.length - 1].provider_id;
      }
      return selected;
    },

    async writeLink(row) {
      const { error } = await supabase
        .from('provider_delivery_links')
        .upsert(row, { onConflict: 'provider_id,platform', ignoreDuplicates: true });
      if (error) throw new Error(`Failed to write delivery link: ${error.message}`);
    },
  };
}

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const argValue = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const providerId = (argValue('--provider-id') ?? '').trim();
  if (providerId && !UUID_RE.test(providerId)) throw new Error('provider id must be a UUID');
  const rawLimit = argValue('--limit');
  if (rawLimit !== undefined && !/^[1-9]\d*$/.test(rawLimit))
    throw new Error(`limit must be a positive integer, got "${rawLimit}"`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log(`Mode: ${apply ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const summary = await runApplyLinks({
    store: createSupabaseLinkStore(supabase),
    fetchPage: (u) => fetchPublicPage(u),
    log: console.log,
    options: {
      apply,
      limit: rawLimit === undefined ? undefined : Number(rawLimit),
      providerId: providerId || undefined,
    },
  });
  console.log(
    `SUMMARY processed=${summary.processed} written=${summary.written} skipped=${summary.skipped} warned=${summary.warned}`,
  );
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
