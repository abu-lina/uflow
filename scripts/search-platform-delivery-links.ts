/**
 * Search Wolt, Lieferando and Uber Eats for approved providers that still lack a link (#807).
 * Fallback for providers whose website yielded no delivery links (#806).
 *
 * A result is accepted only when matchVenueToProvider says `match` (name, street with house
 * number, zip and city all agree); it is then written to provider_delivery_links. Ambiguous results are staged as pending
 * `delivery_links` candidates (source `platform_search:<platform>`). Each platform is searched once
 * per provider: a platform with a link row, any delivery_links candidate, or a row in
 * provider_platform_searches is skipped. A failed request logs a WARN and is not recorded, so it
 * retries on the next run. Uses the existing delivery-platform clients (public pages and
 * endpoints), waits --delay-ms between requests (the clients' own delay is off, so the wait is
 * not doubled), and never fails the run on a search error.
 *
 * Limits: each platform is searched with one call (Wolt: venues near the provider; Lieferando: the
 * provider's city page; Uber Eats: its search page), so a `no_match` can be a miss. A `no_match`
 * therefore expires after 30 days and the platform is searched again; change that with
 * --retry-no-match-after-days <n>. Accepted and staged searches never expire.
 * Uber Eats results carry no address, so they can only be staged, never written.
 *
 * Usage:
 *   npx tsx scripts/search-platform-delivery-links.ts --dry-run                 # default, writes nothing
 *   npx tsx scripts/search-platform-delivery-links.ts --apply [--provider-id <uuid>] [--limit <n>]
 *     [--delay-ms <ms>] [--platform wolt|lieferando|ubereats]
 *     [--retry-no-match-after-days <n>]
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
  type DeliveryPlatform,
} from '../src/lib/enrichment/website-delivery-links';
import { loadHeldPlatforms } from '../src/lib/enrichment/held-delivery-platforms';
import { matchVenueToProvider } from '../src/lib/enrichment/platform-search-match';
import { slugify } from '../src/lib/slugify';
import { stringSimilarity } from '../src/lib/enrichment/delivery-platform/provider-matcher';
import {
  StaticCityGeocoder,
  type Geocoder,
} from '../src/lib/enrichment/delivery-platform/geocoder';
import {
  createWoltClient,
  type WoltClient,
} from '../src/lib/enrichment/delivery-platform/wolt-client';
import { createLieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-client';
import { createUberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-client';
import type { LieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-types';
import type { UberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-types';

export const PAGE_SIZE = 200;
export const PLATFORM_SEARCH_SOURCE_PREFIX = 'platform_search';
const DEFAULT_DELAY_MS = 2000;
export const DEFAULT_NO_MATCH_RETRY_DAYS = 30;
const MIN_DELAY_MS = 500;
const MAX_ERROR_LENGTH = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STAGED_PER_PLATFORM = 3;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SearchOutcome = 'accepted' | 'staged' | 'no_match';

export interface SearchProviderRow {
  provider_id: string;
  provider_name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Platforms with a link row or any delivery_links candidate. */
  held: Set<string>;
  /** Platforms already searched (provider_platform_searches). */
  searched: Set<string>;
}

export interface SearchVenueResult {
  name: string;
  address?: string | null;
  city?: string | null;
  platform_url: string;
  platform_slug: string | null;
}

export type PlatformSearcher = (provider: SearchProviderRow) => Promise<SearchVenueResult[]>;

export interface DeliveryLinkRow {
  provider_id: string;
  platform: string;
  platform_url: string;
  platform_slug: string | null;
  is_active: boolean;
}

export interface SearchStore {
  /** Approved providers that still have at least one platform to search. */
  listProviders(opts: {
    providerId?: string;
    limit?: number;
    platforms: DeliveryPlatform[];
    /** Treat `no_match` searches older than this many days as not done (default 30). */
    retryNoMatchAfterDays?: number;
  }): Promise<SearchProviderRow[]>;
  writeLink(row: DeliveryLinkRow): Promise<void>;
  stageCandidate(row: Record<string, unknown>): Promise<void>;
  recordSearch(row: {
    provider_id: string;
    platform: string;
    outcome: SearchOutcome;
  }): Promise<void>;
}

export interface SearchSummary {
  processed: number;
  searched: number;
  written: number;
  staged: number;
  noMatch: number;
  skipped: number;
  warned: number;
}

type Searchers = Partial<Record<DeliveryPlatform, PlatformSearcher>>;

/**
 * Same URL checks as website links (https, platform host, no userinfo or port, anchored venue
 * path), which extractDeliveryLinksFromHtml does for us, plus the URL must
 * already be in canonical form and carry the slug the search result named, so nothing extra
 * (query, fragment, another path) rides along into a live link.
 */
function validateVenueLink(platform: DeliveryPlatform, venue: SearchVenueResult) {
  if (/["'<>\s]/.test(venue.platform_url)) return null;
  const link = extractDeliveryLinksFromHtml(
    `<a href="${venue.platform_url}">x</a>`,
    venue.platform_url,
  ).find((l) => l.platform === platform);
  if (!link || link.platform_url !== venue.platform_url) return null;
  if (!link.platform_slug || link.platform_slug !== venue.platform_slug) return null;
  return link;
}

const errorMessage = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).slice(0, MAX_ERROR_LENGTH);

function buildSearchCandidate(
  providerId: string,
  platform: DeliveryPlatform,
  links: Array<{ platform_url: string; platform_slug: string | null }>,
): Record<string, unknown> {
  return {
    provider_id: providerId,
    source: `${PLATFORM_SEARCH_SOURCE_PREFIX}:${platform}`,
    source_url: links[0].platform_url,
    field_name: 'delivery_links',
    proposed_value: links.map((l) => ({
      platform,
      platform_url: l.platform_url,
      platform_slug: l.platform_slug,
      is_active: true,
    })),
    current_value: null,
    status: 'pending',
    enriched_at: new Date().toISOString(),
    enrichment_type: 'data',
  };
}

export async function runPlatformSearch(deps: {
  store: SearchStore;
  searchers: Searchers;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  options: {
    apply: boolean;
    limit?: number;
    providerId?: string;
    delayMs?: number;
    retryNoMatchAfterDays?: number;
  };
}): Promise<SearchSummary> {
  const { store, searchers, options } = deps;
  const log = deps.log ?? (() => undefined);
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const platforms = DELIVERY_PLATFORMS.filter((p) => searchers[p]);

  const providers = await store.listProviders({
    providerId: options.providerId,
    limit: options.limit,
    platforms,
    retryNoMatchAfterDays: options.retryNoMatchAfterDays,
  });
  const summary: SearchSummary = {
    processed: 0,
    searched: 0,
    written: 0,
    staged: 0,
    noMatch: 0,
    skipped: 0,
    warned: 0,
  };
  let requests = 0;

  for (const provider of providers) {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    const todo = platforms.filter((p) => !provider.held.has(p) && !provider.searched.has(p));
    if (todo.length === 0 || !provider.city?.trim()) {
      summary.skipped += 1;
      continue;
    }
    summary.processed += 1;

    for (const platform of todo) {
      try {
        if (requests > 0) await sleep(delayMs);
        requests += 1;
        const venues = await searchers[platform]!(provider);
        summary.searched += 1;

        const matches: Array<{ platform_url: string; platform_slug: string | null }> = [];
        const ambiguous: typeof matches = [];
        let validLinks = 0;
        for (const venue of venues) {
          const link = validateVenueLink(platform, venue);
          if (!link) continue;
          validLinks += 1;
          const verdict = matchVenueToProvider(
            {
              name: provider.provider_name,
              street: provider.street,
              zip: provider.zip,
              city: provider.city,
            },
            venue,
          );
          const target = verdict === 'match' ? matches : verdict === 'ambiguous' ? ambiguous : null;
          target?.push({ platform_url: link.platform_url, platform_slug: link.platform_slug });
        }

        const mode = options.apply ? '' : 'WOULD ';
        if (matches.length === 1) {
          const [link] = matches;
          log(`  ${mode}WRITE ${label}: ${platform} ${link.platform_url}`);
          if (options.apply) {
            await store.writeLink({
              provider_id: provider.provider_id,
              platform,
              ...link,
              is_active: true,
            });
            await store.recordSearch({
              provider_id: provider.provider_id,
              platform,
              outcome: 'accepted',
            });
          }
          summary.written += options.apply ? 1 : 0;
          continue;
        }

        const toStage = (matches.length > 1 ? matches : ambiguous).slice(
          0,
          MAX_STAGED_PER_PLATFORM,
        );
        if (toStage.length > 0) {
          log(
            `  ${mode}STAGE ${label}: ${platform} ${toStage.map((l) => l.platform_url).join(' ')}`,
          );
          if (options.apply) {
            await store.stageCandidate(
              buildSearchCandidate(provider.provider_id, platform, toStage),
            );
            await store.recordSearch({
              provider_id: provider.provider_id,
              platform,
              outcome: 'staged',
            });
          }
          summary.staged += options.apply ? 1 : 0;
          continue;
        }

        log(
          `  ${mode}RECORD ${label}: ${platform} no match (${describeSearch(provider.provider_name, venues, validLinks)})`,
        );
        if (options.apply) {
          await store.recordSearch({
            provider_id: provider.provider_id,
            platform,
            outcome: 'no_match',
          });
        }
        summary.noMatch += 1;
      } catch (err) {
        summary.warned += 1;
        log(`WARN ${label}: ${platform} search skipped: ${errorMessage(err)}`);
      }
    }
  }
  return summary;
}

export function createSupabaseSearchStore(supabase: SupabaseClient): SearchStore {
  return {
    async listProviders({ providerId, limit, platforms, retryNoMatchAfterDays }) {
      const retryBefore = new Date(
        Date.now() - (retryNoMatchAfterDays ?? DEFAULT_NO_MATCH_RETRY_DAYS) * DAY_MS,
      ).toISOString();
      const selected: SearchProviderRow[] = [];
      let cursor = '';
      while (limit === undefined || selected.length < limit) {
        let query = supabase
          .from('providers')
          .select(
            'provider_id, provider_name, address_street, address_zip, address_city, location_latitude, location_longitude',
          )
          .eq('review_status', 'approved')
          .not('address_city', 'is', null);
        if (providerId) query = query.eq('provider_id', providerId);
        if (cursor) query = query.gt('provider_id', cursor);
        const { data, error } = await query
          .order('provider_id', { ascending: true })
          .limit(PAGE_SIZE);
        if (error) throw new Error(`Failed to load providers: ${error.message}`);
        const rows = data ?? [];

        // The done-once check runs here so --limit counts providers still to do.
        for (const row of rows) {
          if (limit !== undefined && selected.length >= limit) break;
          const held = await loadHeldPlatforms(supabase, row.provider_id);
          const { data: searchedRows, error: searchedError } = await supabase
            .from('provider_platform_searches')
            .select('platform, outcome, searched_at')
            .eq('provider_id', row.provider_id);
          if (searchedError) throw new Error(`Failed to load searches: ${searchedError.message}`);
          const searched = new Set(
            (searchedRows ?? [])
              .filter((r) => !(r.outcome === 'no_match' && String(r.searched_at) < retryBefore))
              .map((r) => r.platform as string),
          );
          if (platforms.every((p) => held.has(p) || searched.has(p))) continue;
          selected.push({
            provider_id: row.provider_id,
            provider_name: row.provider_name,
            street: row.address_street,
            zip: row.address_zip,
            city: row.address_city,
            latitude: row.location_latitude === null ? null : Number(row.location_latitude),
            longitude: row.location_longitude === null ? null : Number(row.location_longitude),
            held,
            searched,
          });
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

    async stageCandidate(row) {
      const { error } = await supabase.from('enrichment_candidates').insert(row);
      if (error) throw new Error(`Failed to stage candidate: ${error.message}`);
    },

    async recordSearch(row) {
      const { error } = await supabase
        .from('provider_platform_searches')
        .upsert(
          { ...row, searched_at: new Date().toISOString() },
          { onConflict: 'provider_id,platform' },
        );
      if (error) throw new Error(`Failed to record search: ${error.message}`);
    },
  };
}

async function coordsFor(provider: SearchProviderRow, geocoder: Pick<Geocoder, 'geocode'>) {
  const coords =
    provider.latitude != null && provider.longitude != null
      ? { lat: provider.latitude, lon: provider.longitude }
      : await geocoder.geocode(provider.city ?? '');
  if (!coords) throw new Error(`no coordinates for city "${provider.city}"`);
  return coords;
}

function describeSearch(
  providerName: string,
  venues: SearchVenueResult[],
  validLinks: number,
): string {
  const counts = `${venues.length} venues, ${validLinks} valid links`;
  let closest: SearchVenueResult | undefined;
  let best = -1;
  for (const venue of venues) {
    const score = stringSimilarity(providerName, venue.name);
    if (score > best) {
      best = score;
      closest = venue;
    }
  }
  return closest ? `${counts}, closest "${closest.name}"` : counts;
}

export function createPlatformSearchers(deps: {
  wolt: Pick<WoltClient, 'searchVenuesByLocation'>;
  lieferando: Pick<LieferandoClient, 'searchRestaurants'>;
  ubereats: Pick<UberEatsClient, 'searchRestaurants'>;
  geocoder: Pick<Geocoder, 'geocode'>;
}): Required<Searchers> {
  const { wolt, lieferando, ubereats, geocoder } = deps;
  return {
    async wolt(p) {
      const { lat, lon } = await coordsFor(p, geocoder);
      const { venues } = await wolt.searchVenuesByLocation(lat, lon);
      return venues.map((v) => ({
        name: v.name,
        address: v.address,
        city: v.city,
        platform_url: `https://wolt.com/de/deu/${slugify(v.city || p.city || '')}/venue/${encodeURIComponent(v.slug)}`,
        platform_slug: v.slug,
      }));
    },
    async lieferando(p) {
      const results = await lieferando.searchRestaurants(p.city ?? '');
      return results.map((r) => ({
        name: r.name,
        address: r.address,
        city: r.city,
        platform_url: `https://www.lieferando.de/speisekarte/${encodeURIComponent(r.slug)}`,
        platform_slug: r.slug,
      }));
    },
    async ubereats(p) {
      const { lat, lon } = await coordsFor(p, geocoder);
      const results = await ubereats.searchRestaurants(p.city ?? '', lat, lon);
      // Search results carry no address, so these can only be staged for review.
      return results.map((r) => ({
        name: r.name,
        city: p.city,
        platform_url: `https://www.ubereats.com/de/store/${encodeURIComponent(r.slug)}`,
        platform_slug: r.slug,
      }));
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
  const rawDelay = argValue('--delay-ms');
  if (rawDelay !== undefined && (!/^\d+$/.test(rawDelay) || Number(rawDelay) < MIN_DELAY_MS))
    throw new Error(`delay-ms must be an integer of at least ${MIN_DELAY_MS}, got "${rawDelay}"`);
  const rawRetry = argValue('--retry-no-match-after-days');
  if (rawRetry !== undefined && !/^[1-9]\d*$/.test(rawRetry))
    throw new Error(`retry-no-match-after-days must be a positive integer, got "${rawRetry}"`);
  const onlyPlatform = argValue('--platform');
  if (onlyPlatform && !DELIVERY_PLATFORMS.includes(onlyPlatform as DeliveryPlatform))
    throw new Error(`platform must be one of ${DELIVERY_PLATFORMS.join(', ')}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log(`Mode: ${apply ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const geocoder = new StaticCityGeocoder();
  const delayMs = rawDelay === undefined ? DEFAULT_DELAY_MS : Number(rawDelay);
  // The runner waits delayMs between searches; the clients' own delay stays off.
  const wolt = createWoltClient({ requestDelayMs: 0 }, geocoder);
  const lieferando = createLieferandoClient({ requestDelayMs: 0 });
  const ubereats = createUberEatsClient({ requestDelayMs: 0 });
  const all = createPlatformSearchers({ wolt, lieferando, ubereats, geocoder });
  const searchers: Searchers = onlyPlatform
    ? { [onlyPlatform]: all[onlyPlatform as DeliveryPlatform] }
    : all;

  try {
    const summary = await runPlatformSearch({
      store: createSupabaseSearchStore(supabase),
      searchers,
      log: console.log,
      options: {
        apply,
        delayMs,
        limit: rawLimit === undefined ? undefined : Number(rawLimit),
        providerId: providerId || undefined,
        retryNoMatchAfterDays: rawRetry === undefined ? undefined : Number(rawRetry),
      },
    });
    console.log(
      `SUMMARY processed=${summary.processed} searched=${summary.searched} written=${summary.written} staged=${summary.staged} no_match=${summary.noMatch} skipped=${summary.skipped} warned=${summary.warned}`,
    );
  } finally {
    await Promise.allSettled([lieferando.close(), ubereats.close()]);
  }
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
