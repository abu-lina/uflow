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
} from '../src/lib/enrichment/joinhalal-enricher';
import {
  enrichFromWolt,
  type DeliveryPlatformSnapshot,
} from '../src/lib/enrichment/delivery-enricher';
import { createWoltClient } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { StaticCityGeocoder } from '../src/lib/enrichment/delivery-platform/geocoder';

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
const isDryRun = !isWrite; // default is dry-run
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
  offers_ids: string[] | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  enrichment_eligible: boolean;
}

interface RunStats {
  source: string;
  triggeredBy: string;
  providersSelected: number;
  providersProcessed: number;
  candidatesCreated: number;
  unchangedCount: number;
  failureCount: number;
  circuitBreakerTriggered: boolean;
  startedAt: string;
  finishedAt?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n🔄 Provider Enrichment Pipeline`);
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN (preview only)' : 'WRITE (staging candidates)'}`);
  console.log(`   Source: ${source}`);
  console.log(`   Limit: ${limit ?? 'all eligible'}\n`);

  const stats: RunStats = {
    source,
    triggeredBy: isDryRun ? 'cli_dry_run' : 'cli_write',
    providersSelected: 0,
    providersProcessed: 0,
    candidatesCreated: 0,
    unchangedCount: 0,
    failureCount: 0,
    circuitBreakerTriggered: false,
    startedAt: new Date().toISOString(),
  };

  if (source === 'wolt') {
    await runWoltEnrichment(stats, isWrite, limit);
    return;
  }

  if (source !== 'joinhalal') {
    console.error(`❌ Unsupported source: ${source}. Only 'joinhalal' and 'wolt' are supported.`);
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
      'provider_id, provider_name, import_source, import_source_url, offers_ids, contact_phone, social_website, social_instagram, address_street, address_zip, address_city, address_country, enrichment_eligible'
    )
    .eq('import_source', source)
    .eq('review_status', 'approved')
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
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 5) {
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
      };

      const candidates = buildEnrichmentCandidates(snapshot, parsed, source, url);

      if (candidates.length === 0) {
        console.log('✅ no changes');
        stats.unchangedCount++;
      } else {
        console.log(`📝 ${candidates.length} candidate(s)`);
        for (const c of candidates) {
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
  console.log(`  📊 Enrichment Summary`);
  console.log(`     Selected:   ${stats.providersSelected}`);
  console.log(`     Processed:  ${stats.providersProcessed}`);
  console.log(`     Unchanged:  ${stats.unchangedCount}`);
  console.log(`     Candidates: ${stats.candidatesCreated}`);
  console.log(`     Failed:     ${stats.failureCount}`);
  if (stats.circuitBreakerTriggered) {
    console.log(`     ⚡ Circuit breaker was triggered`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (allCandidates.length > 0) {
    console.log(`\n  📋 Candidate Preview (first 10):`);
    for (const c of allCandidates.slice(0, 10)) {
      console.log(`     ${c.providerName} → ${c.field_name}: ${JSON.stringify(c.current_value)} → ${JSON.stringify(c.proposed_value)}`);
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
  } else if (isDryRun) {
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates.`);
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
  isWrite: boolean,
  limit: number | undefined,
): Promise<void> {
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
      if (failRate > CIRCUIT_BREAKER_THRESHOLD && stats.providersProcessed >= 5) {
        console.error(`\n  ⚡ CIRCUIT BREAKER: ${(failRate * 100).toFixed(0)}% failure rate after ${stats.providersProcessed} providers. Aborting.`);
        stats.circuitBreakerTriggered = true;
        break;
      }
    }

    process.stdout.write(`  🔍 ${provider.provider_name} ... `);

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
        console.log(`⚠️  ${result.error}`);
        stats.failureCount++;
        continue;
      }

      if (result.candidates.length === 0) {
        console.log('✅ no changes');
        stats.unchangedCount++;
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
  console.log(`     Candidates: ${stats.candidatesCreated}`);
  console.log(`     Failed:     ${stats.failureCount}`);
  if (stats.circuitBreakerTriggered) {
    console.log(`     ⚡ Circuit breaker was triggered`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (allCandidates.length > 0) {
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
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates.`);
  }

  // 6. Write run log
  await writeRunLog(stats);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
