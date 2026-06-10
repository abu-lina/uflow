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
} from '../src/utils/joinhalal-parser';
import {
  resolveOfferIds,
  type Offer,
} from '../src/lib/import/joinhalal';
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
import { createWoltClient } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { StaticCityGeocoder } from '../src/lib/enrichment/delivery-platform/geocoder';
import { createUberEatsClient } from '../src/lib/enrichment/delivery-platform/ubereats-client';
import { enrichFromUberEats } from '../src/lib/enrichment/delivery-platform/ubereats-enricher';
import {
  buildAutoApplyPayload,
  type AutoApplyInput,
} from '../src/lib/enrichment/auto-apply-payload';
import { enrichFromLieferando } from '../src/lib/enrichment/delivery-platform/lieferando-enricher';
import { createLieferandoClient } from '../src/lib/enrichment/delivery-platform/lieferando-client';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables.');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
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
  sourceStats?: Record<string, {
    providersSelected: number;
    providersProcessed: number;
    candidatesCreated: number;
    unchangedCount: number;
    failureCount: number;
    autoAppliedCount: number;
  }>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const modeLabel = mode === 'auto-apply' ? 'AUTO-APPLY (direct write)' : mode === 'write' ? 'WRITE (staging candidates)' : 'DRY-RUN (preview only)';
  console.log(`\n🔄 Provider Enrichment Pipeline`);
  console.log(`   Mode: ${modeLabel}`);
  console.log(`   Source: ${source}`);
  console.log(`   Limit: ${limit ?? 'all eligible'}\n`);

  const stats: RunStats = {
    source,
    triggeredBy: mode === 'auto-apply' ? 'cli_auto_apply' : mode === 'write' ? 'cli_write' : 'cli_dry_run',
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

  if (source === 'wolt') {
    await runWoltEnrichment(stats, mode, limit);
    return;
  }

  if (source === 'lieferando') {
    await runLieferandoEnrichment(stats, mode, limit);
    return;
  }

  if (isAutoApply && !['wolt', 'ubereats', 'joinhalal', 'lieferando'].includes(source)) {
    console.error(`❌ Auto-apply mode is only supported for 'wolt', 'ubereats', 'joinhalal', and 'lieferando' sources.`);
    process.exit(1);
  }

  if (source !== 'joinhalal' && source !== 'ubereats') {
    console.error(`❌ Unsupported source: ${source}. Only 'joinhalal', 'wolt', and 'ubereats' are supported.`);
    process.exit(1);
  }

  if (source === 'ubereats') {
    await runUberEatsEnrichment(stats, mode, limit);
    return;
  }

  if (source !== 'joinhalal') {
    console.error(`❌ Unsupported source: ${source}. Only 'joinhalal', 'wolt', and 'lieferando' are supported.`);
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

  // 2. Fetch eligible providers
  let query = supabase
    .from('providers')
    .select(
      'provider_id, provider_name, import_source, import_source_url, contact_phone, social_website, social_instagram, address_street, address_zip, address_city, address_country, enrichment_eligible, provider_description, opening_hours, location_latitude, location_longitude'
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
        console.error(`\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`);
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    const url = provider.import_source_url!;
    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    try {
      const html = await fetchWithDelay(url);
      stats.providersProcessed++;

      const parsed = parseEnrichmentData(html, offers);
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
      };

      const candidates = buildEnrichmentCandidates(snapshot, parsed, source, url);

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
          statusParts.push(`${parsed.menu_items.length} menu item(s) found (use --mode auto-apply to write)`);
        }
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
      console.log(`     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`);
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
      const { error } = await supabase
        .from('enrichment_candidates')
        .upsert(
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
          }
        );

      if (error) {
        console.error(`     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`);
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
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply directly.`);
  }

  // 6. Write run log
  await writeRunLog(stats);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEnrichmentData(html: string, offers: Offer[]): ParsedEnrichmentData | null {
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


  // Extract menu items from Speisen
  if (speisen.length > 0) {
    parsed.menu_items = speisen.map((name, i) => ({
      name_de: name,
      is_available: true,
      sort_order: i,
    }));
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

  const { error } = await supabase
    .from('enrichment_run_logs')
    .insert({
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
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible'
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
  const providerIds = (providers ?? []).map(p => p.provider_id);
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

  for (const provider of providerRows) {
    // Circuit breaker check
    if (stats.providersProcessed > 0) {
      const failRate = stats.failureCount / stats.providersProcessed;
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
        console.error(`\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`);
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
      console.log(`  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`);
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
        const isNonEssential = nonEssentialErrors.some(e => result.error!.includes(e));
        if (isNonEssential) {
          console.log(`⚠️  ${result.error}`);
          continue;
        }
        console.log(`⚠️  ${result.error}`);
        stats.failureCount++;
        continue;
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
      console.log(`     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`);
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
      const { error } = await supabase
        .from('enrichment_candidates')
        .upsert(
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
          }
        );

      if (error) {
        console.error(`     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`);
      } else {
        written++;
      }
    }

    console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);

    // Update last_enriched_at for processed providers
    const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];

    // Write delivery links for matched providers (those with venue slugs)
    console.log(`  🔗 Writing delivery links...`);
    let linksWritten = 0;
    for (const pid of processedIds) {
      // Find the result for this provider to get the slug
      const providerName = allCandidates.find((c) => c.provider_id === pid)?.providerName ?? '';
      const sourceUrl = allCandidates.find((c) => c.provider_id === pid)?.source_url ?? '';

      if (sourceUrl) {
        const slugMatch = sourceUrl.match(/venue\/([^/]+)$/);
        const slug = slugMatch ? slugMatch[1] : null;

        const { error: linkError } = await supabase
          .from('provider_delivery_links')
          .upsert(
            {
              provider_id: pid,
              platform: 'wolt',
              platform_url: sourceUrl,
              platform_slug: slug,
              is_active: true,
              last_verified_at: new Date().toISOString(),
            },
            {
              onConflict: 'provider_id,platform',
              ignoreDuplicates: false,
            }
          );

        if (linkError) {
          console.error(`     ❌ Failed to write delivery link for ${providerName}: ${linkError.message}`);
        } else {
          linksWritten++;
        }
      }

      await supabase
        .from('providers')
        .update({ last_enriched_at: new Date().toISOString() })
        .eq('provider_id', pid);
    }
    console.log(`  ✅ ${linksWritten}/${processedIds.length} delivery links written`);
  } else if (isDryRun) {
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`);
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
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible'
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

  const providerIds = (providers ?? []).map(p => p.provider_id);
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

  for (const provider of providerRows) {
    if (stats.providersProcessed > 0) {
      const failRate = stats.failureCount / stats.providersProcessed;
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
        console.error(`\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`);
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

    if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
      console.log(`  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`);
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
        const isNonEssential = nonEssentialErrors.some(e => result.error!.includes(e));
        if (isNonEssential) {
          console.log(`⚠️  ${result.error}`);
          continue;
        }
        console.log(`⚠️  ${result.error}`);
        stats.failureCount++;
        continue;
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
      console.log(`     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`);
    }
    if (allCandidates.length > 10) {
      console.log(`     ... and ${allCandidates.length - 10} more`);
    }
  }

  if (isWriteMode && allCandidates.length > 0) {
    console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
    let written = 0;

    for (const candidate of allCandidates) {
      const { error } = await supabase
        .from('enrichment_candidates')
        .upsert(
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
          }
        );

      if (error) {
        console.error(`     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`);
      } else {
        written++;
      }
    }

    const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];

    console.log(`  🔗 Writing delivery links...`);
    let linksWritten = 0;
    for (const pid of processedIds) {
      const sourceUrl = allCandidates.find((c) => c.provider_id === pid)?.source_url ?? '';

      if (sourceUrl) {
        const slugMatch = sourceUrl.match(/\/speisekarte\/([^/]+)$/);
        const slug = slugMatch ? slugMatch[1] : null;

        const { error: linkError } = await supabase
          .from('provider_delivery_links')
          .upsert(
            {
              provider_id: pid,
              platform: 'lieferando',
              platform_url: sourceUrl,
              platform_slug: slug,
              is_active: true,
              last_verified_at: new Date().toISOString(),
            },
            {
              onConflict: 'provider_id,platform',
              ignoreDuplicates: false,
            }
          );

        if (linkError) {
          console.error(`     ❌ Failed to write delivery link: ${linkError.message}`);
        } else {
          linksWritten++;
        }
      }

      await supabase
        .from('providers')
        .update({ last_enriched_at: new Date().toISOString() })
        .eq('provider_id', pid);
    }
    console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);
    console.log(`  ✅ ${linksWritten}/${processedIds.length} delivery links written`);
  } else if (isDryRun) {
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`);
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
        'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible'
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
    const providerIds = (providers ?? []).map(p => p.provider_id);
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

    // 2. Create UberEats client + geocoder
    const geocoder = new StaticCityGeocoder();

    for (const provider of providerRows) {
      // Circuit breaker check
      if (stats.providersProcessed > 0) {
        const failRate = stats.failureCount / stats.providersProcessed;
        if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 10) {
          console.error(`\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`);
          stats.circuitBreakerTriggered = true;
          break;
        }
      }

      process.stdout.write(`  🔍 ${provider.provider_name} ... `);

      if (!provider.address_city || !(await geocoder.geocode(provider.address_city))) {
        console.log(`  ⚠️  ${provider.provider_name} — skipping (not in coverage area: ${provider.address_city || 'no city'})`);
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
          const isNonEssential = nonEssentialErrors.some(e => result.error!.includes(e));
          if (isNonEssential) {
            console.log(`⚠️  ${result.error}`);
            continue;
          }
          console.log(`⚠️  ${result.error}`);
          stats.failureCount++;
          continue;
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
        console.log(`     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`);
      }
      if (allCandidates.length > 10) {
        console.log(`     ... and ${allCandidates.length - 10} more`);
      }
    }

    // 5. Write candidates + delivery links if not dry-run
    if (isWrite && allCandidates.length > 0) {
      console.log(`\n  💾 Writing ${allCandidates.length} candidates to enrichment_candidates...`);
      let written = 0;

      for (const candidate of allCandidates) {
        const { error } = await supabase
          .from('enrichment_candidates')
          .upsert(
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
            }
          );

        if (error) {
          console.error(`     ❌ Failed to write candidate for ${candidate.provider_id}/${candidate.field_name}: ${error.message}`);
        } else {
          written++;
        }
      }

      console.log(`  ✅ ${written}/${allCandidates.length} candidates written successfully`);

      // Write delivery links for matched providers (those with venue slugs)
      console.log(`  🔗 Writing delivery links...`);
      let linksWritten = 0;
      const processedIds = [...new Set(allCandidates.map((c) => c.provider_id))];
      for (const pid of processedIds) {
        const sourceUrl = allCandidates.find((c) => c.provider_id === pid)?.source_url ?? '';
        const providerName = allCandidates.find((c) => c.provider_id === pid)?.providerName ?? '';

        if (sourceUrl) {
          const { error: linkError } = await supabase
            .from('provider_delivery_links')
            .upsert(
              {
                provider_id: pid,
                platform: 'ubereats',
                platform_url: sourceUrl,
                platform_slug: null,
                is_active: true,
                last_verified_at: new Date().toISOString(),
              },
              {
                onConflict: 'provider_id,platform',
                ignoreDuplicates: false,
              }
            );

          if (linkError) {
            console.error(`     ❌ Failed to write delivery link for ${providerName}: ${linkError.message}`);
          } else {
            linksWritten++;
          }
        }

        await supabase
          .from('providers')
          .update({ last_enriched_at: new Date().toISOString() })
          .eq('provider_id', pid);
      }
      console.log(`  ✅ ${linksWritten}/${processedIds.length} delivery links written`);
    } else if (isDryRun) {
      console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates or --mode auto-apply to apply.`);
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

// ─── Auto-Apply Helpers ──────────────────────────────────────────────────────

async function autoApplyDeliveryFields(
  provider: { provider_id: string; provider_name: string; opening_hours: unknown },
  result: import('../src/lib/enrichment/delivery-enricher').DeliveryEnrichmentResult,
  noAlcoholMap: Record<string, boolean | null>,
  stats: RunStats,
  platform: 'wolt' | 'ubereats',
): Promise<void> {
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
      const { error: rpcError } = await supabase
        .rpc('admin_update_provider', {
          p_provider_id: provider.provider_id,
          p_data: rpcPayload,
        });

      if (rpcError) {
        console.log(`❌ RPC failed: ${rpcError.message}`);
        stats.failureCount++;
        return;
      }
    }

    // 2. Write delivery link directly (not via RPC — RPC does destructive DELETE+INSERT)
    const sourceUrl = result.candidates[0]?.source_url ?? '';
    if (sourceUrl) {
      const slugMatch = platform === 'wolt'
        ? sourceUrl.match(/venue\/([^/]+)$/)
        : null;
      const { error: linkError } = await supabase
        .from('provider_delivery_links')
        .upsert(
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

    // 3. Update last_enriched_at
    await supabase
      .from('providers')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('provider_id', provider.provider_id);

    // 4. Write audit trail to enrichment_candidates with status='auto_applied'
    for (const c of result.candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase
        .from('enrichment_candidates')
        .upsert(
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
    return 0;
  }
}

// ─── Auto-Apply for Lieferando ───────────────────────────────────────────────

async function autoApplyLieferandoFields(
  provider: { provider_id: string; provider_name: string; opening_hours: unknown },
  result: import('../src/lib/enrichment/delivery-enricher').DeliveryEnrichmentResult,
  noAlcoholMap: Record<string, boolean | null>,
  stats: RunStats,
): Promise<void> {
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
      const { error: rpcError } = await supabase
        .rpc('admin_update_provider', {
          p_provider_id: provider.provider_id,
          p_data: rpcPayload,
        });

      if (rpcError) {
        console.log(`❌ RPC failed: ${rpcError.message}`);
        stats.failureCount++;
        return;
      }
    }

    const sourceUrl = result.candidates[0]?.source_url ?? '';
    if (sourceUrl) {
      const slugMatch = sourceUrl.match(/\/speisekarte\/([^/]+)$/);
      const { error: linkError } = await supabase
        .from('provider_delivery_links')
        .upsert(
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

    await supabase
      .from('providers')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('provider_id', provider.provider_id);

    for (const c of result.candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase
        .from('enrichment_candidates')
        .upsert(
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
    return 0;
  }
}

// ─── Auto-Apply for JoinHalal ────────────────────────────────────────────────

async function autoApplyJoinHalalFields(
  provider: ProviderRow,
  candidates: EnrichmentCandidate[],
  stats: RunStats
): Promise<number> {
  const providersPayload: Record<string, unknown> = {};

  for (const c of candidates) {
    if (c.current_value !== null && c.current_value !== undefined && c.current_value !== '' &&
        !(Array.isArray(c.current_value) && c.current_value.length === 0)) {
      continue;
    }

    const fieldName = c.field_name;
    const value = c.proposed_value;

    if (fieldName === 'provider_description') {
      providersPayload.provider_description = value;
    } else if (fieldName === 'opening_hours') {
      providersPayload.opening_hours = value;
    } else if (fieldName === 'contact_phone') {
      providersPayload.contact_phone = value;
    } else if (fieldName === 'social_website') {
      providersPayload.social_website = value;
    }
  }

  const rpcPayload: Record<string, unknown> = {};
  if (Object.keys(providersPayload).length > 0) {
    rpcPayload.providers = providersPayload;
  }

  const appliedViaRpc = Object.keys(providersPayload).length;

  if (appliedViaRpc === 0) {
    return 0;
  }

  try {
    if (Object.keys(rpcPayload).length > 0) {
      const { error: rpcError } = await supabase
        .rpc('admin_update_provider', {
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

    const appliedFields = Object.keys(providersPayload);

    for (const c of candidates) {
      if (!appliedFields.includes(c.field_name)) continue;

      await supabase
        .from('enrichment_candidates')
        .upsert(
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
  stats: RunStats
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
    const { error: rpcError } = await supabase
      .rpc('admin_update_provider', {
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
      'provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible'
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
      } else if (woltResult.candidates.length > 0) {
        await autoApplyDeliveryFields(provider, woltResult, noAlcoholMap, stats, 'wolt');
      } else {
        stats.unchangedCount++;
      }

      // Lieferando enrichment
      const lieferandoResult = await enrichFromLieferando(
        snapshot,
        lieferandoClient,
        geocoder,
      );
      if (lieferandoResult.error) {
        console.log(`⚠️ Lieferando: ${lieferandoResult.error}`);
      } else if (lieferandoResult.candidates.length > 0) {
        await autoApplyLieferandoFields(provider, lieferandoResult, noAlcoholMap, stats);
      }

      if (!hasError) {
        await supabase
          .from('pending_enrichments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', item.id);
      } else {
        await supabase
          .from('pending_enrichments')
          .update({ status: 'failed', error_message: 'Enrichment completed with errors', completed_at: now })
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
