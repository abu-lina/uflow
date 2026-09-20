/**
 * scripts/enrich-providers.ts
 *
 * Provider Enrichment Pipeline CLI — Plan 065, Milestone 2
 *
 * Re-fetches approved providers' source pages and generates enrichment
 * candidates for changed fields. Candidates stage in enrichment_candidates
 * for admin review (ADR-007).
 *
 * ─── IMPORTANT OPERATIONAL NOTES ───────────────────────────────────────────
 * • Always run with --dry-run (default) first to inspect changes.
 * • The script uses SUPABASE_SERVICE_ROLE_KEY (admin/service-role access).
 * • Results are staged in enrichment_candidates — NOT directly applied.
 * • Rate-limit: ~250ms delay between page fetches.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npx tsx scripts/enrich-providers.ts --dry-run --source joinhalal
 *   npx tsx scripts/enrich-providers.ts --dry-run --source joinhalal --limit 10
 *   npx tsx scripts/enrich-providers.ts --write --source joinhalal --limit 50
 *   npx tsx scripts/enrich-providers.ts --write --source joinhalal
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  extractSchemaOrgFromHtml,
  extractSpeisen,
  extractEnrichmentData,
  extractDeliveryLinks,
  extractInstagramFromSameAs,
  type DeliveryLink,
} from '../src/utils/joinhalal-parser';
import { resolveOfferIds, type Offer } from '../src/lib/import/joinhalal';
import {
  buildEnrichmentCandidates,
  type ProviderSnapshot,
  type ParsedEnrichmentData,
  type EnrichmentCandidate,
  type MenuItem,
} from '../src/lib/enrichment/joinhalal-enricher';
import {
  enrichFromWolt,
  type DeliveryPlatformSnapshot,
} from '../src/lib/enrichment/delivery-enricher';
import {
  fetchWoltRestaurant,
  type ApifyWoltResult,
} from '../src/lib/enrichment/delivery-platform/apify-wolt-client';
import { createWoltClient } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { StaticCityGeocoder } from '../src/lib/enrichment/delivery-platform/geocoder';
import { createUberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-client';
import { enrichFromUberEats } from '../src/lib/enrichment/delivery-platform/ubereats-enricher';
import {
  buildAutoApplyPayload,
  LOCATION_FIELDS,
  type AutoApplyInput,
} from '../src/lib/enrichment/auto-apply-payload';
import { enrichFromLieferando } from '../src/lib/enrichment/delivery-platform/lieferando-enricher';
import { createLieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-client';
import {
  mapCuisineToCategory,
  type CategoryRow,
} from '../src/lib/enrichment/cuisine-category-mapper';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables.');
  console.error(
    '   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
  );
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_DELAY_MS = 250;
const USER_AGENT = 'UFlow-Enrichment/1.0 (+https://ummahflow.com/enrichment)';
const CIRCUIT_BREAKER_THRESHOLD = 0.2; // 20% failure threshold

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isWrite = args.includes('--write');
const modeArg = getArgValue('--mode');

type RunMode = 'dry-run' | 'write' | 'auto-apply';

let mode: RunMode;
if (modeArg) {
  if (!['dry-run', 'write', 'auto-apply'].includes(modeArg)) {
    console.error(`❌ Invalid mode: ${modeArg}. Must be one of: dry-run, write, auto-apply`);
    process.exit(1);
  }
  mode = modeArg as RunMode;
} else if (isWrite) {
  mode = 'write';
} else {
  mode = 'dry-run';
}

const isDryRun = mode === 'dry-run';
const isAutoApply = mode === 'auto-apply';
const isWriteMode = mode === 'write';

const source = getArgValue('--source') ?? 'joinhalal';
const limitArg = getArgValue('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const providerIdFilter = getArgValue('--provider-id');

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

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
  offers_ids?: string[] | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  enrichment_eligible: boolean;
  provider_description: string | null;
  opening_hours: unknown;
  location_latitude: number | null;
  location_longitude: number | null;
  category_id: string | null;
}

interface RunStats {
  source: string;
  triggeredBy: string;
  providersSelected: number;
  providersProcessed: number;
  candidatesCreated: number;
  unchangedCount: number;
  failureCount: number;
  skippedCount: number;
  circuitBreakerTriggered: boolean;
  startedAt: string;
  finishedAt?: string;
  autoAppliedCount: number;
  autoAppliedFields: string[];
  sourceStats?: Record<
    string,
    {
      providersSelected: number;
      providersProcessed: number;
      candidatesCreated: number;
      unchangedCount: number;
      failureCount: number;
      autoAppliedCount: number;
    }
  >;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeLabel =
    mode === 'auto-apply'
      ? 'AUTO-APPLY (direct write)'
      : mode === 'write'
        ? 'WRITE (staging candidates)'
        : 'DRY-RUN (preview only)';
  console.log(`\n🔄 Provider Enrichment Pipeline`);
  console.log(`   Mode: ${modeLabel}`);
  console.log(`   Source: ${source}`);
  console.log(`   Limit: ${limit ?? 'all eligible'}\n`);

  const stats: RunStats = {
    source,
    triggeredBy:
      mode === 'auto-apply' ? 'cli_auto_apply' : mode === 'write' ? 'cli_write' : 'cli_dry_run',
    providersSelected: 0,
    providersProcessed: 0,
    candidatesCreated: 0,
    unchangedCount: 0,
    failureCount: 0,
    skippedCount: 0,
    circuitBreakerTriggered: false,
    startedAt: new Date().toISOString(),
    autoAppliedCount: 0,
    autoAppliedFields: [],
  };

  // ─── Pending Enrichments ────────────────────────────────────────────────
  // Process pending_enrichments queue before running source-specific enrichment.
  // Newly created food providers are enqueued by the webhook and get enriched
  // before the scheduled run's main batch.
  if (isAutoApply) {
    const processedIds = await processPendingEnrichments(stats);
    if (processedIds.size > 0) {
      console.log(`  📋 Processed ${processedIds.size} pending enrichment(s)\n`);
    }
  }

  if (source === 'wolt-direct') {
    await runWoltDirectEnrichment(stats, mode, limit);
    return;
  }

  if (source === 'wolt') {
    await runWoltEnrichment(stats, mode, limit);
    return;
  }

  if (source === 'lieferando') {
    await runLieferandoEnrichment(stats, mode, limit);
    return;
  }

  if (
    isAutoApply &&
    !['wolt', 'ubereats', 'joinhalal', 'lieferando', 'wolt-direct'].includes(source)
  ) {
    console.error(
      `❌ Auto-apply mode is only supported for 'wolt', 'ubereats', 'joinhalal', 'lieferando', and 'wolt-direct' sources.`,
    );
    process.exit(1);
  }

  if (source !== 'joinhalal' && source !== 'ubereats') {
    console.error(
      `❌ Unsupported source: ${source}. Only 'joinhalal', 'wolt', 'ubereats', 'lieferando', and 'wolt-direct' are supported.`,
    );
    process.exit(1);
  }

  if (source === 'ubereats') {
    await runUberEatsEnrichment(stats, mode, limit);
    return;
  }

  if (source !== 'joinhalal') {
    console.error(
      `❌ Unsupported source: ${source}. Only 'joinhalal', 'wolt', and 'lieferando' are supported.`,
    );
    process.exit(1);
  }

  // 1. Load offers catalog for resolving Speisen → offer IDs
  const { data: offersData, error: offersError } = await supabase
    .from('offers')
    .select('offer_id, name_de');
  if (offersError) {
    console.error('❌ Failed to load offers catalog:', offersError.message);
    process.exit(1);
  }
  const offers: Offer[] = offersData ?? [];
  console.log(`  📚 Loaded ${offers.length} offers from catalog`);

  // 1b. Load categories catalog for cuisine → category_id mapping
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('category_id, name_de, name_en');
  if (categoriesError) {
    console.error('❌ Failed to load categories catalog:', categoriesError.message);
    process.exit(1);
  }
  const categories: CategoryRow[] = categoriesData ?? [];
  console.log(`  📚 Loaded ${categories.length} categories from catalog`);

  // 2. Fetch eligible providers
  let query = supabase
    .from('providers')
    .select(
      'provider_id, provider_name, import_source, import_source_url, contact_phone, social_website, social_instagram, address_street, address_zip, address_city, address_country, enrichment_eligible, provider_description, opening_hours, location_latitude, location_longitude, category_id',
    )
    .eq('import_source', source)
    .eq('enrichment_eligible', true)
    .is('provider_owner_id', null)
    .not('import_source_url', 'is', null);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: providers, error: provError } = await query;
  if (provError) {
    console.error('❌ Failed to fetch providers:', provError.message);
    process.exit(1);
  }

  const providerRows = (providers ?? []) as ProviderRow[];
  stats.providersSelected = providerRows.length;
  console.log(`  📋 Found ${providerRows.length} eligible providers\n`);

  if (providerRows.length === 0) {
    console.log('  ℹ️  No eligible providers found. Nothing to enrich.');
    await writeRunLog(stats);
    return;
  }

  // 3. Process each provider
  const allCandidates: (EnrichmentCandidate & { providerName: string })[] = [];

  for (const provider of providerRows) {
    // Circuit breaker check
    if (stats.providersProcessed > 0) {
      const failRate = stats.failureCount / stats.providersProcessed;
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
        console.error(
          `\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`,
        );
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    const url = provider.import_source_url!;
    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    try {
      const html = await fetchWithDelay(url);
      stats.providersProcessed++;

      const parsed = parseEnrichmentData(html, offers, categories);
      if (!parsed) {
        console.log('⚠️  no parseable data');
        stats.failureCount++;
        continue;
      }

      const snapshot: ProviderSnapshot = {
        provider_id: provider.provider_id,
        offers_ids: provider.offers_ids,
        contact_phone: provider.contact_phone,
        social_website: provider.social_website,
        social_instagram: provider.social_instagram,
        address_street: provider.address_street,
        address_zip: provider.address_zip,
        address_city: provider.address_city,
        address_country: provider.address_country,
        provider_description: provider.provider_description,
        opening_hours: provider.opening_hours,
        location_latitude: provider.location_latitude,
        location_longitude: provider.location_longitude,
        category_id: provider.category_id,
      };

      const candidates = buildEnrichmentCandidates(snapshot, parsed, source, url);

      // Extract delivery platform links from Schema.org Lieferservice field
      let deliveryLinks: DeliveryLink[] = [];
      try {
        const schema = extractSchemaOrgFromHtml(html);
        if (schema) {
          deliveryLinks = extractDeliveryLinks(schema);
        }
      } catch {
        // Non-critical: delivery links are optional
      }

      const statusParts: string[] = [];

      if (candidates.length > 0) {
        if (isAutoApply) {
          const applied = await autoApplyJoinHalalFields(provider, candidates, stats);
          if (applied > 0) {
            statusParts.push(`${applied} field(s) auto-applied`);
          }
        } else {
          statusParts.push(`${candidates.length} candidate(s)`);
          for (const c of candidates) {
            allCandidates.push({ ...c, providerName: provider.provider_name });
          }
        }
      }

      if (parsed.menu_items && parsed.menu_items.length > 0) {
        if (isAutoApply) {
          await autoApplyMenuItems(provider, parsed.menu_items, stats);
          statusParts.push(`${parsed.menu_items.length} menu item(s) auto-applied`);
        } else {
          statusParts.push(
            `${parsed.menu_items.length} menu item(s) found (use --mode auto-apply to write)`,
          );
        }
      }

      if (deliveryLinks.length > 0) {
        if (isAutoApply) {
          await autoApplyDeliveryLinks(provider, deliveryLinks, stats);
          statusParts.push(`${deliveryLinks.length} delivery link(s) auto-applied`);
        } else {
          statusParts.push(
            `${deliveryLinks.length} delivery link(s) found (use --mode auto-apply to write)`,
          );
        }
      }

      // Stage provider_images as admin-review candidate (Fix 239-3).
      // provider_images is in ADMIN_CONTROLLED_FIELDS, so buildEnrichmentCandidates
      // skips it. We stage it manually as a pending candidate for admin review.
      const providerImage = (parsed as Record<string, unknown>)._provider_image as
        string | undefined;
      if (providerImage) {
        allCandidates.push({
          provider_id: provider.provider_id,
          source,
          source_url: url,
          field_name: 'provider_images',
          proposed_value: [providerImage],
          current_value: null,
          providerName: provider.provider_name,
        });
        statusParts.push('1 image candidate (admin review)');
      }

      if (statusParts.length === 0) {
        console.log('✅ no changes');
        stats.unchangedCount++;
      } else {
        console.log(`✅ ${statusParts.join(', ')}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      stats.failureCount++;
      stats.providersProcessed++;
    }
  }

  stats.candidatesCreated = allCandidates.length;
  stats.finishedAt = new Date().toISOString();

  // 4. Report
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📊 Enrichment Summary`);
  console.log(`     Selected:   ${stats.providersSelected}`);
  console.log(`     Processed:  ${stats.providersProcessed}`);
  console.log(`     Unchanged:  ${stats.unchangedCount}`);
  if (isAutoApply) {
    console.log(`     Auto-applied: ${stats.autoAppliedCount}`);
  } else {
    console.log(`     Candidates: ${stats.candidatesCreated}`);
  }
  console.log(`     Failed:     ${stats.failureCount}`);
  if (stats.skippedCount) {
    console.log(`     Skipped:    ${stats.skippedCount}`);
  }
  if (stats.circuitBreakerTriggered) {
    console.log(`     ⚡ Circuit breaker was triggered`);
  }
  if (isAutoApply && stats.autoAppliedFields.length > 0) {
    console.log(`     Fields:     ${[...new Set(stats.autoAppliedFields)].join(', ')}`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (!isAutoApply && allCandidates.length > 0) {
    console.log(`\n  📋 Candidate Preview (first 10):`);
    for (const c of allCandidates.slice(0, 10)) {
      console.log(
        `     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`,
      );
    }
    if (allCandidates.length > 10) {
      console.log(`     ... and ${allCandidates.length - 10} more`);
    }
  }

  // 5. Write candidates if not dry-run (skip during auto-apply — already applied directly)
  if (!isAutoApply && isWrite && allCandidates.length > 0) {
    console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
    let written = 0;

    for (const candidate of allCandidates) {
      const { error } = await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: candidate.provider_id,
          source: candidate.source,
          source_url: candidate.source_url,
          field_name: candidate.field_name,
          proposed_value: candidate.proposed_value,
          current_value: candidate.current_value,
          status: 'pending',
          enriched_at: new Date().toISOString(),
        },
        {
          // ignoreDuplicates: true → ON CONFLICT DO NOTHING
          // Required for partial unique indexes (idx_enrichment_candidates_dedup
          // has a WHERE status = 'pending' clause that ON CONFLICT (cols) without
          // the WHERE clause cannot match for DO UPDATE semantics).
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );

      if (error) {
        console.error(
          `     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`,
        );
      } else {
        written++;
      }
    }

    // Update last_enriched_at for processed providers
    const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];
    for (const pid of processedIds) {
      await supabase
        .from('providers')
        .update({ last_enriched_at: new Date().toISOString() })
        .eq('provider_id', pid);
    }

    console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);
  } else if (isAutoApply) {
    console.log(`\n  ✅ Auto-apply complete.`);
  } else if (isDryRun) {
    console.log(
      `\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply directly.`,
    );
  }

  // 6. Write run log
  await writeRunLog(stats);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEnrichmentData(
  html: string,
  offers: Offer[],
  categories: CategoryRow[] = [],
): ParsedEnrichmentData | null {
  const schema = extractSchemaOrgFromHtml(html);
  if (!schema) return null;

  const speisen = extractSpeisen(schema);
  const { matchedIds } = resolveOfferIds(speisen, offers);

  const parsed: ParsedEnrichmentData = {};

  if (matchedIds.length > 0) {
    parsed.offers_ids = matchedIds;
  }
  if (schema.telephone) {
    parsed.contact_phone = schema.telephone;
  }
  if (schema.url) {
    parsed.social_website = schema.url;
  }

  // Extract Instagram from sameAs links (Fix 239-3)
  const instagram = extractInstagramFromSameAs(schema.sameAs);
  if (instagram) {
    parsed.social_instagram = instagram;
  }

  const enrichmentData = extractEnrichmentData(schema);

  if (enrichmentData.description) {
    parsed.provider_description = enrichmentData.description;
  }
  if (enrichmentData.openingHours) {
    parsed.opening_hours = enrichmentData.openingHours;
  }
  if (enrichmentData.latitude !== null) {
    parsed.location_latitude = enrichmentData.latitude;
  }
  if (enrichmentData.longitude !== null) {
    parsed.location_longitude = enrichmentData.longitude;
  }

  // Map servesCuisine to category_id
  if (enrichmentData.servesCuisine && categories.length > 0) {
    const categoryId = mapCuisineToCategory(enrichmentData.servesCuisine, categories);
    if (categoryId) {
      parsed.category_id = categoryId;
    }
  }

  // Extract menu items from Speisen
  if (speisen.length > 0) {
    parsed.menu_items = speisen.map((name, i) => ({
      name_de: name,
      is_available: true,
      sort_order: i,
    }));
  }

  // Extract image for admin-review candidate (provider_images is admin-controlled,
  // so it goes through a separate path — not buildEnrichmentCandidates). Fix 239-3.
  if (enrichmentData.image) {
    (parsed as Record<string, unknown>)._provider_image = enrichmentData.image;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

async function fetchWithDelay(url: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function writeRunLog(stats: RunStats): Promise<void> {
  if (!stats.finishedAt) {
    stats.finishedAt = new Date().toISOString();
  }

  if (!stats.sourceStats) {
    stats.sourceStats = {
      [stats.source]: {
        providersSelected: stats.providersSelected,
        providersProcessed: stats.providersProcessed,
        candidatesCreated: stats.candidatesCreated,
        unchangedCount: stats.unchangedCount,
        failureCount: stats.failureCount,
        autoAppliedCount: stats.autoAppliedCount,
      },
    };
  }

  const { error } = await supabase.from('enrichment_run_logs').insert({
    source: stats.source,
    triggered_by: stats.triggeredBy,
    started_at: stats.startedAt,
    finished_at: stats.finishedAt,
    providers_selected: stats.providersSelected,
    providers_processed: stats.providersProcessed,
    candidates_created: stats.candidatesCreated,
    unchanged_count: stats.unchangedCount,
    failure_count: stats.failureCount,
    circuit_breaker_triggered: stats.circuitBreakerTriggered,
    auto_applied_fields: stats.autoAppliedFields.length > 0 ? stats.autoAppliedFields : null,
    source_stats: stats.sourceStats,
  });

  if (error) {
    console.error(`  ⚠️  Failed to write run log: ${error.message}`);
  } else {
    console.log(`  📝 Run log saved.`);
  }
}

// ─── Wolt Enrichment ──────────────────────────────────────────────────────────

async function runWoltEnrichment(
  stats: RunStats,
  mode: RunMode,
  limit: number | undefined,
): Promise<void> {
  const isWrite = mode === 'write';
  const isAutoApply = mode === 'auto-apply';
  console.log('  🌐 Wolt enrichment mode');

  // 1. Fetch eligible food providers
  let query = supabase
    .from('providers')
    .select(
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible',
    )
    .eq('listing_type', 'food')
    .eq('enrichment_eligible', true);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: providers, error: provError } = await query;
  if (provError) {
    console.error('❌ Failed to fetch providers:', provError.message);
    process.exit(1);
  }

  // Fetch no_alcohol from food_providers (extension table)
  const providerIds = (providers ?? []).map((p) => p.provider_id);
  let noAlcoholMap: Record<string, boolean | null> = {};
  if (providerIds.length > 0) {
    const { data: foodProviders, error: fpError } = await supabase
      .from('food_providers')
      .select('provider_id, no_alcohol')
      .in('provider_id', providerIds);
    if (!fpError && foodProviders) {
      for (const fp of foodProviders) {
        noAlcoholMap[fp.provider_id] = fp.no_alcohol ?? null;
      }
    }
  }

  const providerRows = providers ?? [];
  stats.providersSelected = providerRows.length;
  console.log(`  📋 Found ${providerRows.length} eligible food providers\n`);

  if (providerRows.length === 0) {
    console.log('  ℹ️  No eligible providers found. Nothing to enrich.');
    await writeRunLog(stats);
    return;
  }

  // 2. Create Wolt client
  const geocoder = new StaticCityGeocoder();
  const woltClient = createWoltClient(undefined, geocoder);

  // 3. Process each provider
  const allCandidates: (EnrichmentCandidate & { providerName: string })[] = [];
  // Track all matched providers (with sourceUrl) for delivery link writes,
  // independent of whether they produce enrichment candidates (Fix 239-1).
  const matchedWoltProviders: { providerId: string; providerName: string; sourceUrl: string }[] =
    [];

  for (const provider of providerRows) {
    // Circuit breaker check
    if (stats.providersProcessed > 0) {
      const failRate = stats.failureCount / stats.providersProcessed;
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
        console.error(
          `\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`,
        );
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
      console.log(
        `  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`,
      );
      stats.skippedCount = (stats.skippedCount || 0) + 1;
      continue;
    }

    try {
      const snapshot: DeliveryPlatformSnapshot = {
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        address_city: provider.address_city,
        listing_type: provider.listing_type,
        opening_hours: provider.opening_hours,
        no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
      };

      const result = await enrichFromWolt(snapshot, woltClient);
      stats.providersProcessed++;

      if (result.error) {
        const nonEssentialErrors = [
          'not in coverage area',
          'City not found',
          'No Lieferando restaurants found',
          'No Lieferando restaurant matched',
          'No UberEats venues found',
          'No venues found',
          'has no city set',
          'venue matched',
        ];
        const isNonEssential = nonEssentialErrors.some((e) => result.error!.includes(e));
        if (isNonEssential) {
          console.log(`⚠️  ${result.error}`);
          continue;
        }
        console.log(`⚠️  ${result.error}`);
        stats.failureCount++;
        continue;
      }

      // Track matched provider for delivery link write regardless of candidate count
      if (result.venueSlug) {
        const sourceUrl =
          result.candidates[0]?.source_url ?? `https://wolt.com/de/deu/venue/${result.venueSlug}`;
        matchedWoltProviders.push({
          providerId: provider.provider_id,
          providerName: provider.provider_name,
          sourceUrl,
        });
      }

      if (result.candidates.length === 0) {
        console.log('✅ no changes');
        stats.unchangedCount++;
      } else if (isAutoApply) {
        await autoApplyDeliveryFields(provider, result, noAlcoholMap, stats, 'wolt');
      } else {
        console.log(`📝 ${result.candidates.length} candidate(s) (slug: ${result.venueSlug})`);
        for (const c of result.candidates) {
          allCandidates.push({ ...c, providerName: provider.provider_name });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      stats.failureCount++;
      stats.providersProcessed++;
    }
  }

  stats.candidatesCreated = allCandidates.length;
  stats.finishedAt = new Date().toISOString();

  // 4. Report
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📊 Wolt Enrichment Summary`);
  console.log(`     Selected:   ${stats.providersSelected}`);
  console.log(`     Processed:  ${stats.providersProcessed}`);
  console.log(`     Unchanged:  ${stats.unchangedCount}`);
  if (isAutoApply) {
    console.log(`     Auto-applied: ${stats.autoAppliedCount}`);
  } else {
    console.log(`     Candidates: ${stats.candidatesCreated}`);
  }
  console.log(`     Failed:     ${stats.failureCount}`);
  if (stats.skippedCount) {
    console.log(`     Skipped:    ${stats.skippedCount}`);
  }
  if (stats.circuitBreakerTriggered) {
    console.log(`     ⚡ Circuit breaker was triggered`);
  }
  if (isAutoApply && stats.autoAppliedFields.length > 0) {
    console.log(`     Fields:     ${[...new Set(stats.autoAppliedFields)].join(', ')}`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (!isAutoApply && allCandidates.length > 0) {
    console.log(`\n  📋 Candidate Preview (first 10):`);
    for (const c of allCandidates.slice(0, 10)) {
      console.log(
        `     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`,
      );
    }
    if (allCandidates.length > 10) {
      console.log(`     ... and ${allCandidates.length - 10} more`);
    }
  }

  // 5. Write candidates + delivery links if not dry-run
  if (isWriteMode && allCandidates.length > 0) {
    console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
    let written = 0;

    for (const candidate of allCandidates) {
      const { error } = await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: candidate.provider_id,
          source: candidate.source,
          source_url: candidate.source_url,
          field_name: candidate.field_name,
          proposed_value: candidate.proposed_value,
          current_value: candidate.current_value,
          status: 'pending',
          enriched_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );

      if (error) {
        console.error(
          `     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`,
        );
      } else {
        written++;
      }
    }

    console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);

    // Update last_enriched_at for processed providers
    const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];
    for (const pid of processedIds) {
      await supabase
        .from('providers')
        .update({ last_enriched_at: new Date().toISOString() })
        .eq('provider_id', pid);
    }
  }

  // Write delivery links for ALL matched providers, regardless of candidate count (Fix 239-1).
  // A provider may match a Wolt venue but produce zero candidates (all "no-change"),
  // yet we still need the link for enrich-delivery-menus.ts to pick it up.
  if (isWriteMode && matchedWoltProviders.length > 0) {
    console.log(
      `  🔗 Writing delivery links for ${matchedWoltProviders.length} matched provider(s)...`,
    );
    let linksWritten = 0;
    for (const { providerId, providerName, sourceUrl } of matchedWoltProviders) {
      const slugMatch = sourceUrl.match(/venue\/([^/]+)$/);
      const slug = slugMatch ? slugMatch[1] : null;

      const { error: linkError } = await supabase.from('provider_delivery_links').upsert(
        {
          provider_id: providerId,
          platform: 'wolt',
          platform_url: sourceUrl,
          platform_slug: slug,
          is_active: true,
          last_verified_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,platform',
          ignoreDuplicates: false,
        },
      );

      if (linkError) {
        console.error(
          `     ❌ Failed to write delivery link for ${providerName}: ${linkError.message}`,
        );
      } else {
        linksWritten++;
      }
    }
    console.log(`  ✅ ${linksWritten}/${matchedWoltProviders.length} delivery links written`);
  } else if (isDryRun) {
    console.log(
      `\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`,
    );
  } else if (isAutoApply) {
    console.log(`  Auto-apply complete.`);
  }

  // 6. Write run log
  await writeRunLog(stats);
}

// ─── Lieferando Enrichment ────────────────────────────────────────────────────

async function runLieferandoEnrichment(
  stats: RunStats,
  mode: RunMode,
  limit: number | undefined,
): Promise<void> {
  const isWrite = mode === 'write';
  const isAutoApply = mode === 'auto-apply';
  console.log('  🌐 Lieferando enrichment mode');

  let query = supabase
    .from('providers')
    .select(
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible',
    )
    .eq('listing_type', 'food')
    .eq('enrichment_eligible', true);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: providers, error: provError } = await query;
  if (provError) {
    console.error('❌ Failed to fetch providers:', provError.message);
    process.exit(1);
  }

  const providerIds = (providers ?? []).map((p) => p.provider_id);
  let noAlcoholMap: Record<string, boolean | null> = {};
  if (providerIds.length > 0) {
    const { data: foodProviders, error: fpError } = await supabase
      .from('food_providers')
      .select('provider_id, no_alcohol')
      .in('provider_id', providerIds);
    if (!fpError && foodProviders) {
      for (const fp of foodProviders) {
        noAlcoholMap[fp.provider_id] = fp.no_alcohol ?? null;
      }
    }
  }

  const providerRows = providers ?? [];
  stats.providersSelected = providerRows.length;
  console.log(`  📋 Found ${providerRows.length} eligible food providers\n`);

  if (providerRows.length === 0) {
    console.log('  ℹ️  No eligible providers found. Nothing to enrich.');
    await writeRunLog(stats);
    return;
  }

  const geocoder = new StaticCityGeocoder();
  const lieferandoClient = createLieferandoClient();

  const allCandidates: (EnrichmentCandidate & { providerName: string })[] = [];
  // Track all matched providers for delivery link writes (Fix 239-1)
  const matchedLieferandoProviders: {
    providerId: string;
    providerName: string;
    sourceUrl: string;
  }[] = [];

  for (const provider of providerRows) {
    if (stats.providersProcessed > 0) {
      const failRate = stats.failureCount / stats.providersProcessed;
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
        console.error(
          `\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`,
        );
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
      console.log(
        `  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`,
      );
      stats.skippedCount = (stats.skippedCount || 0) + 1;
      continue;
    }

    try {
      const snapshot: DeliveryPlatformSnapshot = {
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        address_city: provider.address_city,
        listing_type: provider.listing_type,
        opening_hours: provider.opening_hours,
        no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
      };

      const result = await enrichFromLieferando(snapshot, lieferandoClient, geocoder);
      stats.providersProcessed++;

      if (result.error) {
        const nonEssentialErrors = [
          'not in coverage area',
          'City not found',
          'No Lieferando restaurants found',
          'No Lieferando restaurant matched',
          'No UberEats venues found',
          'No venues found',
          'has no city set',
          'venue matched',
        ];
        const isNonEssential = nonEssentialErrors.some((e) => result.error!.includes(e));
        if (isNonEssential) {
          console.log(`⚠️  ${result.error}`);
          continue;
        }
        console.log(`⚠️  ${result.error}`);
        stats.failureCount++;
        continue;
      }

      // Track matched provider for delivery link write regardless of candidate count
      if (result.venueSlug) {
        const sourceUrl =
          result.candidates[0]?.source_url ??
          `https://www.lieferando.de/speisekarte/${result.venueSlug}`;
        matchedLieferandoProviders.push({
          providerId: provider.provider_id,
          providerName: provider.provider_name,
          sourceUrl,
        });
      }

      if (result.candidates.length === 0) {
        console.log('✅ no changes');
        stats.unchangedCount++;
      } else if (isAutoApply) {
        await autoApplyLieferandoFields(provider, result, noAlcoholMap, stats);
      } else {
        console.log(`📝 ${result.candidates.length} candidate(s) (slug: ${result.venueSlug})`);
        for (const c of result.candidates) {
          allCandidates.push({ ...c, providerName: provider.provider_name });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      stats.failureCount++;
      stats.providersProcessed++;
    }
  }

  stats.candidatesCreated = allCandidates.length;
  stats.finishedAt = new Date().toISOString();

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📊 Lieferando Enrichment Summary`);
  console.log(`     Selected:   ${stats.providersSelected}`);
  console.log(`     Processed:  ${stats.providersProcessed}`);
  console.log(`     Unchanged:  ${stats.unchangedCount}`);
  if (isAutoApply) {
    console.log(`     Auto-applied: ${stats.autoAppliedCount}`);
  } else {
    console.log(`     Candidates: ${stats.candidatesCreated}`);
  }
  console.log(`     Failed:     ${stats.failureCount}`);
  if (stats.skippedCount) {
    console.log(`     Skipped:    ${stats.skippedCount}`);
  }
  if (stats.circuitBreakerTriggered) {
    console.log(`     ⚡ Circuit breaker was triggered`);
  }
  if (isAutoApply && stats.autoAppliedFields.length > 0) {
    console.log(`     Fields:     ${[...new Set(stats.autoAppliedFields)].join(', ')}`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (!isAutoApply && allCandidates.length > 0) {
    console.log(`\n  📋 Candidate Preview (first 10):`);
    for (const c of allCandidates.slice(0, 10)) {
      console.log(
        `     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`,
      );
    }
    if (allCandidates.length > 10) {
      console.log(`     ... and ${allCandidates.length - 10} more`);
    }
  }

  if (isWriteMode && allCandidates.length > 0) {
    console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
    let written = 0;

    for (const candidate of allCandidates) {
      const { error } = await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: candidate.provider_id,
          source: candidate.source,
          source_url: candidate.source_url,
          field_name: candidate.field_name,
          proposed_value: candidate.proposed_value,
          current_value: candidate.current_value,
          status: 'pending',
          enriched_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );

      if (error) {
        console.error(
          `     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`,
        );
      } else {
        written++;
      }
    }

    const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];
    for (const pid of processedIds) {
      await supabase
        .from('providers')
        .update({ last_enriched_at: new Date().toISOString() })
        .eq('provider_id', pid);
    }
    console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);
  }

  // Write delivery links for ALL matched providers, regardless of candidate count (Fix 239-1)
  if (isWriteMode && matchedLieferandoProviders.length > 0) {
    console.log(
      `  🔗 Writing delivery links for ${matchedLieferandoProviders.length} matched provider(s)...`,
    );
    let linksWritten = 0;
    for (const { providerId, sourceUrl } of matchedLieferandoProviders) {
      const slugMatch = sourceUrl.match(/\/speisekarte\/([^/]+)$/);
      const slug = slugMatch ? slugMatch[1] : null;

      const { error: linkError } = await supabase.from('provider_delivery_links').upsert(
        {
          provider_id: providerId,
          platform: 'lieferando',
          platform_url: sourceUrl,
          platform_slug: slug,
          is_active: true,
          last_verified_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,platform',
          ignoreDuplicates: false,
        },
      );

      if (linkError) {
        console.error(`     ❌ Failed to write delivery link: ${linkError.message}`);
      } else {
        linksWritten++;
      }
    }
    console.log(`  ✅ ${linksWritten}/${matchedLieferandoProviders.length} delivery links written`);
  } else if (isDryRun) {
    console.log(
      `\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`,
    );
  } else if (isAutoApply) {
    console.log(`  Auto-apply complete.`);
  }

  await writeRunLog(stats);
}

// ─── UberEats Enrichment ───────────────────────────────────────────────────────

async function runUberEatsEnrichment(
  stats: RunStats,
  mode: RunMode,
  limit: number | undefined,
): Promise<void> {
  const isWrite = mode === 'write';
  const isAutoApply = mode === 'auto-apply';

  try {
    console.log('  ⚠️ [EXPERIMENTAL] UberEats enrichment may fail due to anti-bot protections');
    console.log('  🌐 UberEats enrichment mode');

    // 1. Fetch eligible food providers
    let query = supabase
      .from('providers')
      .select(
        'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible',
      )
      .eq('listing_type', 'food')
      .eq('enrichment_eligible', true);

    if (limit) {
      query = query.limit(limit);
    }

    const { data: providers, error: provError } = await query;
    if (provError) {
      console.error('❌ Failed to fetch providers:', provError.message);
      await writeRunLog(stats);
      return;
    }

    // Fetch no_alcohol from food_providers (extension table)
    const providerIds = (providers ?? []).map((p) => p.provider_id);
    const noAlcoholMap: Record<string, boolean | null> = {};
    if (providerIds.length > 0) {
      const { data: foodProviders, error: fpError } = await supabase
        .from('food_providers')
        .select('provider_id, no_alcohol')
        .in('provider_id', providerIds);
      if (!fpError && foodProviders) {
        for (const fp of foodProviders) {
          noAlcoholMap[fp.provider_id] = fp.no_alcohol ?? null;
        }
      }
    }

    const providerRows = providers ?? [];
    stats.providersSelected = providerRows.length;
    console.log(`  📋 Found ${providerRows.length} eligible food providers\n`);

    if (providerRows.length === 0) {
      console.log('  ℹ️  No eligible providers found. Nothing to enrich.');
      await writeRunLog(stats);
      return;
    }

    // 2. Create UberEats client (one browser instance per run)
    const ubereatsClient = createUberEatsClient();

    const allCandidates: (EnrichmentCandidate & { providerName: string })[] = [];
    // Track all matched providers for delivery link writes (Fix 239-1)
    const matchedUberEatsProviders: {
      providerId: string;
      providerName: string;
      sourceUrl: string;
    }[] = [];

    // 2. Create UberEats client + geocoder
    const geocoder = new StaticCityGeocoder();

    for (const provider of providerRows) {
      // Circuit breaker check
      if (stats.providersProcessed > 0) {
        const failRate = stats.failureCount / stats.providersProcessed;
        if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
          console.error(
            `\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`,
          );
          stats.circuitBreakerTriggered = true;
          break;
        }
      }

      process.stdout.write(`  🔍 ${provider.provider_name} ... `);

      if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
        console.log(
          `  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`,
        );
        stats.skippedCount = (stats.skippedCount || 0) + 1;
        continue;
      }

      try {
        const snapshot: DeliveryPlatformSnapshot = {
          provider_id: provider.provider_id,
          provider_name: provider.provider_name,
          address_city: provider.address_city,
          listing_type: provider.listing_type,
          opening_hours: provider.opening_hours,
          no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
        };

        const result = await enrichFromUberEats(snapshot, ubereatsClient);
        stats.providersProcessed++;

        if (result.error) {
          const nonEssentialErrors = [
            'not in coverage area',
            'City not found',
            'No Lieferando restaurants found',
            'No Lieferando restaurant matched',
            'No UberEats venues found',
            'No venues found',
            'has no city set',
            'venue matched',
          ];
          const isNonEssential = nonEssentialErrors.some((e) => result.error!.includes(e));
          if (isNonEssential) {
            console.log(`⚠️  ${result.error}`);
            continue;
          }
          console.log(`⚠️  ${result.error}`);
          stats.failureCount++;
          continue;
        }

        // Track matched provider for delivery link write regardless of candidate count
        if (result.venueSlug) {
          const sourceUrl =
            result.candidates[0]?.source_url ??
            `https://www.ubereats.com/de/store/${result.venueSlug}`;
          matchedUberEatsProviders.push({
            providerId: provider.provider_id,
            providerName: provider.provider_name,
            sourceUrl,
          });
        }

        if (result.candidates.length === 0) {
          console.log('✅ no changes');
          stats.unchangedCount++;
        } else if (isAutoApply) {
          await autoApplyDeliveryFields(provider, result, noAlcoholMap, stats, 'ubereats');
        } else {
          console.log(`📝 ${result.candidates.length} candidate(s) (slug: ${result.venueSlug})`);
          for (const c of result.candidates) {
            allCandidates.push({ ...c, providerName: provider.provider_name });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`❌ ${msg}`);
        stats.failureCount++;
        stats.providersProcessed++;
      }
    }

    // 3. Clean up browser
    await ubereatsClient.close();

    stats.candidatesCreated = allCandidates.length;
    stats.finishedAt = new Date().toISOString();

    // 4. Report
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  📊 UberEats Enrichment Summary`);
    console.log(`     Selected:   ${stats.providersSelected}`);
    console.log(`     Processed:  ${stats.providersProcessed}`);
    console.log(`     Unchanged:  ${stats.unchangedCount}`);
    if (isAutoApply) {
      console.log(`     Auto-applied: ${stats.autoAppliedCount}`);
    } else {
      console.log(`     Candidates: ${stats.candidatesCreated}`);
    }
    console.log(`     Failed:     ${stats.failureCount}`);
    if (stats.skippedCount) {
      console.log(`     Skipped:    ${stats.skippedCount}`);
    }
    if (stats.circuitBreakerTriggered) {
      console.log(`     ⚡ Circuit breaker was triggered`);
    }
    if (isAutoApply && stats.autoAppliedFields.length > 0) {
      console.log(`     Fields:     ${[...new Set(stats.autoAppliedFields)].join(', ')}`);
    }
    console.log(`${'─'.repeat(60)}`);

    if (!isAutoApply && allCandidates.length > 0) {
      console.log(`\n  📋 Candidate Preview (first 10):`);
      for (const c of allCandidates.slice(0, 10)) {
        console.log(
          `     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`,
        );
      }
      if (allCandidates.length > 10) {
        console.log(`     ... and ${allCandidates.length - 10} more`);
      }
    }

    // 5. Write candidates if not dry-run
    if (isWrite && allCandidates.length > 0) {
      console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
      let written = 0;

      for (const candidate of allCandidates) {
        const { error } = await supabase.from('enrichment_candidates').upsert(
          {
            provider_id: candidate.provider_id,
            source: candidate.source,
            source_url: candidate.source_url,
            field_name: candidate.field_name,
            proposed_value: candidate.proposed_value,
            current_value: candidate.current_value,
            status: 'pending',
            enriched_at: new Date().toISOString(),
          },
          {
            onConflict: 'provider_id,field_name,source',
            ignoreDuplicates: true,
          },
        );

        if (error) {
          console.error(
            `     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`,
          );
        } else {
          written++;
        }
      }

      console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);

      const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];
      for (const pid of processedIds) {
        await supabase
          .from('providers')
          .update({ last_enriched_at: new Date().toISOString() })
          .eq('provider_id', pid);
      }
    }

    // Write delivery links for ALL matched providers, regardless of candidate count (Fix 239-1)
    if (isWrite && matchedUberEatsProviders.length > 0) {
      console.log(
        `  🔗 Writing delivery links for ${matchedUberEatsProviders.length} matched provider(s)...`,
      );
      let linksWritten = 0;
      for (const { providerId, providerName, sourceUrl } of matchedUberEatsProviders) {
        const { error: linkError } = await supabase.from('provider_delivery_links').upsert(
          {
            provider_id: providerId,
            platform: 'ubereats',
            platform_url: sourceUrl,
            platform_slug: null,
            is_active: true,
            last_verified_at: new Date().toISOString(),
          },
          {
            onConflict: 'provider_id,platform',
            ignoreDuplicates: false,
          },
        );

        if (linkError) {
          console.error(
            `     ❌ Failed to write delivery link for ${providerName}: ${linkError.message}`,
          );
        } else {
          linksWritten++;
        }
      }
      console.log(`  ✅ ${linksWritten}/${matchedUberEatsProviders.length} delivery links written`);
    } else if (isDryRun) {
      console.log(
        `\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`,
      );
    } else if (isAutoApply) {
      console.log(`  Auto-apply complete.`);
    }

    // 6. Write run log
    await writeRunLog(stats);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ UberEats enrichment pipeline error: ${msg}`);
    stats.failureCount = stats.providersSelected || 1;
    await writeRunLog(stats);
  }
}

// ─── Wolt Direct-Slug Enrichment ─────────────────────────────────────────────

/**
 * Enriches Wolt-imported providers by using their known slug (import_source_id)
 * to call the Apify Wolt scraper directly. Bypasses fuzzy name+city matching.
 */
async function runWoltDirectEnrichment(
  stats: RunStats,
  mode: RunMode,
  limit: number | undefined,
): Promise<void> {
  const isWrite = mode === 'write';
  const isAutoApply = mode === 'auto-apply';

  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN required for wolt-direct enrichment');
    process.exit(1);
  }

  console.log('  🌐 Wolt direct-slug enrichment (via Apify)');

  // 1. Fetch Wolt-imported providers that need enrichment
  let query = supabase
    .from('providers')
    .select(
      'provider_id, provider_name, import_source_id, import_source_url, address_street, address_city, address_zip, address_country, contact_phone, social_website, opening_hours, category_id, enrichment_eligible, listing_type',
    )
    .eq('import_source', 'wolt')
    .eq('enrichment_eligible', true)
    .not('import_source_id', 'is', null);

  // Only process un-enriched providers unless targeting a specific one
  if (providerIdFilter) {
    query = query.eq('provider_id', providerIdFilter);
  } else {
    query = query.is('last_enriched_at', null);
  }

  if (limit) query = query.limit(limit);

  const { data: providers, error } = await query;
  if (error) {
    console.error('❌ Failed to fetch providers:', error.message);
    process.exit(1);
  }

  const providerRows = providers ?? [];
  stats.providersSelected = providerRows.length;
  console.log(`  📋 Found ${providerRows.length} Wolt-imported provider(s)\n`);

  if (providerRows.length === 0) {
    console.log('  ℹ️  No eligible providers found.');
    await writeRunLog(stats);
    return;
  }

  // 2. Process each provider
  for (const provider of providerRows) {
    stats.providersProcessed++;
    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    const slug = provider.import_source_id as string;
    const woltUrl =
      (provider.import_source_url as string) || `https://wolt.com/de/deu/restaurant/${slug}`;

    try {
      const result = await fetchWoltRestaurant(woltUrl, APIFY_API_TOKEN);

      if (!result) {
        console.log('not found on Wolt (Apify returned null)');
        stats.failureCount++;
        continue;
      }

      // Build list of fields to update (additive only)
      const providerUpdates: Record<string, unknown> = {};
      const locationData: Record<string, unknown> = {};
      const fieldsUpdated: string[] = [];

      if (!provider.address_street && result.address) {
        providerUpdates.address_street = result.address;
        locationData.address_street = result.address;
        fieldsUpdated.push('address');
      }
      if (!provider.address_city && result.city) {
        providerUpdates.address_city = result.city;
        locationData.address_city = result.city;
        fieldsUpdated.push('city');
      }
      if (!provider.address_zip && result.postCode) {
        providerUpdates.address_zip = result.postCode;
        locationData.address_zip = result.postCode;
        fieldsUpdated.push('zip');
      }

      if (!provider.contact_phone && result.phone) {
        providerUpdates.contact_phone = result.phone;
        fieldsUpdated.push('phone');
      }
      if (!provider.social_website && result.website) {
        providerUpdates.social_website = result.website;
        fieldsUpdated.push('website');
      }

      if (!provider.opening_hours && result.openingHours) {
        providerUpdates.opening_hours = result.openingHours;
        locationData.opening_hours = result.openingHours;
        fieldsUpdated.push('hours');
      }

      // Always mark as enriched
      providerUpdates.last_enriched_at = new Date().toISOString();

      if (fieldsUpdated.length === 0) {
        console.log('✅ no new data');
        stats.unchangedCount++;
        if (isWrite || isAutoApply) {
          await supabase
            .from('providers')
            .update({ last_enriched_at: new Date().toISOString() })
            .eq('provider_id', provider.provider_id);
        }
        // Still write delivery link + menu items even when no field changes
        if (isWrite || isAutoApply) {
          await woltDirectUpsertDeliveryLink(provider.provider_id, woltUrl, slug);
          if (result.menuItems && result.menuItems.length > 0) {
            await woltDirectWriteMenuItems(provider.provider_id, result.menuItems);
            console.log(`    + ${result.menuItems.length} menu items`);
          }
        }
        continue;
      }

      if (isWrite || isAutoApply) {
        // Update providers table
        const { error: updateError } = await supabase
          .from('providers')
          .update(providerUpdates)
          .eq('provider_id', provider.provider_id);

        if (updateError) {
          console.log(`❌ DB error: ${updateError.message}`);
          stats.failureCount++;
          continue;
        }

        // Update or create locations row
        if (Object.keys(locationData).length > 0) {
          await woltDirectUpsertPrimaryLocation(provider.provider_id, locationData);
        }

        // Write menu items
        if (result.menuItems && result.menuItems.length > 0) {
          await woltDirectWriteMenuItems(provider.provider_id, result.menuItems);
        }

        // Upsert delivery link
        await woltDirectUpsertDeliveryLink(provider.provider_id, woltUrl, slug);

        console.log(`✅ updated: ${fieldsUpdated.join(', ')}`);
        if (result.menuItems?.length) {
          console.log(`    + ${result.menuItems.length} menu items`);
        }
        stats.autoAppliedCount++;
        stats.autoAppliedFields.push(...fieldsUpdated);
      } else {
        // Dry-run
        console.log(`📝 would update: ${fieldsUpdated.join(', ')}`);
        if (result.menuItems?.length) {
          console.log(`    + ${result.menuItems.length} menu items`);
        }
        stats.candidatesCreated += fieldsUpdated.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ error: ${msg}`);
      stats.failureCount++;
    }
  }

  stats.finishedAt = new Date().toISOString();

  // Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  📊 Wolt Direct Enrichment Summary`);
  console.log(`     Selected:    ${stats.providersSelected}`);
  console.log(`     Processed:   ${stats.providersProcessed}`);
  if (isWrite || isAutoApply) {
    console.log(`     Updated:     ${stats.autoAppliedCount}`);
  } else {
    console.log(`     Candidates:  ${stats.candidatesCreated}`);
  }
  console.log(`     Unchanged:   ${stats.unchangedCount}`);
  console.log(`     Failed:      ${stats.failureCount}`);
  console.log(`${'─'.repeat(60)}`);

  await writeRunLog(stats);
}

// ─── Wolt Direct Helpers ─────────────────────────────────────────────────────

/**
 * Check if a primary location exists for the provider. If yes, update it
 * additively. If no, insert a new primary location row.
 */
async function woltDirectUpsertPrimaryLocation(
  providerId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('locations')
    .select('location_id, address_street, address_zip, address_city, opening_hours')
    .eq('provider_id', providerId)
    .eq('is_primary', true)
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error(`     ⚠️  Location fetch failed: ${fetchError.message}`);
    return;
  }

  if (!existing) {
    // Insert new primary location
    const { error: insertError } = await supabase.from('locations').insert({
      provider_id: providerId,
      is_primary: true,
      show_address: true,
      address_country: 'DE',
      ...data,
    });

    if (insertError) {
      console.error(`     ⚠️  Location create failed: ${insertError.message}`);
    }
    return;
  }

  // Additive update only — don't overwrite existing values
  const updates: Record<string, unknown> = {};
  if (data.address_street && !existing.address_street) updates.address_street = data.address_street;
  if (data.address_zip && !existing.address_zip) updates.address_zip = data.address_zip;
  if (data.address_city && !existing.address_city) updates.address_city = data.address_city;
  if (data.opening_hours && !existing.opening_hours) updates.opening_hours = data.opening_hours;

  if (Object.keys(updates).length === 0) return;

  const { error: updateError } = await supabase
    .from('locations')
    .update(updates)
    .eq('location_id', existing.location_id);

  if (updateError) {
    console.error(`     ⚠️  Location update failed: ${updateError.message}`);
  }
}

/**
 * Write menu items for a provider. Checks if menu items already exist;
 * if so, skips to avoid overwriting richer data. Uses admin_update_provider
 * RPC which does DELETE + INSERT for menu_items.
 */
async function woltDirectWriteMenuItems(
  providerId: string,
  menuItems: ApifyWoltResult['menuItems'],
): Promise<void> {
  if (!menuItems || menuItems.length === 0) return;

  // Check for existing menu items
  const { count, error: countError } = await supabase
    .from('food_menu')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', providerId);

  if (countError) {
    console.error(`     ⚠️  Menu count check failed: ${countError.message}`);
    return;
  }

  if (count && count > 0) return; // Already has menu items

  const { error: rpcError } = await supabase.rpc('admin_update_provider', {
    p_provider_id: providerId,
    p_data: {
      menu_items: menuItems.map((item, i) => ({
        name_de: item.name_de,
        description_de: item.description_de,
        category: item.category,
        price_cents: item.price_cents,
        is_available: item.is_available,
        sort_order: i,
      })),
    },
  });

  if (rpcError) {
    console.error(`     ⚠️  Menu write failed: ${rpcError.message}`);
  }
}

/**
 * Upsert a delivery link for a Wolt-imported provider.
 */
async function woltDirectUpsertDeliveryLink(
  providerId: string,
  woltUrl: string,
  slug: string,
): Promise<void> {
  const { error } = await supabase.from('provider_delivery_links').upsert(
    {
      provider_id: providerId,
      platform: 'wolt',
      platform_url: woltUrl,
      platform_slug: slug,
      is_active: true,
      last_verified_at: new Date().toISOString(),
    },
    {
      onConflict: 'provider_id,platform',
      ignoreDuplicates: false,
    },
  );

  if (error) {
    console.error(`     ⚠️  Delivery link write failed: ${error.message}`);
  }
}

// ─── Auto-Apply Helpers ──────────────────────────────────────────────────────

async function autoApplyDeliveryFields(
  provider: { provider_id: string; provider_name: string; opening_hours: unknown },
  result: import('../src/lib/enrichment/delivery-enricher').DeliveryEnrichmentResult,
  noAlcoholMap: Record<string, boolean | null>,
  stats: RunStats,
  platform: 'wolt' | 'ubereats',
): Promise<void> {
  // Write delivery link BEFORE checking candidates — a matched venue should
  // always get a link saved, even when all fields are "no-change" (Fix 239-1).
  // Fall back to venueSlug when candidates is empty (Fix 239-2).
  const sourceUrl =
    result.candidates[0]?.source_url ??
    (result.venueSlug && platform === 'wolt'
      ? `https://wolt.com/de/deu/venue/${result.venueSlug}`
      : '');
  if (sourceUrl) {
    const slugMatch = platform === 'wolt' ? sourceUrl.match(/venue\/([^/]+)$/) : null;
    const { error: linkError } = await supabase.from('provider_delivery_links').upsert(
      {
        provider_id: provider.provider_id,
        platform,
        platform_url: sourceUrl,
        platform_slug: slugMatch?.[1] ?? null,
        is_active: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        onConflict: 'provider_id,platform',
        ignoreDuplicates: true,
      },
    );

    if (linkError) {
      console.error(`     ⚠️  Delivery link write failed: ${linkError.message}`);
    }
  }

  const autoInput: AutoApplyInput = {
    providerId: provider.provider_id,
    current: {
      opening_hours: provider.opening_hours,
      no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
    },
    proposed: result.candidates,
  };

  const { rpcPayload, appliedFields } = buildAutoApplyPayload(autoInput);

  if (appliedFields.length === 0) {
    console.log('✅ no auto-applicable fields');
    stats.unchangedCount++;
    return;
  }

  try {
    // 1. Write scalar fields via admin_update_provider RPC
    if (Object.keys(rpcPayload).length > 0) {
      const { error: rpcError } = await supabase.rpc('admin_update_provider', {
        p_provider_id: provider.provider_id,
        p_data: rpcPayload,
      });

      if (rpcError) {
        console.log(`❌ RPC failed: ${rpcError.message}`);
        stats.failureCount++;
        return;
      }
    }

    // 2. Update last_enriched_at
    await supabase
      .from('providers')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('provider_id', provider.provider_id);

    // 4. Write audit trail to enrichment_candidates with status='auto_applied'
    for (const c of result.candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: c.provider_id,
          source: c.source,
          source_url: c.source_url,
          field_name: c.field_name,
          proposed_value: c.proposed_value,
          current_value: c.current_value,
          status: 'auto_applied',
          enriched_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );
    }

    console.log(`✅ auto-applied ${appliedFields.length} field(s): ${appliedFields.join(', ')}`);
    stats.autoAppliedCount += appliedFields.length;
    stats.autoAppliedFields.push(...appliedFields);
    stats.candidatesCreated += appliedFields.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ auto-apply failed ${msg}`);
    stats.failureCount++;
  }
}

// ─── Auto-Apply for Lieferando ───────────────────────────────────────────────

async function autoApplyLieferandoFields(
  provider: { provider_id: string; provider_name: string; opening_hours: unknown },
  result: import('../src/lib/enrichment/delivery-enricher').DeliveryEnrichmentResult,
  noAlcoholMap: Record<string, boolean | null>,
  stats: RunStats,
): Promise<void> {
  // Write delivery link BEFORE checking candidates — a matched venue should
  // always get a link saved, even when all fields are "no-change" (Fix 239-1).
  // Fall back to venueSlug when candidates is empty (Fix 239-2).
  const sourceUrl =
    result.candidates[0]?.source_url ??
    (result.venueSlug ? `https://www.lieferando.de/speisekarte/${result.venueSlug}` : '');
  if (sourceUrl) {
    const slugMatch = sourceUrl.match(/\/speisekarte\/([^/]+)$/);
    const { error: linkError } = await supabase.from('provider_delivery_links').upsert(
      {
        provider_id: provider.provider_id,
        platform: 'lieferando',
        platform_url: sourceUrl,
        platform_slug: slugMatch?.[1] ?? null,
        is_active: true,
        last_verified_at: new Date().toISOString(),
      },
      {
        onConflict: 'provider_id,platform',
        ignoreDuplicates: true,
      },
    );

    if (linkError) {
      console.error(`     ⚠️  Delivery link write failed: ${linkError.message}`);
    }
  }

  const autoInput: AutoApplyInput = {
    providerId: provider.provider_id,
    current: {
      opening_hours: provider.opening_hours,
      no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
    },
    proposed: result.candidates,
  };

  const { rpcPayload, appliedFields } = buildAutoApplyPayload(autoInput);

  if (appliedFields.length === 0) {
    console.log('✅ no auto-applicable fields');
    stats.unchangedCount++;
    return;
  }

  try {
    if (Object.keys(rpcPayload).length > 0) {
      const { error: rpcError } = await supabase.rpc('admin_update_provider', {
        p_provider_id: provider.provider_id,
        p_data: rpcPayload,
      });

      if (rpcError) {
        console.log(`❌ RPC failed: ${rpcError.message}`);
        stats.failureCount++;
        return;
      }
    }

    await supabase
      .from('providers')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('provider_id', provider.provider_id);

    for (const c of result.candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: c.provider_id,
          source: c.source,
          source_url: c.source_url,
          field_name: c.field_name,
          proposed_value: c.proposed_value,
          current_value: c.current_value,
          status: 'auto_applied',
          enriched_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );
    }

    console.log(`✅ auto-applied ${appliedFields.length} field(s): ${appliedFields.join(', ')}`);
    stats.autoAppliedCount += appliedFields.length;
    stats.autoAppliedFields.push(...appliedFields);
    stats.candidatesCreated += appliedFields.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ auto-apply failed ${msg}`);
    stats.failureCount++;
  }
}

// ─── Auto-Apply for JoinHalal ────────────────────────────────────────────────

async function autoApplyJoinHalalFields(
  provider: ProviderRow,
  candidates: EnrichmentCandidate[],
  stats: RunStats,
): Promise<number> {
  // Build the current-value map from the provider row for conflict detection
  const current: Record<string, unknown> = {};
  for (const c of candidates) {
    current[c.field_name] = c.current_value;
  }

  // Fetch existing primary location_id to avoid the RPC's destructive
  // DELETE of all locations when location_id is missing from the payload.
  let primaryLocationId: string | null = null;
  const hasLocationFields = candidates.some((c) => LOCATION_FIELDS.has(c.field_name));
  if (hasLocationFields) {
    const { data: locData } = await supabase
      .from('locations')
      .select('location_id')
      .eq('provider_id', provider.provider_id)
      .eq('is_primary', true)
      .limit(1)
      .single();
    primaryLocationId = locData?.location_id ?? null;
  }

  // Delegate to shared payload builder (handles providers, food_providers,
  // locations sub-objects, delivery_links, menu_items)
  const { rpcPayload, appliedFields } = buildAutoApplyPayload({
    providerId: provider.provider_id,
    current,
    proposed: candidates,
    primaryLocationId,
  });

  if (appliedFields.length === 0) {
    return 0;
  }

  try {
    if (Object.keys(rpcPayload).length > 0) {
      const { error: rpcError } = await supabase.rpc('admin_update_provider', {
        p_provider_id: provider.provider_id,
        p_data: rpcPayload,
      });

      if (rpcError) {
        console.log(`❌ RPC failed: ${rpcError.message}`);
        stats.failureCount++;
        return 0;
      }
    }

    await supabase
      .from('providers')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('provider_id', provider.provider_id);

    for (const c of candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase.from('enrichment_candidates').upsert(
        {
          provider_id: c.provider_id,
          source: c.source,
          source_url: c.source_url,
          field_name: c.field_name,
          proposed_value: c.proposed_value,
          current_value: c.current_value,
          status: 'auto_applied',
          enriched_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider_id,field_name,source',
          ignoreDuplicates: true,
        },
      );
    }

    console.log(`✅ auto-applied ${appliedFields.length} field(s): ${appliedFields.join(', ')}`);
    stats.autoAppliedCount += appliedFields.length;
    stats.autoAppliedFields.push(...appliedFields);
    stats.candidatesCreated += appliedFields.length;
    return appliedFields.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌ auto-apply failed ${msg}`);
    stats.failureCount++;
    return 0;
  }
}

// ─── Menu Item Enrichment ───────────────────────────────────────────────────────

/**
 * Auto-applies menu items from JoinHalal Speisen data.
 * Only writes if the provider has no existing menu items.
 * Uses admin_update_provider RPC which does full array replacement (DELETE + INSERT).
 */
async function autoApplyMenuItems(
  provider: ProviderRow,
  menuItems: MenuItem[],
  stats: RunStats,
): Promise<void> {
  if (!menuItems || menuItems.length === 0) return;

  // Check if provider already has menu items
  const { count: existingCount, error: countError } = await supabase
    .from('food_menu')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', provider.provider_id);

  if (countError) {
    console.log(`  ⚠️  menu count check failed: ${countError.message}`);
    stats.failureCount++;
    return;
  }

  if (existingCount && existingCount > 0) {
    // Provider already has menu items — skip to avoid overwriting richer data
    return;
  }

  // Build menu_items payload for RPC
  const menuPayload = menuItems.map((item, i) => ({
    name_de: item.name_de,
    is_available: item.is_available,
    sort_order: i,
  }));

  try {
    const { error: rpcError } = await supabase.rpc('admin_update_provider', {
      p_provider_id: provider.provider_id,
      p_data: {
        menu_items: menuPayload,
      },
    });

    if (rpcError) {
      console.log(`  ⚠️  menu RPC failed: ${rpcError.message}`);
      stats.failureCount++;
      return;
    }

    stats.autoAppliedCount++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ⚠️  menu write failed: ${msg}`);
    stats.failureCount++;
  }
}

// ─── Delivery Link Enrichment ────────────────────────────────────────────

/**
 * Auto-applies delivery platform links (Wolt, Lieferando, UberEats)
 * extracted from JoinHalal Schema.org Lieferservice field.
 *
 * Uses the admin_update_provider RPC which does full array replacement
 * for delivery_links. Only writes if there are no existing links for the
 * same platform (PRIMARY KEY constraint prevents duplicates).
 */
async function autoApplyDeliveryLinks(
  provider: ProviderRow,
  deliveryLinks: DeliveryLink[],
  stats: RunStats,
): Promise<void> {
  if (!deliveryLinks || deliveryLinks.length === 0) return;

  try {
    const { error: rpcError } = await supabase.rpc('admin_update_provider', {
      p_provider_id: provider.provider_id,
      p_data: {
        delivery_links: deliveryLinks.map((dl) => ({
          platform: dl.platform,
          platform_url: dl.platform_url,
          platform_slug: dl.platform_slug,
          is_active: true,
        })),
      },
    });

    if (rpcError) {
      console.log(`  ⚠️  delivery link RPC failed: ${rpcError.message}`);
      stats.failureCount++;
      return;
    }

    stats.autoAppliedCount++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ⚠️  delivery link write failed: ${msg}`);
    stats.failureCount++;
  }
}

// ─── Pending Enrichments ─────────────────────────────────────────────────────

async function processPendingEnrichments(stats: RunStats): Promise<Set<string>> {
  const processedIds = new Set<string>();

  const { data: pending, error } = await supabase
    .from('pending_enrichments')
    .select('id, provider_id, source')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('  ⚠️ Failed to query pending enrichments:', error.message);
    return processedIds;
  }

  if (!pending || pending.length === 0) return processedIds;

  const ids = pending.map((p) => p.id);
  const now = new Date().toISOString();

  await supabase
    .from('pending_enrichments')
    .update({ status: 'processing', started_at: now })
    .in('id', ids);

  const providerIds = [...new Set(pending.map((p) => p.provider_id))];
  const { data: providers } = await supabase
    .from('providers')
    .select(
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible, import_source, import_source_url, contact_phone, social_website, social_instagram, address_street, address_zip, address_country, provider_description, location_latitude, location_longitude, category_id',
    )
    .in('provider_id', providerIds);

  const providerMap = new Map((providers ?? []).map((p) => [p.provider_id, p]));

  // Fetch no_alcohol for all providers
  const { data: foodProviders } = await supabase
    .from('food_providers')
    .select('provider_id, no_alcohol')
    .in('provider_id', providerIds);
  const noAlcoholMap: Record<string, boolean | null> = {};
  if (foodProviders) {
    for (const fp of foodProviders) {
      noAlcoholMap[fp.provider_id] = fp.no_alcohol ?? null;
    }
  }

  const geocoder = new StaticCityGeocoder();
  const woltClient = createWoltClient(undefined, geocoder);
  const lieferandoClient = createLieferandoClient();

  // Load offers + categories for JoinHalal enrichment (lazy, once)
  let pendingOffers: Offer[] | null = null;
  let pendingCategories: CategoryRow[] | null = null;

  for (const item of pending) {
    const provider = providerMap.get(item.provider_id);
    if (!provider) {
      console.log(`  ⚠️ Provider ${item.provider_id} not found, marking as failed`);
      await supabase
        .from('pending_enrichments')
        .update({ status: 'failed', error_message: 'Provider not found', completed_at: now })
        .eq('id', item.id);
      stats.failureCount++;
      continue;
    }

    processedIds.add(provider.provider_id);
    stats.providersSelected++;
    process.stdout.write(`  🔍 [pending] ${provider.provider_name} ... `);

    const snapshot: DeliveryPlatformSnapshot = {
      provider_id: provider.provider_id,
      provider_name: provider.provider_name,
      address_city: provider.address_city,
      listing_type: provider.listing_type,
      opening_hours: provider.opening_hours as DeliveryPlatformSnapshot['opening_hours'],
      no_alcohol: noAlcoholMap[provider.provider_id] ?? null,
    };

    try {
      let hasError = false;

      // Wolt enrichment
      const woltResult = await enrichFromWolt(snapshot, woltClient);
      stats.providersProcessed++;

      if (woltResult.error) {
        console.log(`⚠️ Wolt: ${woltResult.error}`);
      } else {
        // Call auto-apply even with zero candidates so the delivery link is
        // written for matched venues where all fields are "no-change" (Fix 239-2).
        await autoApplyDeliveryFields(provider, woltResult, noAlcoholMap, stats, 'wolt');
      }

      // Lieferando enrichment
      const lieferandoResult = await enrichFromLieferando(snapshot, lieferandoClient, geocoder);
      if (lieferandoResult.error) {
        console.log(`⚠️ Lieferando: ${lieferandoResult.error}`);
      } else {
        // Call auto-apply even with zero candidates so the delivery link is
        // written for matched venues where all fields are "no-change" (Fix 239-2).
        await autoApplyLieferandoFields(provider, lieferandoResult, noAlcoholMap, stats);
      }

      // JoinHalal enrichment (re-fetch source page and apply all fields)
      if (provider.import_source === 'joinhalal' && provider.import_source_url) {
        try {
          // Lazy-load offers + categories on first JoinHalal provider
          if (pendingOffers === null) {
            const { data: od } = await supabase.from('offers').select('offer_id, name_de');
            pendingOffers = od ?? [];
          }
          if (pendingCategories === null) {
            const { data: cd } = await supabase
              .from('categories')
              .select('category_id, name_de, name_en');
            pendingCategories = cd ?? [];
          }

          const html = await fetchWithDelay(provider.import_source_url);
          const parsed = parseEnrichmentData(html, pendingOffers, pendingCategories);
          if (parsed) {
            const jhSnapshot: ProviderSnapshot = {
              provider_id: provider.provider_id,
              offers_ids: null,
              contact_phone: provider.contact_phone,
              social_website: provider.social_website,
              social_instagram: provider.social_instagram,
              address_street: provider.address_street,
              address_zip: provider.address_zip,
              address_city: provider.address_city,
              address_country: provider.address_country,
              provider_description: provider.provider_description,
              opening_hours: provider.opening_hours,
              location_latitude: provider.location_latitude,
              location_longitude: provider.location_longitude,
              category_id: provider.category_id,
            };

            const jhCandidates = buildEnrichmentCandidates(
              jhSnapshot,
              parsed,
              'joinhalal',
              provider.import_source_url,
            );
            if (jhCandidates.length > 0) {
              const providerRow: ProviderRow = {
                provider_id: provider.provider_id,
                provider_name: provider.provider_name,
                import_source: provider.import_source,
                import_source_url: provider.import_source_url,
                contact_phone: provider.contact_phone,
                social_website: provider.social_website,
                social_instagram: provider.social_instagram,
                address_street: provider.address_street,
                address_zip: provider.address_zip,
                address_city: provider.address_city,
                address_country: provider.address_country,
                enrichment_eligible: provider.enrichment_eligible,
                provider_description: provider.provider_description,
                opening_hours: provider.opening_hours,
                location_latitude: provider.location_latitude,
                location_longitude: provider.location_longitude,
                category_id: provider.category_id,
              };
              await autoApplyJoinHalalFields(providerRow, jhCandidates, stats);
            }
          }
        } catch (jhErr) {
          const jhMsg = jhErr instanceof Error ? jhErr.message : String(jhErr);
          console.log(`⚠️ JoinHalal: ${jhMsg}`);
        }
      }

      if (!hasError) {
        await supabase
          .from('pending_enrichments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', item.id);
      } else {
        await supabase
          .from('pending_enrichments')
          .update({
            status: 'failed',
            error_message: 'Enrichment completed with errors',
            completed_at: now,
          })
          .eq('id', item.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      stats.failureCount++;
      await supabase
        .from('pending_enrichments')
        .update({ status: 'failed', error_message: msg, completed_at: now })
        .eq('id', item.id);
    }

    await supabase
      .from('providers')
      .update({ last_enriched_at: now })
      .eq('provider_id', provider.provider_id);
  }

  if (processedIds.size > 0) {
    console.log(`  ✅ Processed ${processedIds.size} pending enrichment(s)`);
  }

  return processedIds;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
