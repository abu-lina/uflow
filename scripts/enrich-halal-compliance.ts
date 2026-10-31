/**
 * Chain the halal compliance checks for approved food providers (#823).
 *
 * Per provider:
 *   1. Google Maps screening (shared runScreening from screen-provider-google-maps.ts), only
 *      when the provider holds no active delivery link yet. It stages delivery links for review
 *      and returns the matched place.
 *   2. Early exit: a definite alcohol indicator in the place's additionalInfo ("Alcohol",
 *      "Beer", "Wine", ...) or a bar/pub category stages no_alcohol=false and skips the menu.
 *   3. Menu item names from food_menu rows already written by enrich-delivery-menus.ts, or
 *      fetched through the same Wolt/Uber Eats cascade when none exist (nothing is written
 *      to food_menu here).
 *   4. detectCompliance() on those names. Menu text is the only source; images are not checked.
 *
 * Results are staged as pending `no_alcohol` / `no_pork` enrichment candidates (source
 * `halal_compliance`) for owner review in /dashboard/enrichment. Nothing is applied. Staged:
 * a violation (definite alcohol or pork) as false, and an explicit alcohol-free menu signal as
 * true. A menu without pork keywords proves nothing, so it stages no no_pork=true. A value the
 * provider already holds is not staged again, and a rejected candidate stays rejected.
 *
 * Usage:
 *   npx tsx scripts/enrich-halal-compliance.ts --dry-run                  # default, writes nothing
 *   npx tsx scripts/enrich-halal-compliance.ts --apply --provider-id <uuid>
 *   npx tsx scripts/enrich-halal-compliance.ts --apply --limit 20
 *
 * Dry runs still call Apify (Maps and menus) so the log shows what would happen; they stage nothing.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { fetchGoogleMapsPlaces } from '../src/lib/enrichment/google-maps/apify-google-maps-client';
import { matchPlace } from '../src/lib/enrichment/google-maps/place-screening';
import {
  detectCompliance,
  type ComplianceResult,
} from '../src/lib/enrichment/delivery-platform/compliance-detector';
import { fetchWoltRestaurant } from '../src/lib/enrichment/delivery-platform/apify-wolt-client';
import { fetchUberEatsMenu } from '../src/lib/enrichment/delivery-platform/apify-ubereats-client';
import {
  createSupabaseStore as createScreeningStore,
  createWebsiteLinkDeps,
  resolveLimit,
  runScreening,
  type ApifyPlace,
} from './screen-provider-google-maps';
import { runMenuCascade, type DeliveryLinkRow, type FetchedMenu } from './enrich-delivery-menus';
import { stageImageCandidate, type StageCandidateResult } from './enrich-images';

export type { ApifyPlace, DeliveryLinkRow };

const SOURCE = 'halal_compliance';
const EXISTING_STATUSES = ['pending', 'approved', 'applied'];
const MAPS_FALLBACK_URL = 'https://www.google.com/maps';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps attribute keys that mean the venue serves alcohol (ApifyPlace.additionalInfo, English). */
const ALCOHOL_ATTRIBUTE_RE = /^(?:serves )?(?:alcohol|beer|wine|cocktails|hard liquor|spirits)$/i;

/** Maps categories of venues whose business is alcohol. Exact match on categoryName, lowercase. */
const ALCOHOL_CATEGORIES: ReadonlySet<string> = new Set([
  'bar',
  'pub',
  'irish pub',
  'gastropub',
  'brewpub',
  'sports bar',
  'cocktail bar',
  'wine bar',
  'beer garden',
  'biergarten',
  'kneipe',
  'brewery',
  'brauerei',
  'night club',
  'nightclub',
]);

export interface ComplianceProvider {
  provider_id: string;
  provider_name: string;
  no_alcohol: boolean | null;
  no_pork: boolean | null;
}

export interface ComplianceStore {
  listProviders(opts: { providerId?: string; limit: number }): Promise<ComplianceProvider[]>;
  /** Active delivery links the provider holds. */
  loadDeliveryLinks(provider: ComplianceProvider): Promise<DeliveryLinkRow[]>;
  /** Item names of food_menu rows already written for the provider. */
  loadMenuItemNames(providerId: string): Promise<string[]>;
  stageCandidate(row: Record<string, unknown>): Promise<StageCandidateResult>;
}

export interface CliOptions {
  apply: boolean;
  limit: number;
  providerId?: string;
}

export interface ComplianceSummary {
  processed: number;
  staged: number;
  failed: number;
}

export function parseCliArgs(args: string[]): CliOptions {
  const apply = args.includes('--apply');
  if (apply && args.includes('--dry-run')) throw new Error('use either --apply or --dry-run');
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const providerId = value('--provider-id')?.trim();
  if (args.includes('--provider-id') && !(providerId && UUID_RE.test(providerId)))
    throw new Error('provider id must be a UUID');
  return {
    apply,
    limit: resolveLimit(value('--limit')),
    providerId: providerId || undefined,
  };
}

/** Why the place says it serves alcohol, or null when it gives no definite indicator. */
export function mapsAlcoholIndicator(place: ApifyPlace): string | null {
  for (const group of Object.values(place.additionalInfo ?? {})) {
    for (const entry of group) {
      for (const [key, value] of Object.entries(entry)) {
        if (value === true && ALCOHOL_ATTRIBUTE_RE.test(key.trim())) return `attribute "${key}"`;
      }
    }
  }
  const category = place.categoryName?.trim();
  if (category && ALCOHOL_CATEGORIES.has(category.toLowerCase())) return `category "${category}"`;
  return null;
}

interface Proposal {
  field: 'no_alcohol' | 'no_pork';
  value: boolean;
  sourceUrl: string;
}

function proposalsFor(result: ComplianceResult, sourceUrl: string): Proposal[] {
  const proposals: Proposal[] = [];
  if (result.alcoholSignal === 'definite_alcohol')
    proposals.push({ field: 'no_alcohol', value: false, sourceUrl });
  else if (result.alcoholSignal === 'definite_no_alcohol')
    proposals.push({ field: 'no_alcohol', value: true, sourceUrl });
  if (result.porkSignal === 'definite_pork')
    proposals.push({ field: 'no_pork', value: false, sourceUrl });
  return proposals;
}

export async function runHalalCompliance(deps: {
  store: ComplianceStore;
  /** Runs the shared Google Maps screening for one provider and returns the matched place. */
  screenProvider: (
    provider: ComplianceProvider,
    opts: { apply: boolean },
  ) => Promise<ApifyPlace | null>;
  fetchMenu: (link: DeliveryLinkRow) => Promise<FetchedMenu>;
  log?: (message: string) => void;
  options: CliOptions;
}): Promise<ComplianceSummary> {
  const { store, screenProvider, fetchMenu, options } = deps;
  const log = deps.log ?? (() => undefined);
  const { apply } = options;
  const providers = await store.listProviders({
    providerId: options.providerId,
    limit: options.limit,
  });
  const summary: ComplianceSummary = { processed: providers.length, staged: 0, failed: 0 };

  for (const provider of providers) {
    const steps: string[] = [];
    const outcomes: string[] = [];
    try {
      let links = await store.loadDeliveryLinks(provider);

      if (links.length === 0) {
        const place = await screenProvider(provider, { apply });
        steps.push(place ? 'maps: matched' : 'maps: no match');
        const indicator = place ? mapsAlcoholIndicator(place) : null;
        if (place && indicator) {
          steps.push(`alcohol indicator (${indicator})`, 'menu skipped');
          await stageAll(
            provider,
            [{ field: 'no_alcohol', value: false, sourceUrl: place.url ?? MAPS_FALLBACK_URL }],
            outcomes,
          );
          log(formatLine(provider, steps, outcomes));
          continue;
        }
        links = await store.loadDeliveryLinks(provider);
      } else {
        steps.push('maps: skipped (links held)');
      }

      let names = await store.loadMenuItemNames(provider.provider_id);
      let sourceUrl = links[0]?.platform_url ?? MAPS_FALLBACK_URL;
      if (names.length > 0) {
        steps.push(`menu: ${names.length} stored items`);
      } else if (links.length > 0) {
        const cascade = await runMenuCascade({ links, fetchMenu });
        if (cascade.winner) {
          names = cascade.winner.menu.menuItems.map((m) => m.name_de);
          sourceUrl = cascade.winner.link.platform_url;
          steps.push(`menu: ${cascade.winner.link.platform} ${names.length} items`);
        } else {
          steps.push('menu: no items from any platform');
        }
      } else {
        steps.push('menu: no delivery links');
      }

      if (names.length > 0) {
        const result = detectCompliance(names);
        steps.push(`signals alcohol=${result.alcoholSignal} pork=${result.porkSignal}`);
        await stageAll(provider, proposalsFor(result, sourceUrl), outcomes);
      }
      log(formatLine(provider, steps, outcomes));
    } catch (err) {
      summary.failed += 1;
      log(
        `FAIL ${provider.provider_name} (${provider.provider_id}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return summary;

  async function stageAll(
    provider: ComplianceProvider,
    proposals: Proposal[],
    outcomes: string[],
  ): Promise<void> {
    for (const { field, value, sourceUrl } of proposals) {
      const current = provider[field];
      const label = `${field}=${value}`;
      if (current === value) {
        outcomes.push(`skip ${label} (already set)`);
        continue;
      }
      if (!apply) {
        outcomes.push(`WOULD STAGE ${label}`);
        continue;
      }
      const outcome = await store.stageCandidate({
        provider_id: provider.provider_id,
        source: SOURCE,
        source_url: sourceUrl,
        field_name: field,
        proposed_value: value,
        current_value: current,
        status: 'pending',
        enriched_at: new Date().toISOString(),
        enrichment_type: 'data',
      });
      if (outcome.outcome === 'staged') summary.staged += 1;
      outcomes.push(
        outcome.outcome === 'failed'
          ? `FAILED to stage ${label}: ${outcome.error.message}`
          : outcome.outcome === 'staged'
            ? `STAGE ${label}`
            : `skip ${label} (candidate exists)`,
      );
    }
  }
}

function formatLine(provider: ComplianceProvider, steps: string[], outcomes: string[]): string {
  return `${provider.provider_name} (${provider.provider_id}): ${steps.join(' | ')} | ${
    outcomes.length > 0 ? outcomes.join(', ') : 'nothing to stage'
  }`;
}

export function createSupabaseStore(supabase: SupabaseClient): ComplianceStore {
  return {
    async listProviders({ providerId, limit }) {
      let query = supabase
        .from('providers')
        .select('provider_id, provider_name, food_providers(no_alcohol, no_pork)')
        .eq('review_status', 'pending')
        .eq('listing_type', 'food');
      if (providerId) query = query.eq('provider_id', providerId);
      const { data, error } = await query.order('provider_id', { ascending: true }).limit(limit);
      if (error) throw new Error(`Failed to load providers: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>) => {
        const fp = row.food_providers as { no_alcohol?: boolean; no_pork?: boolean } | null;
        return {
          provider_id: row.provider_id as string,
          provider_name: row.provider_name as string,
          no_alcohol: fp?.no_alcohol ?? null,
          no_pork: fp?.no_pork ?? null,
        };
      });
    },

    async loadDeliveryLinks(provider) {
      const { data, error } = await supabase
        .from('provider_delivery_links')
        .select('platform, platform_url, platform_slug, apify_checked_at')
        .eq('provider_id', provider.provider_id)
        .eq('is_active', true);
      if (error) throw new Error(`Failed to load delivery links: ${error.message}`);
      return (data ?? []).map((r) => ({
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        platform: r.platform as string,
        platform_url: r.platform_url as string,
        platform_slug: (r.platform_slug as string | null) ?? null,
        apify_checked_at: (r.apify_checked_at as string | null) ?? null,
      }));
    },

    async loadMenuItemNames(providerId) {
      const { data, error } = await supabase
        .from('food_menu')
        .select('name_de')
        .eq('provider_id', providerId);
      if (error) throw new Error(`Failed to load menu: ${error.message}`);
      return (data ?? []).map((r) => r.name_de as string).filter(Boolean);
    },

    // Rejected rows count as existing, so an owner's rejection sticks across runs.
    stageCandidate: (row) =>
      stageImageCandidate(supabase, row, { statuses: [...EXISTING_STATUSES, 'rejected'] }),
  };
}

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  const options = parseCliArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.APIFY_API_TOKEN;
  if (!url || !key || !token) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN',
    );
  }

  console.log(`Mode: ${options.apply ? 'APPLY (staging candidates)' : 'DRY-RUN (no writes)'}`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const screeningStore = createScreeningStore(supabase);
  const websiteLinks = createWebsiteLinkDeps(supabase);

  const summary = await runHalalCompliance({
    store: createSupabaseStore(supabase),
    log: console.log,
    options,
    // Reuses runScreening in missing-links mode (links only, no public field writes) and
    // captures the place it fetched, so no second Apify call is paid for.
    async screenProvider(provider, { apply }) {
      let matched: ApifyPlace | null = null;
      await runScreening({
        store: screeningStore,
        websiteLinks,
        log: () => undefined,
        options: { apply, limit: 1, providerId: provider.provider_id, missingLinks: true },
        async fetchPlaces(screeningProvider, actorOptions) {
          const places = await fetchGoogleMapsPlaces(screeningProvider, token, actorOptions);
          matched = matchPlace(screeningProvider, places)?.place ?? null;
          return places;
        },
      });
      return matched;
    },
    async fetchMenu(link) {
      if (link.platform === 'wolt') {
        const result = await fetchWoltRestaurant(link.platform_url, token);
        return result ? { menuItems: result.menuItems, wolt: result } : { menuItems: [] };
      }
      if (link.platform === 'ubereats') {
        return { menuItems: await fetchUberEatsMenu(link.platform_url, token) };
      }
      throw new Error(`No menu fetcher for platform ${link.platform}`);
    },
  });

  console.log(
    `SUMMARY processed=${summary.processed} staged=${summary.staged} failed=${summary.failed}`,
  );
  process.exit(summary.processed > 0 && summary.failed === summary.processed ? 1 : 0);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
