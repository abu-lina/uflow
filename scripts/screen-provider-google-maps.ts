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
 * private IPs blocked) and stages Lieferando/Wolt/Uber Eats links as pending
 * `delivery_links` enrichment candidates for review in /dashboard/enrichment (#801).
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
  extractDeliveryLinksFromHtml,
  fetchPublicPage,
  WEBSITE_SOURCE_PREFIX,
} from '../src/lib/enrichment/website-delivery-links';

export type { ApifyPlace };

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 10;
const RECENT_DAYS = 30;
const PAGE_SIZE = 50;
const SCREENING_SOURCE = 'google_maps_apify';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ScreeningProvider extends MatchableProvider, EnrichableProvider {
  imageUrls: string[];
}

export interface ScreeningRow {
  provider_id: string;
  source: typeof SCREENING_SOURCE;
  status: ScreeningResult['status'];
  flags: ScreeningResult['flags'];
  raw: ScreeningResult['raw'];
}

export interface ScreeningStore {
  listProviders(opts: { providerId?: string; limit: number }): Promise<ScreeningProvider[]>;
  insertScreening(row: ScreeningRow): Promise<void>;
  applyFields(providerId: string, rpcPayload: Record<string, unknown>): Promise<void>;
  stageImages(row: Record<string, unknown>): Promise<StageCandidateResult>;
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

export async function runScreening(deps: {
  store: ScreeningStore;
  fetchPlaces: (provider: ScreeningProvider) => Promise<ApifyPlace[]>;
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
      try {
        places = await fetchPlaces(provider);
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
        await enrich(provider, match.place);
        if (websiteLinks) await stageWebsiteLinks(provider, websiteLinks);
      }
    } catch (err) {
      summary.failed += 1;
      log(`FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;

  // Reads the provider's own site; any failure only logs, it never fails the run.
  async function stageWebsiteLinks(
    provider: ScreeningProvider,
    links: WebsiteLinkDeps,
  ): Promise<void> {
    const label = `${provider.provider_id} ${provider.provider_name}`;
    const site = provider.social_website?.trim();
    if (!site) return;
    try {
      const page = await links.fetchPage(site);
      const found = extractDeliveryLinksFromHtml(page.html, page.url);
      if (found.length === 0) return;
      const held = await links.existingPlatforms(provider.provider_id);
      for (const link of found.filter((l) => !held.has(l.platform))) {
        log(
          `  ${apply ? 'STAGE' : 'WOULD STAGE'} delivery link ${link.platform} ${link.platform_url}`,
        );
        if (!apply) continue;
        const outcome = await links.stage(
          buildWebsiteDeliveryCandidate(provider.provider_id, page.url, link),
        );
        if (outcome.outcome === 'failed')
          log(`WARN ${label}: delivery candidate not staged: ${formatStageError(outcome.error)}`);
      }
    } catch (err) {
      log(
        `WARN ${label}: website links skipped: ${err instanceof Error ? err.message : String(err)}`,
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
        status: 'pending',
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
  'provider_id, provider_name, address_street, address_zip, address_city, provider_description, has_parking, family_friendly, children_friendly, contact_phone, social_website, social_instagram, opening_hours, provider_images, locations(location_id, location_latitude, location_longitude, is_primary, address_street, address_zip, address_city)';

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
    latitude: primary?.location_latitude ?? null,
    longitude: primary?.location_longitude ?? null,
    primaryLocationId: primary?.location_id ?? null,
  };
}

export function createSupabaseStore(supabase: SupabaseClient): ScreeningStore {
  return {
    async listProviders({ providerId, limit }) {
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
        let query = supabase
          .from('providers')
          .select(PROVIDER_COLUMNS)
          .eq('review_status', 'pending');
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
          if (!done.has(row.provider_id) && selected.length < limit) {
            selected.push(toScreeningProvider(row));
          }
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
  };
}

export function createWebsiteLinkDeps(supabase: SupabaseClient): WebsiteLinkDeps {
  return {
    fetchPage: (url) => fetchPublicPage(url),
    async existingPlatforms(providerId) {
      const { data, error } = await supabase
        .from('provider_delivery_links')
        .select('platform')
        .eq('provider_id', providerId);
      if (error) throw new Error(`Failed to load delivery links: ${error.message}`);
      const held = new Set((data ?? []).map((r) => r.platform as string));

      // The stage dedupe ignores rejected rows; skip those platforms so a rejection sticks.
      const { data: rejected, error: rejectedError } = await supabase
        .from('enrichment_candidates')
        .select('source')
        .eq('provider_id', providerId)
        .eq('field_name', 'delivery_links')
        .eq('status', 'rejected')
        .like('source', `${WEBSITE_SOURCE_PREFIX}:%`);
      if (rejectedError)
        throw new Error(`Failed to load rejected candidates: ${rejectedError.message}`);
      for (const row of rejected ?? []) {
        held.add((row.source as string).slice(WEBSITE_SOURCE_PREFIX.length + 1));
      }
      return held;
    },
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
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const summary = await runScreening({
    store: createSupabaseStore(supabase),
    fetchPlaces: (p) => fetchGoogleMapsPlaces(p, token),
    log: console.log,
    options: { apply, limit, providerId: providerId || undefined },
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
