/**
 * scripts/import-joinhalal.ts
 *
 * JoinHalal Provider Data Ingestion Pipeline (Plan 047 — v0.8.4)
 *
 * Fetches public business listings from joinhalal.com, normalizes them to the
 * UFlow provider schema, resolves categories, and bulk-upserts into Supabase.
 *
 * ─── IMPORTANT OPERATIONAL NOTES ───────────────────────────────────────────
 * • Always run with --dry-run first to inspect the import plan before writing.
 * • The script uses SUPABASE_SERVICE_ROLE_KEY (admin/service-role access).
 *   This bypasses RLS. Handle credentials with care.
 * • Imported rows default to review_status = 'pending' and are not publicly
 *   visible until approved via the admin moderation workflow.
 * • The outreach trigger (migration 059) is bypassed: user_created_id is set
 *   to the import-bot user UUID, which the trigger treats as non-anonymous.
 * • rate-limit: ~200ms delay between page fetches to be polite to the source.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npx tsx scripts/import-joinhalal.ts --dry-run
 *   npx tsx scripts/import-joinhalal.ts --dry-run --limit 10
 *   npx tsx scripts/import-joinhalal.ts --write --limit 50
 *   npx tsx scripts/import-joinhalal.ts --write
 *   npx tsx scripts/import-joinhalal.ts --write --sitemap https://joinhalal.com/locations-sitemap2.xml
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required — service-role for admin writes)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  extractSchemaOrgFromHtml,
  extractDisplayNameFromHtml,
  parseGermanAddress,
  extractInstagramFromSameAs,
  cleanProviderName,
  extractUrlsFromSitemapXml,
  extractCategoryFromUrl,
} from '../src/utils/joinhalal-parser';
import {
  runJoinHalalDryRun,
  makeProviderKey,
  resolveCategoryId,
  buildCliWriteCommand,
  IMPORT_BOT_UUID,
  DEFAULT_SITEMAPS,
  type ImportLimit,
  type Category,
  type DryRunResult,
} from '../src/lib/import/joinhalal';

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

/**
 * A deterministic sentinel UUID used as user_created_id for all imported rows.
 * This UUID must exist in auth.users (created by ensureImportBotUser() below).
 *
 * MUST be a valid UUID (all hex chars). Uses plan number 047 as suffix for
 * human traceability while remaining a valid PostgreSQL uuid type value.
 *
 * Purpose:
 *   1. Bypasses the provider outreach trigger (which only fires when BOTH
 *      provider_owner_id AND user_created_id are NULL).
 *   2. Provides a stable, queryable provenance marker:
 *        SELECT * FROM providers WHERE user_created_id = '<this UUID>';
 */
const IMPORT_BOT_EMAIL = 'import-bot-joinhalal@system.internal';

/** Polite delay between page fetches (ms) */
const FETCH_DELAY_MS = 250;

/** Supabase upsert batch size */
const BATCH_SIZE = 50;

/** HTTP User-Agent — identifies the bot as a legitimate import tool */
const USER_AGENT = 'UFlow-Import/1.0 (+https://ummahflow.com/import)';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProviderUpsert {
  provider_name: string;
  /** Conditionally included only when the column exists in the target schema */
  provider_description?: string | null;
  category_id: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  review_status: 'pending';
  user_created_id: string;
  provider_owner_id: null;
  show_address: boolean;
  offers_ids: string[];
  needs_ids: string[];
  barakah_effects: string[];
  import_source_url: string | null;
}

interface WriteStats {
  total: number;
  parsed: number;
  mapped: number;
  unmapped: number;
  skipped: number;
  failed: number;
  inserted: number;
}

interface UnmappedEntry {
  sourceCategory: string;
  name: string;
  url: string;
}

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Import bot user setup ────────────────────────────────────────────────────

/**
 * Ensures the import-bot user exists in auth.users.
 *
 * The providers.user_created_id FK references auth.users(id).
 * We must create the import-bot user once before inserting providers.
 *
 * This operation is idempotent — if the user already exists, we skip creation.
 */
async function ensureImportBotUser(): Promise<boolean> {
  try {
    // Check if already exists
    const { data: existing } = await supabase.auth.admin.getUserById(IMPORT_BOT_UUID);
    if (existing?.user) {
      console.log(`  ✓ Import-bot user already exists (${IMPORT_BOT_UUID})`);
      return true;
    }
  } catch {
    // Not found — proceed to create
  }

  const { error } = await supabase.auth.admin.createUser({
    // Explicitly set the UUID so it matches IMPORT_BOT_UUID used in FK inserts
    id: IMPORT_BOT_UUID,
    email: IMPORT_BOT_EMAIL,
    email_confirm: true,
    user_metadata: {
      display_name: 'JoinHalal Import Bot',
      system_user: true,
    },
  });

  if (error) {
    console.error(`  ❌ Failed to create import-bot user: ${error.message}`);
    return false;
  }

  console.log(`  ✓ Import-bot user created (${IMPORT_BOT_EMAIL})`);
  return true;
}

// ─── Schema verification ───────────────────────────────────────────────────────

/**
 * Verifies whether provider_description column exists in the target schema.
 * Migration 056 notes it may be absent in production.
 */
async function checkProviderDescriptionExists(): Promise<boolean> {
  const { data, error } = await supabase
    .from('providers')
    .select('provider_description')
    .limit(1);

  if (error?.message?.includes('column') && error.message.includes('provider_description')) {
    return false;
  }
  return !error || data !== null;
}

// ─── Category resolution ───────────────────────────────────────────────────────

async function loadCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name_de')
    .order('name_de');

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }
  return (data ?? []) as Category[];
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

const MAX_RETRY_ON_RATE_LIMIT = 3;

async function fetchText(url: string, attempt = 1): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'de,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 429 && attempt <= MAX_RETRY_ON_RATE_LIMIT) {
        const backoff = attempt * 5000;
        console.warn(`  ⚠ Rate limited (429) on ${url} — waiting ${backoff / 1000}s (attempt ${attempt}/${MAX_RETRY_ON_RATE_LIMIT})`);
        await sleep(backoff);
        return fetchText(url, attempt + 1);
      }
      console.warn(`  ⚠ HTTP ${response.status} for ${url}`);
      return null;
    }

    return response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠ Fetch error for ${url}: ${message}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Discovery ────────────────────────────────────────────────────────────────

async function collectLocationUrls(
  sitemapUrls: string[],
  limit: number | null
): Promise<string[]> {
  const allUrls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    if (limit !== null && allUrls.length >= limit) break;

    console.log(`  Fetching sitemap: ${sitemapUrl}`);
    const xml = await fetchText(sitemapUrl);
    if (!xml) {
      console.warn(`  ⚠ Could not fetch sitemap: ${sitemapUrl}`);
      continue;
    }

    const urls = extractUrlsFromSitemapXml(xml);
    console.log(`    → Found ${urls.length} URLs`);
    allUrls.push(...urls);

    await sleep(200);
  }

  return limit !== null ? allUrls.slice(0, limit) : allUrls;
}

// ─── Transformation ────────────────────────────────────────────────────────────

interface TransformResult {
  record: ProviderUpsert | null;
  error?: string;
  unmapped?: { category: string; url: string; name: string };
}

function transformPageToProvider(
  html: string,
  url: string,
  categories: Category[],
  includeDescription: boolean
): TransformResult {
  const schema = extractSchemaOrgFromHtml(html);
  if (!schema) {
    return { record: null, error: 'No Schema.org JSON-LD found' };
  }

  const displayName = extractDisplayNameFromHtml(html);
  const rawName = schema.name ?? '';
  const providerName = cleanProviderName(rawName, displayName);

  if (!providerName) {
    return { record: null, error: 'Empty provider name after normalization' };
  }

  const categorySlug = extractCategoryFromUrl(url);
  const categoryId = resolveCategoryId(categorySlug, categories);

  const addressStr = schema.address?.streetAddress ?? '';
  const { street, zip, city, country } = parseGermanAddress(addressStr);

  const cityFallback = schema.address?.addressLocality ?? null;
  const resolvedCity = city ?? cityFallback;

  const instagram = extractInstagramFromSameAs(schema.sameAs);
  const website = schema.url ?? null;

  const record: ProviderUpsert = {
    provider_name: providerName,
    category_id: categoryId,
    address_street: street,
    address_zip: zip,
    address_city: resolvedCity,
    address_country: country ?? schema.address?.addressCountry ?? 'DE',
    contact_email: schema.email ?? null,
    contact_phone: schema.telephone ?? null,
    social_website: website,
    social_instagram: instagram,
    review_status: 'pending',
    user_created_id: IMPORT_BOT_UUID,
    provider_owner_id: null,
    show_address: true,
    offers_ids: [],
    needs_ids: [],
    barakah_effects: [],
    import_source_url: url,
  };

  if (includeDescription && schema.description) {
    // Only include auto-generated description if it looks like a real description
    // (not the Rank Math template "Entdecke X, ein halal Restaurant in Y...")
    const desc = schema.description.trim();
    const isTemplate =
      desc.startsWith('Entdecke ') &&
      (desc.includes('halal Restaurant') || desc.includes('halal '));
    if (!isTemplate) {
      record.provider_description = desc || null;
    } else {
      record.provider_description = null;
    }
  }

  const unmapped =
    !categoryId && categorySlug
      ? { category: categorySlug, url, name: providerName }
      : undefined;

  return { record, unmapped };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Checks existing providers for duplicates by provider_name + address_city.
 * Returns a Set of existing "name|city" keys for fast lookups.
 */
async function loadExistingProviderKeys(): Promise<Set<string>> {
  const existing = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('provider_name, address_city')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn(`  ⚠ Could not load existing providers: ${error.message}`);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      existing.add(
        makeProviderKey(
          (row.provider_name ?? '') as string,
          (row.address_city ?? null) as string | null
        )
      );
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return existing;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function printDryRunReport(result: DryRunResult, limit: ImportLimit) {
  const { stats, unmappedGroups, samples } = result;
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  DRY-RUN REPORT — no data was written');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  URLs discovered      : ${stats.total}`);
  console.log(`  Successfully parsed  : ${stats.parsed}`);
  console.log(`  Category mapped      : ${stats.mapped}`);
  console.log(`  Unmapped category    : ${stats.unmapped}`);
  console.log(`  Skipped (duplicate)  : ${stats.skipped}`);
  console.log(`  Parse failures       : ${stats.failed}`);
  console.log(`  Would INSERT         : ${stats.wouldInsert}`);

  if (unmappedGroups.length > 0) {
    console.log('\n  Unmapped categories (top 10):');
    unmappedGroups.slice(0, 10).forEach(({ sourceCategory, count, example }) => {
      console.log(`    "${sourceCategory}" (${count} entries) — example: "${example}"`);
    });
  }

  if (samples.length > 0) {
    console.log('\n  Sample records (first 3):');
    samples.forEach((r, i) => {
      console.log(`\n  [${i + 1}] ${r.provider_name}`);
      console.log(`      city     : ${r.address_city ?? '—'}`);
      console.log(`      category : ${r.category_id ?? 'UNMAPPED'}`);
      console.log(`      street   : ${r.address_street ?? '—'}`);
      console.log(`      website  : ${r.social_website ?? '—'}`);
      console.log(`      email    : ${r.contact_email ?? '—'}`);
    });
  }

  console.log(`\n  To execute the import, run:`);
  console.log(`    ${buildCliWriteCommand(limit)}`);
  console.log('════════════════════════════════════════════════════════\n');
}

function printWriteReport(stats: WriteStats) {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  WRITE REPORT');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  URLs processed       : ${stats.total}`);
  console.log(`  Successfully parsed  : ${stats.parsed}`);
  console.log(`  Inserted             : ${stats.inserted}`);
  console.log(`  Skipped (duplicate)  : ${stats.skipped}`);
  console.log(`  Unmapped category    : ${stats.unmapped}`);
  console.log(`  Parse failures       : ${stats.failed}`);
  console.log('\n  To query imported records:');
  console.log(`    SELECT * FROM providers WHERE user_created_id = '${IMPORT_BOT_UUID}';`);
  console.log('════════════════════════════════════════════════════════\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--write');
  const limitFlag = args.findIndex((a) => a === '--limit');
  const limitRaw = limitFlag >= 0 ? parseInt(args[limitFlag + 1], 10) : null;
  const limit: ImportLimit =
    limitRaw === 10 || limitRaw === 50 || limitRaw === 100 ? limitRaw : 'all';
  const sitemapFlag = args.findIndex((a) => a === '--sitemap');
  const sitemapUrls =
    sitemapFlag >= 0 ? [args[sitemapFlag + 1]] : DEFAULT_SITEMAPS;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   UFlow — JoinHalal Provider Import (Plan 047/048)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Mode       : ${isDryRun ? '🔍 DRY-RUN (no writes)' : '✍️  WRITE'}`);
  console.log(`  Limit      : ${limit}`);
  console.log(`  Sitemaps   : ${sitemapUrls.length} file(s)\n`);

  // ─── DRY-RUN: delegate to shared import core ─────────────────────────────
  if (isDryRun) {
    console.log('▶ Running dry-run via shared import core...');
    try {
      const result = await runJoinHalalDryRun({ supabase, limit, sitemapUrls });
      printDryRunReport(result, limit);
    } catch (err) {
      console.error(`❌ Dry-run failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
    return;
  }

  // ─── WRITE MODE ────────────────────────────────────────────────────────────

  // Load categories
  console.log('▶ Loading categories from Supabase...');
  const categories = await loadCategories();
  console.log(`  ✓ Loaded ${categories.length} categories`);
  if (categories.length === 0) {
    console.error('  ❌ No categories found — cannot resolve category IDs. Aborting.');
    process.exit(1);
  }

  // Check provider_description column availability
  console.log('▶ Checking provider_description column availability...');
  const hasDescriptionColumn = await checkProviderDescriptionExists();
  console.log(
    `  ${hasDescriptionColumn ? '✓ Column available' : '⚠ Column absent — description mapping skipped'}`
  );

  // Ensure import-bot user exists (required for FK constraint)
  console.log('▶ Ensuring import-bot user exists in auth.users...');
  const botOk = await ensureImportBotUser();
  if (!botOk) {
    console.error('  ❌ Cannot proceed without import-bot user. Aborting.');
    process.exit(1);
  }

  // Collect URLs from sitemaps
  const numericLimit = limit === 'all' ? null : limit;
  console.log('\n▶ Collecting location URLs from sitemaps...');
  const locationUrls = await collectLocationUrls(sitemapUrls, numericLimit);
  console.log(`  ✓ Total URLs to process: ${locationUrls.length}`);

  if (locationUrls.length === 0) {
    console.error('  ❌ No URLs found in sitemaps. Aborting.');
    process.exit(1);
  }

  // Load existing providers for deduplication
  console.log('\n▶ Loading existing provider keys for deduplication...');
  const existingKeys = await loadExistingProviderKeys();
  console.log(`  ✓ Loaded ${existingKeys.size} existing providers`);

  // Process each URL
  console.log('\n▶ Processing location pages...');
  const stats: WriteStats = {
    total: locationUrls.length,
    parsed: 0,
    mapped: 0,
    unmapped: 0,
    skipped: 0,
    failed: 0,
    inserted: 0,
  };

  const unmappedEntries: UnmappedEntry[] = [];
  const toInsert: ProviderUpsert[] = [];

  for (let i = 0; i < locationUrls.length; i++) {
    const url = locationUrls[i];
    const progress = `[${i + 1}/${locationUrls.length}]`;

    if ((i + 1) % 25 === 0 || i === 0) {
      console.log(`  ${progress} Processing...`);
    }

    const html = await fetchText(url);
    if (!html) {
      stats.failed++;
      continue;
    }

    const { record, error, unmapped } = transformPageToProvider(
      html,
      url,
      categories,
      hasDescriptionColumn
    );

    if (error || !record) {
      stats.failed++;
      console.warn(`  ⚠ ${progress} Parse error (${url}): ${error ?? 'unknown'}`);
      continue;
    }

    stats.parsed++;

    if (unmapped) {
      stats.unmapped++;
      unmappedEntries.push({ sourceCategory: unmapped.category, name: unmapped.name, url });
    } else {
      stats.mapped++;
    }

    const providerKey = makeProviderKey(record.provider_name, record.address_city);
    if (existingKeys.has(providerKey)) {
      stats.skipped++;
      continue;
    }
    existingKeys.add(providerKey);

    toInsert.push(record);

    await sleep(FETCH_DELAY_MS);
  }

  // ─ Bulk upsert in batches
  if (toInsert.length === 0) {
    console.log('\n  No new records to insert (all duplicates or mapping failures).');
    printWriteReport(stats);
    return;
  }

  console.log(`\n▶ Upserting ${toInsert.length} providers in batches of ${BATCH_SIZE}...`);

  for (let offset = 0; offset < toInsert.length; offset += BATCH_SIZE) {
    const batch = toInsert.slice(offset, offset + BATCH_SIZE);

    // Remove import_source_url if the column doesn't exist in schema
    // (This is not a standard provider column — stored as a metadata only)
    const cleanBatch = batch.map(({ import_source_url: _ignored, ...rest }) => rest);

    const { error } = await supabase
      .from('providers')
      .insert(cleanBatch);

    if (error) {
      console.error(
        `  ❌ Batch insert failed (offset ${offset}): ${error.message}`
      );
      stats.failed += batch.length;
      continue;
    }

    stats.inserted += batch.length;
    console.log(
      `  ✓ Batch ${Math.floor(offset / BATCH_SIZE) + 1}: inserted ${batch.length} records`
    );
  }

  printWriteReport(stats);
}

main().catch((err) => {
  console.error('\n❌ Unhandled error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
