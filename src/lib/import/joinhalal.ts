/**
 * Shared JoinHalal import core — server-safe, side-effect-free orchestration.
 *
 * This module is used by:
 *   - scripts/import-joinhalal.ts (CLI dry-run path)
 *   - src/app/api/admin/import-joinhalal/dry-run/route.ts (admin API)
 *
 * Design constraints:
 *   - No dotenv, no process.exit(), no console output.
 *   - Accepts a Supabase service-role client as a dependency (injected by callers).
 *   - Returns structured data; callers are responsible for presentation/formatting.
 *   - Throws errors for unrecoverable conditions (caller decides how to handle).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractSchemaOrgFromHtml,
  extractDisplayNameFromHtml,
  parseGermanAddress,
  extractInstagramFromSameAs,
  cleanProviderName,
  extractUrlsFromSitemapXml,
  extractCategoryFromUrl,
  extractSpeisen,
  extractJoinHalalPostId,
} from '@/utils/joinhalal-parser';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ImportLimit = 10 | 50 | 100 | 'all';

export interface Category {
  category_id: string;
  name_de: string;
}

export interface Offer {
  offer_id: string;
  name_de: string;
}

export interface DryRunStats {
  /** Total URLs discovered from sitemaps */
  total: number;
  /** Successfully parsed (Schema.org found + name resolved) */
  parsed: number;
  /** Records with a mapped UFlow category_id */
  mapped: number;
  /** Records with no matching UFlow category */
  unmapped: number;
  /** Skipped because an identical name+city exists in the DB */
  skipped: number;
  /** Failed to parse (no schema, empty name, etc.) */
  failed: number;
  /** Net new records that would be inserted */
  wouldInsert: number;
  /** Records that would be updated (import_source+import_source_id already exists) */
  wouldUpdate: number;
}

export interface UnmappedGroup {
  sourceCategory: string;
  count: number;
  example: string;
}

export interface SampleRecord {
  provider_name: string;
  address_city: string | null;
  category_id: string | null;
  address_street: string | null;
  social_website: string | null;
  contact_email: string | null;
  offers_matched?: number;
}

export interface UnmappedOfferGroup {
  speise: string;
  count: number;
  example: string;
}

export interface DryRunResult {
  stats: DryRunStats;
  unmappedGroups: UnmappedGroup[];
  unmappedOffers: UnmappedOfferGroup[];
  samples: SampleRecord[];
  timing?: DryRunTiming;
}

export interface DryRunTiming {
  /** Total wall-clock time for the entire dry-run (ms). */
  totalMs: number;
  /** Time to load categories from DB (ms). */
  categoriesMs: number;
  /** Time to load offers catalog from DB (ms). */
  offersMs: number;
  /** Time to check provider_description column existence (ms). */
  descCheckMs: number;
  /** Time to load existing provider keys from DB (ms). */
  existingKeysMs: number;
  /** Time to fetch and parse sitemaps (ms). */
  sitemapMs: number;
  /** Time to fetch and process individual pages (ms). */
  pageProcessingMs: number;
}

export interface DryRunOptions {
  /** Service-role Supabase client (injected by caller). */
  supabase: SupabaseClient;
  limit: ImportLimit;
  /** Defaults to DEFAULT_SITEMAPS when omitted. */
  sitemapUrls?: string[];
  /** Optional AbortSignal for caller-controlled timeout. */
  signal?: AbortSignal;
}

// ─── Public constants ─────────────────────────────────────────────────────────

/**
 * Deterministic sentinel UUID for all imported rows.
 * Must exist in auth.users (created by ensureImportBotUser in the CLI).
 * Using plan 047 suffix for human traceability.
 */
export const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000047000001';

export const DEFAULT_SITEMAPS = [
  'https://joinhalal.com/locations-sitemap1.xml',
  'https://joinhalal.com/locations-sitemap2.xml',
  'https://joinhalal.com/locations-sitemap3.xml',
  'https://joinhalal.com/locations-sitemap4.xml',
  'https://joinhalal.com/locations-sitemap5.xml',
];

/**
 * Maps JoinHalal URL category slugs to UFlow category names (German).
 * Unknown slugs result in category_id = null (reported as unmapped).
 */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  restaurant: 'Restaurant',
  'food-truck': 'Imbiss',
  metzgerei: 'Metzgerei',
  imbiss: 'Imbiss',
  cafe: 'Café',
  baeckerei: 'Bäckerei',
  supermarkt: 'Supermarkt',
  moschee: 'Moschee',
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves a JoinHalal URL category slug to a UFlow category_id.
 * Returns null for unmapped or missing slugs.
 */
export function resolveCategoryId(
  slug: string | null,
  categories: Category[]
): string | null {
  if (!slug) return null;
  const targetName = CATEGORY_SLUG_MAP[slug.toLowerCase()];
  if (!targetName) return null;
  const match = categories.find(
    (c) => c.name_de.toLowerCase() === targetName.toLowerCase()
  );
  return match?.category_id ?? null;
}

/**
 * Generates a deduplication key for a provider record.
 * Used to detect name+city collisions against existing DB rows.
 */
export function makeProviderKey(name: string, city: string | null): string {
  return `${name.toLowerCase().trim()}|${(city ?? '').toLowerCase().trim()}`;
}

/**
 * Resolves an array of Speisen food terms against the offers catalog.
 * Matching is deterministic and case-insensitive.
 * Returns matched offer IDs (deduplicated) and any unmatched terms.
 */
export function resolveOfferIds(
  speisen: string[],
  offers: Offer[]
): { matchedIds: string[]; unmatchedSpeisen: string[] } {
  if (speisen.length === 0) return { matchedIds: [], unmatchedSpeisen: [] };

  const lookupMap = new Map(offers.map((o) => [o.name_de.toLowerCase(), o.offer_id]));
  const matchedIds: string[] = [];
  const unmatchedSpeisen: string[] = [];
  const seen = new Set<string>();

  for (const term of speisen) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const offerId = lookupMap.get(key);
    if (offerId) {
      matchedIds.push(offerId);
    } else {
      unmatchedSpeisen.push(term);
    }
  }

  return { matchedIds, unmatchedSpeisen };
}

/**
 * Returns the CLI command an operator should run for write-mode execution
 * with the given limit. Displayed in the dashboard as a copyable command.
 */
export function buildCliWriteCommand(limit: ImportLimit): string {
  if (limit === 'all') return 'npx tsx scripts/import-joinhalal.ts --write';
  return `npx tsx scripts/import-joinhalal.ts --write --limit ${limit}`;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const FETCH_DELAY_MS = 250;
const BATCH_SIZE_CHECK = 1000;
const MAX_RETRY_ON_RATE_LIMIT = 3;
const USER_AGENT = 'UFlow-Import/1.0 (+https://ummahflow.com/import)';
const MAX_SAMPLES = 3;

// ─── Internal types ───────────────────────────────────────────────────────────

interface ProviderRecord {
  provider_name: string;
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
  import_source: string | null;
  import_source_id: string | null;
  import_source_url: string | null;
  provider_description?: string | null;
}

interface UnmappedEntry {
  sourceCategory: string;
  name: string;
}

interface UnmappedOfferEntry {
  speise: string;
  providerName: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string, callerSignal?: AbortSignal, attempt = 1): Promise<string | null> {
  try {
    const fetchSignal = callerSignal
      ? AbortSignal.any([AbortSignal.timeout(15000), callerSignal])
      : AbortSignal.timeout(15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'de,en;q=0.5',
      },
      signal: fetchSignal,
    });

    if (!response.ok) {
      if (response.status === 429 && attempt <= MAX_RETRY_ON_RATE_LIMIT) {
        const backoff = attempt * 5000;
        await sleep(backoff);
        return fetchText(url, callerSignal, attempt + 1);
      }
      return null;
    }

    return response.text();
  } catch {
    return null;
  }
}

async function collectLocationUrls(
  sitemapUrls: string[],
  limit: ImportLimit,
  signal?: AbortSignal
): Promise<string[]> {
  const allUrls: string[] = [];
  const numericLimit = limit === 'all' ? null : limit;

  for (const sitemapUrl of sitemapUrls) {
    if (numericLimit !== null && allUrls.length >= numericLimit) break;

    const xml = await fetchText(sitemapUrl, signal);
    if (!xml) continue;

    const urls = extractUrlsFromSitemapXml(xml);
    allUrls.push(...urls);

    await sleep(200);
  }

  return numericLimit !== null ? allUrls.slice(0, numericLimit) : allUrls;
}

async function loadCategories(supabase: SupabaseClient): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name_de')
    .order('name_de');

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }
  return (data ?? []) as Category[];
}

async function loadOffers(supabase: SupabaseClient): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('offer_id, name_de')
    .order('name_de');

  if (error) {
    throw new Error(`Failed to load offers: ${error.message}`);
  }
  return (data ?? []) as Offer[];
}

async function checkProviderDescriptionExists(
  supabase: SupabaseClient
): Promise<boolean> {
  const { error } = await supabase
    .from('providers')
    .select('provider_description')
    .limit(1);

  if (error?.message?.includes('column') && error.message.includes('provider_description')) {
    return false;
  }
  return !error;
}

async function loadExistingProviderKeys(
  supabase: SupabaseClient
): Promise<{ nameCityKeys: Set<string>; importSourceKeys: Set<string> }> {
  const nameCityKeys = new Set<string>();
  const importSourceKeys = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('provider_name, address_city, import_source, import_source_id')
      .range(offset, offset + BATCH_SIZE_CHECK - 1);

    if (error) break;
    if (!data || data.length === 0) break;

    for (const row of data) {
      nameCityKeys.add(
        makeProviderKey(
          (row.provider_name ?? '') as string,
          (row.address_city ?? null) as string | null
        )
      );
      // Build import-source key set for upsert detection
      const src = row.import_source as string | null;
      const srcId = row.import_source_id as string | null;
      if (src && srcId) {
        importSourceKeys.add(`${src}:${srcId}`);
      }
    }

    if (data.length < BATCH_SIZE_CHECK) break;
    offset += BATCH_SIZE_CHECK;
  }

  return { nameCityKeys, importSourceKeys };
}

function transformPage(
  html: string,
  url: string,
  categories: Category[],
  includeDescription: boolean,
  offers: Offer[]
): { record: ProviderRecord | null; error?: string; unmappedCategory?: string; unmatchedSpeisen?: string[] } {
  const schema = extractSchemaOrgFromHtml(html);
  if (!schema) return { record: null, error: 'No Schema.org JSON-LD found' };

  const displayName = extractDisplayNameFromHtml(html);
  const rawName = schema.name ?? '';
  const providerName = cleanProviderName(rawName, displayName);

  if (!providerName) return { record: null, error: 'Empty provider name after normalization' };

  const categorySlug = extractCategoryFromUrl(url);
  const categoryId = resolveCategoryId(categorySlug, categories);

  const { street, zip, city, country } = parseGermanAddress(
    schema.address?.streetAddress ?? ''
  );
  const resolvedCity = city ?? (schema.address?.addressLocality ?? null);

  // Resolve Speisen → offers_ids
  const speisen = extractSpeisen(schema);
  const { matchedIds, unmatchedSpeisen } = resolveOfferIds(speisen, offers);

  // Extract JoinHalal post ID for upsert conflict resolution (Plan 052)
  const postId = extractJoinHalalPostId(html);

  const record: ProviderRecord = {
    provider_name: providerName,
    category_id: categoryId,
    address_street: street,
    address_zip: zip,
    address_city: resolvedCity,
    address_country: country ?? schema.address?.addressCountry ?? 'DE',
    contact_email: schema.email ?? null,
    contact_phone: schema.telephone ?? null,
    social_website: schema.url ?? null,
    social_instagram: extractInstagramFromSameAs(schema.sameAs),
    review_status: 'pending',
    user_created_id: IMPORT_BOT_UUID,
    provider_owner_id: null,
    show_address: true,
    offers_ids: matchedIds,
    needs_ids: [],
    barakah_effects: [],
    import_source: postId ? 'joinhalal' : null,
    import_source_id: postId,
    import_source_url: url,
  };

  if (includeDescription && schema.description) {
    const desc = schema.description.trim();
    const isTemplate =
      desc.startsWith('Entdecke ') &&
      (desc.includes('halal Restaurant') || desc.includes('halal '));
    record.provider_description = isTemplate ? null : desc || null;
  }

  const unmappedCategory =
    !categoryId && categorySlug ? categorySlug : undefined;

  return {
    record,
    unmappedCategory,
    unmatchedSpeisen: unmatchedSpeisen.length > 0 ? unmatchedSpeisen : undefined,
  };
}

// ─── Main exported function ───────────────────────────────────────────────────

/**
 * Executes a JoinHalal dry-run preview using the provided service-role Supabase
 * client. Discovers URLs, parses pages, resolves categories, deduplicates against
 * existing DB rows, and returns a structured preview result.
 *
 * Does NOT write any data to the database.
 * Throws on unrecoverable conditions (no categories, etc.).
 */
export async function runJoinHalalDryRun(
  options: DryRunOptions
): Promise<DryRunResult> {
  const { supabase, limit, sitemapUrls = DEFAULT_SITEMAPS, signal } = options;

  // Check for pre-aborted signal
  if (signal?.aborted) {
    throw new Error('Dry-run aborted: operation was cancelled before it started.');
  }

  const t0 = performance.now();

  // Load categories (required — cannot proceed without them)
  const tCatStart = performance.now();
  const categories = await loadCategories(supabase);
  const tCatEnd = performance.now();
  if (categories.length === 0) {
    throw new Error('No categories found in database. Cannot resolve category IDs.');
  }

  if (signal?.aborted) {
    throw new Error('Dry-run aborted: timeout exceeded during category loading.');
  }

  // Load offers catalog for Speisen resolution
  const tOffersStart = performance.now();
  const offers = await loadOffers(supabase);
  const tOffersEnd = performance.now();

  const tDescCheckStart = performance.now();
  const hasDescriptionColumn = await checkProviderDescriptionExists(supabase);
  const tDescCheckEnd = performance.now();

  // Collect URLs from sitemaps
  const tSitemapStart = performance.now();
  const locationUrls = await collectLocationUrls(sitemapUrls, limit, signal);
  const tSitemapEnd = performance.now();
  if (locationUrls.length === 0) {
    throw new Error('No location URLs found in sitemaps.');
  }

  if (signal?.aborted) {
    throw new Error('Dry-run aborted: timeout exceeded during sitemap collection.');
  }

  // Load existing keys for deduplication and upsert detection
  const tKeysStart = performance.now();
  const { nameCityKeys: existingKeys, importSourceKeys } = await loadExistingProviderKeys(supabase);
  const tKeysEnd = performance.now();

  if (signal?.aborted) {
    throw new Error('Dry-run aborted: timeout exceeded during key loading.');
  }

  // Process each URL
  const stats = {
    total: locationUrls.length,
    parsed: 0,
    mapped: 0,
    unmapped: 0,
    skipped: 0,
    failed: 0,
    wouldUpdate: 0,
  };

  const unmappedEntries: UnmappedEntry[] = [];
  const unmappedOfferEntries: UnmappedOfferEntry[] = [];
  const samples: SampleRecord[] = [];
  let insertCount = 0;
  // Track intra-run dedup: name+city keys for null-source records
  const seenInRun = new Set<string>(existingKeys);
  // Track intra-run dedup: import-source keys for import-sourced records
  // (starts EMPTY — DB keys are checked via importSourceKeys.has() for wouldUpdate)
  const seenImportKeys = new Set<string>();

  const tPagesStart = performance.now();
  for (const url of locationUrls) {
    if (signal?.aborted) {
      throw new Error('Dry-run aborted: timeout exceeded during page processing.');
    }

    const html = await fetchText(url, signal);

    if (signal?.aborted) {
      throw new Error('Dry-run aborted: timeout exceeded during page fetch.');
    }

    if (!html) {
      stats.failed++;
      continue;
    }

    const { record, error, unmappedCategory, unmatchedSpeisen } = transformPage(
      html,
      url,
      categories,
      hasDescriptionColumn,
      offers
    );

    if (error || !record) {
      stats.failed++;
      continue;
    }

    stats.parsed++;

    if (unmappedCategory) {
      stats.unmapped++;
      unmappedEntries.push({ sourceCategory: unmappedCategory, name: record.provider_name });
    } else {
      stats.mapped++;
    }

    // Track unmatched Speisen values
    if (unmatchedSpeisen) {
      for (const speise of unmatchedSpeisen) {
        unmappedOfferEntries.push({ speise, providerName: record.provider_name });
      }
    }

    // Classify: records with import_source_id use import-source key for update detection;
    // records without it use name+city dedup for skip detection.
    if (record.import_source_id && record.import_source) {
      const importKey = `${record.import_source}:${record.import_source_id}`;
      if (seenImportKeys.has(importKey)) {
        // Already counted in this run — intra-run dedup for import-sourced records
        stats.skipped++;
        continue;
      }
      seenImportKeys.add(importKey);
      if (importSourceKeys.has(importKey)) {
        stats.wouldUpdate++;
      } else {
        insertCount++;
      }
    } else {
      const key = makeProviderKey(record.provider_name, record.address_city);
      if (seenInRun.has(key)) {
        stats.skipped++;
        continue;
      }
      seenInRun.add(key);
      insertCount++;
    }

    if (samples.length < MAX_SAMPLES) {
      samples.push({
        provider_name: record.provider_name,
        address_city: record.address_city,
        category_id: record.category_id,
        address_street: record.address_street,
        social_website: record.social_website,
        contact_email: record.contact_email,
        offers_matched: record.offers_ids.length,
      });
    }

    await sleep(FETCH_DELAY_MS);
  }
  const tPagesEnd = performance.now();

  const wouldInsert = insertCount;
  const wouldUpdate = stats.wouldUpdate;

  // Group unmapped entries by category
  const groupMap = unmappedEntries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.sourceCategory] = acc[e.sourceCategory] ?? [];
    acc[e.sourceCategory].push(e.name);
    return acc;
  }, {});

  const unmappedGroups: UnmappedGroup[] = Object.entries(groupMap).map(
    ([sourceCategory, names]) => ({
      sourceCategory,
      count: names.length,
      example: names[0],
    })
  );

  // Group unmapped offer entries by speise
  const offerGroupMap = unmappedOfferEntries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.speise] = acc[e.speise] ?? [];
    acc[e.speise].push(e.providerName);
    return acc;
  }, {});

  const unmappedOffers: UnmappedOfferGroup[] = Object.entries(offerGroupMap).map(
    ([speise, names]) => ({
      speise,
      count: names.length,
      example: names[0],
    })
  );

  const tEnd = performance.now();

  return {
    stats: { ...stats, wouldInsert, wouldUpdate },
    unmappedGroups,
    unmappedOffers,
    samples,
    timing: {
      totalMs: Math.round(tEnd - t0),
      categoriesMs: Math.round(tCatEnd - tCatStart),
      offersMs: Math.round(tOffersEnd - tOffersStart),
      descCheckMs: Math.round(tDescCheckEnd - tDescCheckStart),
      existingKeysMs: Math.round(tKeysEnd - tKeysStart),
      sitemapMs: Math.round(tSitemapEnd - tSitemapStart),
      pageProcessingMs: Math.round(tPagesEnd - tPagesStart),
    },
  };
}
