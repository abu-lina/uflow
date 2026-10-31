/**
 * Screen providers against Google Maps via the Apify Google Maps Scraper (#763).
 *
 * For each provider it matches a Maps place, scans reviews/attributes/category/website,
 * and inserts a provider_screenings row with the full Apify item in `raw`. Only providers
 * whose status is `clear` also get empty public fields filled (description, website, phone,
 * opening hours, Instagram, address, coordinates, parking/family/children flags) and images
 * staged when they have none. Existing values are never overwritten, missing data never sets a
 * flag to false, and no_alcohol and the halal fields are never written.
 *
 * For `clear` providers with a website it also reads that site (https only, timeout, size cap,
 * private IPs blocked) and stages Lieferando/Wolt/Uber Eats links as auto-applied
 * `delivery_links` enrichment candidates for review in /dashboard/enrichment (#801).
 * It also stages the Maps "order online" links (Wolt, Uber Eats, Lieferando) of the matched place
 * as `google_maps_order_online:<platform>` candidates, for platforms the site did not cover (#807).
 * The actor bills order online (scrapeOrderOnline) as a per-place paid add-on, so it is opt-in per
 * provider (#820). It is requested only when the run applies, the provider's listing_type is `food`
 * and at least one delivery platform (Wolt, Lieferando, Uber Eats) is still missing. That check runs
 * before the Apify call. Dry runs, non-food providers and fully covered providers never pay for it.
 *
 * With --missing-links (workflow input mode=missing_links) it screens approved food providers that
 * still miss a Wolt, Lieferando or Uber Eats link instead, stages order online and website links,
 * and writes no provider fields.
 *
 * Usage:
 *   npx tsx scripts/screen-provider-google-maps.ts --dry-run                 # default, writes nothing
 *   npx tsx scripts/screen-provider-google-maps.ts --apply --provider-id <uuid>
 *   INPUT_LIMIT=20 npx tsx scripts/screen-provider-google-maps.ts --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN,
 *      optional INPUT_LIMIT (1-100, default 10) and INPUT_PROVIDER_ID.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import {
  fetchGoogleMapsPlaces,
  GOOGLE_MAPS_SETTINGS,
  type ActorOptions,
  type ApifyPlace,
} from '../src/lib/enrichment/google-maps/apify-google-maps-client';
import {
  buildFieldCandidates,
  estimateCostUsd,
  matchPlace,
  noMatchScreening,
  placeImages,
  screenPlace,
  type EnrichableProvider,
  type MatchableProvider,
  type ScreeningResult,
} from '../src/lib/enrichment/google-maps/place-screening';
import { buildAutoApplyPayload } from '../src/lib/enrichment/auto-apply-payload';
import { createImageCandidatePayload } from '../src/lib/enrichment/image-enrichment';
import { formatStageError, stageImageCandidate, type StageCandidateResult } from './enrich-images';
import {
  buildWebsiteDeliveryCandidate,
  DELIVERY_PLATFORMS,
  extractDeliveryLinksFromHtml,
  fetchPublicPage,
  GOOGLE_ORDER_SOURCE_PREFIX,
  pickDeliveryLinks,
  WEBSITE_SOURCE_PREFIX,
  type WebsiteDeliveryLink,
} from '../src/lib/enrichment/website-delivery-links';
import { loadHeldPlatforms } from '../src/lib/enrichment/held-delivery-platforms';

export type { ApifyPlace };

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 10;
const RECENT_DAYS = 30;
const PAGE_SIZE = 50;
const SCREENING_SOURCE = 'google_maps_apify';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScreeningProvider extends MatchableProvider, EnrichableProvider {
  imageUrls: string[];
  listingType?: string | null;
  /** Set when the store already loaded them (missing-links listing), so the run does not fetch them again. */
  heldPlatforms?: Set<string>;
}

export interface ScreeningRow {
  provider_id: string;
  source: typeof SCREENING_SOURCE;
  status: ScreeningResult['status'];
  flags: ScreeningResult['flags'];
  raw: ScreeningResult['raw'];
}

export interface ScreeningStore {
  listProviders(opts: {
    providerId?: string;
    limit: number;
    missingLinks?: boolean;
  }): Promise<ScreeningProvider[]>;
  insertScreening(row: ScreeningRow): Promise<void>;
  applyFields(providerId: string, rpcPayload: Record<string, unknown>): Promise<void>;
  stageImages(row: Record<string, unknown>): Promise<StageCandidateResult>;
  /** Platforms the provider already holds; used to decide whether the order online add-on is worth paying for. */
  heldPlatforms?(providerId: string): Promise<Set<string>>;
}

export interface WebsiteLinkDeps {
  fetchPage: (url: string) => Promise<{ html: string; url: string }>;
  existingPlatforms: (providerId: string) => Promise<Set<string>>;
  stage: (row: Record<string, unknown>) => Promise<StageCandidateResult>;
}

export interface ScreeningSummary {
  processed: number;
  flagged: number;
  review: number;
  clear: number;
  failed: number;
  estimatedCostUsd: number;
}

export interface RunOptions {
  apply: boolean;
  limit: number;
  providerId?: string;
  /** Approved food providers that still miss a delivery platform; stages links only. */
  missingLinks?: boolean;
}

export function resolveLimit(raw: string | undefined): number {
  const value = raw?.trim();
  if (!value) return DEFAULT_LIMIT;
  if (!/^[1-9]\d*$/.test(value))
    throw new Error(`limit must be a positive integer, got "${value}"`);
  return Math.min(Number(value), MAX_LIMIT);
}

export function exitCodeFor(summary: ScreeningSummary): number {
  return summary.processed > 0 && summary.failed === summary.processed ? 1 : 0;
}

// Origin and path only: Maps links carry tracking tokens that must not reach the log.
function describeUrls(hrefs: string[]): string {
  return hrefs
    .slice(0, 5)
    .map((h) => {
      try {
        const u = new URL(h);
        return `${u.origin}${u.pathname}`;
      } catch {
        return 'invalid URL';
      }
    })
    .join(', ');
}

export async function runScreening(deps: {
  store: ScreeningStore;
  fetchPlaces: (provider: ScreeningProvider, actorOptions?: ActorOptions) => Promise<ApifyPlace[]>;
  log?: (message: string) => void;
  options: RunOptions;
  websiteLinks?: WebsiteLinkDeps;
}): Promise<ScreeningSummary> {
  const { store, fetchPlaces, options, websiteLinks } = deps;
  const log = deps.log ?? (() => undefined);
  const { apply } = options;
  const providers = await store.listProviders({
    providerId: options.providerId,
    limit: Math.min(options.limit, MAX_LIMIT),
    ...(options.missingLinks ? { missingLinks: true } : {}),
  });
  const summary: ScreeningSummary = {
    processed: providers.length,
    flagged: 0,
    review: 0,
    clear: 0,
    failed: 0,
    estimatedCostUsd: 0,
  };

  for (const provider of providers) {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    try {
      let places: ApifyPlace[];
      const scrapeOrderOnline = await wantsOrderOnline(provider);
      try {
        places = await fetchPlaces(provider, { scrapeOrderOnline });
      } catch (err) {
        summary.failed += 1;
        log(`FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      const images = places.reduce((n, p) => n + placeImages(p).length, 0);
      summary.estimatedCostUsd += estimateCostUsd(places.length, images);

      const match = matchPlace(provider, places);
      const result = match ? screenPlace(match) : noMatchScreening(places);
      summary[result.status] += 1;

      const flagTerms = result.flags.map((f) => `${f.code}:${f.term}`).join(', ') || 'none';
      log(
        `${apply ? 'STORE' : 'WOULD STORE'} ${label}: status=${result.status} flags=${flagTerms}` +
          (match ? '' : ' (no_maps_match)'),
      );
      if (apply) {
        await store.insertScreening({
          provider_id: provider.provider_id,
          source: SCREENING_SOURCE,
          status: result.status,
          flags: result.flags,
          raw: result.raw,
        });
      }

      // Public fields are written only for clear providers; everything else keeps its screening row only.
      if (match && result.status === 'clear') {
        // Approved providers are live, so this mode never rewrites their public fields.
        if (!options.missingLinks) await enrich(provider, match.place);
        if (websiteLinks)
          await stageDeliveryLinks(provider, match.place, websiteLinks, scrapeOrderOnline);
      }
    } catch (err) {
      summary.failed += 1;
      log(`FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;

  // Paid add-on: only an applying run, on a food provider, with a delivery platform still missing.
  // A failed lookup means no add-on, never a failed provider.
  async function wantsOrderOnline(provider: ScreeningProvider): Promise<boolean> {
    if (!apply || provider.listingType !== 'food') return false;
    try {
      const held = provider.heldPlatforms ?? (await store.heldPlatforms?.(provider.provider_id));
      if (!held) return false;
      return DELIVERY_PLATFORMS.some((platform) => !held.has(platform));
    } catch (err) {
      log(
        `WARN ${provider.provider_id} ${provider.provider_name}: order online not requested, held lookup failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  // Website links first, then Maps order online links for platforms the site did not cover.
  // Any failure only logs, it never fails the run.
  async function stageDeliveryLinks(
    provider: ScreeningProvider,
    place: ApifyPlace,
    links: WebsiteLinkDeps,
    orderOnlineRequested: boolean,
  ): Promise<void> {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    const candidates: Array<{ link: WebsiteDeliveryLink; sourceUrl: string; prefix: string }> = [];

    const site = provider.social_website?.trim();
    if (site) {
      try {
        const page = await links.fetchPage(site);
        for (const link of extractDeliveryLinksFromHtml(page.html, page.url)) {
          candidates.push({ link, sourceUrl: page.url, prefix: WEBSITE_SOURCE_PREFIX });
        }
      } catch (err) {
        log(
          `WARN ${label}: website links skipped: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const sourceUrl = place.url ?? 'https://www.google.com/maps';
    const order = place.orderOnline;
    const hrefs = [
      ...(order?.deliveries ?? []).map((d) => d.url),
      ...(order?.pickUps ?? []).map((d) => d.orderUrl),
    ].filter((h): h is string => typeof h === 'string');
    if (!order)
      log(
        `  ${label}: no order online data in the Maps result` +
          (orderOnlineRequested ? '' : ' (add-on not requested)'),
      );
    else if (pickDeliveryLinks(hrefs, sourceUrl).length === 0)
      log(
        `  ${label}: order online data has no usable delivery link: ${describeUrls(hrefs) || 'no URLs'}`,
      );
    for (const link of pickDeliveryLinks(hrefs, sourceUrl)) {
      if (candidates.some((c) => c.link.platform === link.platform)) continue;
      candidates.push({ link, sourceUrl, prefix: GOOGLE_ORDER_SOURCE_PREFIX });
    }
    if (candidates.length === 0) return;

    try {
      const held = await links.existingPlatforms(provider.provider_id);
      const skipped = candidates.filter((c) => held.has(c.link.platform));
      if (skipped.length > 0)
        log(
          `  ${label}: already held, not staged: ${skipped.map((c) => c.link.platform).join(', ')}`,
        );
      for (const { link, sourceUrl: from, prefix } of candidates.filter(
        (c) => !held.has(c.link.platform),
      )) {
        log(
          `  ${apply ? 'STAGE' : 'WOULD STAGE'} delivery link ${link.platform} ${link.platform_url} (${prefix})`,
        );
        if (!apply) continue;
        const outcome = await links.stage(
          buildWebsiteDeliveryCandidate(provider.provider_id, from, link, prefix),
        );
        if (outcome.outcome === 'failed')
          log(`WARN ${label}: delivery candidate not staged: ${formatStageError(outcome.error)}`);
      }
    } catch (err) {
      log(
        `WARN ${label}: delivery links skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  async function enrich(provider: ScreeningProvider, place: ApifyPlace): Promise<void> {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    try {
      const { rpcPayload, appliedFields } = buildAutoApplyPayload({
        providerId: provider.provider_id,
        current: {},
        proposed: buildFieldCandidates(provider, place),
        primaryLocationId: provider.primaryLocationId,
      });
      const added = (rpcPayload.providers ?? {}) as Record<string, unknown>;
      for (const field of appliedFields) {
        log(`  ${apply ? 'ADD' : 'WOULD ADD'} field ${field} = ${JSON.stringify(added[field])}`);
      }
      if (apply && appliedFields.length > 0)
        await store.applyFields(provider.provider_id, rpcPayload);

      const urls = provider.imageUrls.length === 0 ? placeImages(place) : [];
      if (urls.length === 0) return;
      for (const url of urls) log(`  ${apply ? 'ADD' : 'WOULD ADD'} image ${url}`);
      if (!apply) return;

      const payload = createImageCandidatePayload({
        providerId: provider.provider_id,
        imageUrl: urls[0],
        sourceCategory: 'google_maps',
        attribution: {
          photographer: 'Google Maps contributors',
          profile_url: place.url ?? '',
          photo_url: urls[0],
        },
        currentUrls: [],
        source: SCREENING_SOURCE,
      });
      const outcome = await store.stageImages({
        provider_id: payload.provider_id,
        source: payload.source,
        source_url: place.url ?? null,
        field_name: payload.field_name,
        proposed_value: { urls },
        current_value: payload.current_value,
        status: 'auto-applied',
        enriched_at: new Date().toISOString(),
        enrichment_type: payload.enrichment_type,
        image_url: urls[0],
        source_service: payload.source_service,
        source_category: payload.source_category,
        attribution: payload.attribution,
      });
      if (outcome.outcome === 'failed')
        log(`WARN ${label}: image candidate not staged: ${formatStageError(outcome.error)}`);
    } catch (err) {
      log(`WARN ${label}: enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

function extractImageUrls(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      return extractImageUrls(JSON.parse(value));
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (value && typeof value === 'object' && Array.isArray((value as { urls?: unknown }).urls)) {
    return extractImageUrls((value as { urls: unknown[] }).urls);
  }
  return [];
}

interface ProviderRow {
  provider_id: string;
  provider_name: string;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  provider_description: string | null;
  has_parking: boolean | null;
  family_friendly: boolean | null;
  children_friendly: boolean | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  opening_hours: Record<string, unknown> | null;
  provider_images: unknown;
  listing_type?: string | null;
  locations: Array<{
    location_id: string;
    location_latitude: number | null;
    location_longitude: number | null;
    is_primary: boolean | null;
    address_street: string | null;
    address_zip: string | null;
    address_city: string | null;
  }> | null;
}

const PROVIDER_COLUMNS =
  'provider_id, provider_name, address_street, address_zip, address_city, provider_description, has_parking, family_friendly, children_friendly, contact_phone, social_website, social_instagram, opening_hours, provider_images, listing_type, locations(location_id, location_latitude, location_longitude, is_primary, address_street, address_zip, address_city)';

function toScreeningProvider(row: ProviderRow): ScreeningProvider {
  const locations = row.locations ?? [];
  const primary = locations.find((l) => l.is_primary) ?? locations[0];
  return {
    provider_id: row.provider_id,
    provider_name: row.provider_name,
    // Display reads the primary location, so its address counts as an existing value.
    address_street: row.address_street || primary?.address_street || null,
    address_zip: row.address_zip || primary?.address_zip || null,
    address_city: row.address_city || primary?.address_city || null,
    provider_description: row.provider_description,
    has_parking: row.has_parking,
    family_friendly: row.family_friendly,
    children_friendly: row.children_friendly,
    contact_phone: row.contact_phone,
    social_website: row.social_website,
    social_instagram: row.social_instagram,
    opening_hours: row.opening_hours,
    imageUrls: extractImageUrls(row.provider_images),
    listingType: row.listing_type ?? null,
    latitude: primary?.location_latitude ?? null,
    longitude: primary?.location_longitude ?? null,
    primaryLocationId: primary?.location_id ?? null,
  };
}

export function createSupabaseStore(supabase: SupabaseClient): ScreeningStore {
  return {
    async listProviders({ providerId, limit, missingLinks }) {
      if (providerId) {
        const { data, error } = await supabase
          .from('providers')
          .select(PROVIDER_COLUMNS)
          .eq('provider_id', providerId);
        if (error) throw new Error(`Failed to load provider: ${error.message}`);
        return ((data ?? []) as unknown as ProviderRow[]).map(toScreeningProvider);
      }

      const cutoff = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
      const selected: ScreeningProvider[] = [];
      let cursor = '';
      while (selected.length < limit) {
        let query = supabase.from('providers').select(PROVIDER_COLUMNS);
        query = missingLinks
          ? query.eq('review_status', 'approved').eq('listing_type', 'food')
          : query.eq('review_status', 'pending');
        if (cursor) query = query.gt('provider_id', cursor);
        const { data, error } = await query
          .order('provider_id', { ascending: true })
          .limit(PAGE_SIZE);
        if (error) throw new Error(`Failed to load providers: ${error.message}`);
        const rows = (data ?? []) as unknown as ProviderRow[];
        if (rows.length === 0) break;
        cursor = rows[rows.length - 1].provider_id;

        const { data: recent, error: recentError } = await supabase
          .from('provider_screenings')
          .select('provider_id')
          .eq('source', SCREENING_SOURCE)
          .gte('created_at', cutoff)
          .in(
            'provider_id',
            rows.map((r) => r.provider_id),
          );
        if (recentError) throw new Error(`Failed to load screenings: ${recentError.message}`);
        const done = new Set((recent ?? []).map((r) => r.provider_id as string));
        for (const row of rows) {
          if (done.has(row.provider_id) || selected.length >= limit) continue;
          const screeningProvider = toScreeningProvider(row);
          if (missingLinks) {
            const held = await loadHeldPlatforms(supabase, row.provider_id);
            if (DELIVERY_PLATFORMS.every((platform) => held.has(platform))) continue;
            screeningProvider.heldPlatforms = held;
          }
          selected.push(screeningProvider);
        }
        if (rows.length < PAGE_SIZE) break;
      }
      return selected;
    },

    async insertScreening(row) {
      const { error } = await supabase.from('provider_screenings').insert(row);
      if (error) throw new Error(`Failed to insert screening: ${error.message}`);
    },

    async applyFields(providerId, rpcPayload) {
      const { error } = await supabase.rpc('admin_update_provider', {
        p_provider_id: providerId,
        p_data: rpcPayload,
      });
      if (error) throw new Error(`admin_update_provider failed: ${error.message}`);
    },

    stageImages: (row) => stageImageCandidate(supabase, row),
    heldPlatforms: (providerId) => loadHeldPlatforms(supabase, providerId),
  };
}

export function createWebsiteLinkDeps(supabase: SupabaseClient): WebsiteLinkDeps {
  return {
    fetchPage: (url) => fetchPublicPage(url),
    // The stage dedupe ignores rejected rows; skip those platforms so a rejection sticks.
    existingPlatforms: (providerId) =>
      loadHeldPlatforms(supabase, providerId, {
        candidateStatus: 'rejected',
        sourcePrefix: [WEBSITE_SOURCE_PREFIX, GOOGLE_ORDER_SOURCE_PREFIX],
      }),
    stage: (row) => stageImageCandidate(supabase, row),
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

  const limit = resolveLimit(argValue('--limit') ?? process.env.INPUT_LIMIT);
  const missingLinks =
    args.includes('--missing-links') || process.env.INPUT_MODE === 'missing_links';
  const providerId = (argValue('--provider-id') ?? process.env.INPUT_PROVIDER_ID ?? '').trim();
  if (providerId && !UUID_RE.test(providerId)) throw new Error('provider id must be a UUID');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.APIFY_API_TOKEN;
  if (!url || !key || !token) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN',
    );
  }

  console.log(`Mode: ${apply ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  if (missingLinks) console.log('Selection: approved food providers missing a delivery link');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const summary = await runScreening({
    store: createSupabaseStore(supabase),
    fetchPlaces: (p, actorOptions) => fetchGoogleMapsPlaces(p, token, actorOptions),
    log: console.log,
    options: { apply, limit, providerId: providerId || undefined, missingLinks },
    websiteLinks: createWebsiteLinkDeps(supabase),
  });

  console.log(
    `SUMMARY processed=${summary.processed} flagged=${summary.flagged} review=${summary.review} ` +
      `clear=${summary.clear} failed=${summary.failed} cost_usd=${summary.estimatedCostUsd.toFixed(4)}`,
  );
  console.log(
    `(max ${GOOGLE_MAPS_SETTINGS.maxImages} images and ${GOOGLE_MAPS_SETTINGS.maxReviews} reviews per place)`,
  );
  process.exit(exitCodeFor(summary));
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
