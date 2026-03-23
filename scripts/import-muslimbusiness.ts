/**
 * scripts/import-muslimbusiness.ts
 *
 * MuslimBusiness Provider Data Ingestion Pipeline (Plan 052)
 *
 * Fetches public business listings from muslimbusiness.de/datenbank, normalizes
 * them to the UFlow provider schema, resolves categories, and bulk-upserts
 * into Supabase.
 *
 * ─── IMPORTANT OPERATIONAL NOTES ───────────────────────────────────────────
 * • Always run with --dry-run first to inspect the import plan before writing.
 * • The script uses SUPABASE_SERVICE_ROLE_KEY (admin/service-role access).
 *   This bypasses RLS. Handle credentials with care.
 * • Imported rows default to review_status = 'pending' and are not publicly
 *   visible until approved via the admin moderation workflow.
 * • The outreach trigger (migration 059) is bypassed: user_created_id is set
 *   to the import-bot user UUID, which the trigger treats as non-anonymous.
 * • Source: muslimbusiness.de/datenbank — all cards on one page, single fetch.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   npx tsx scripts/import-muslimbusiness.ts --dry-run
 *   npx tsx scripts/import-muslimbusiness.ts --dry-run --limit 10
 *   npx tsx scripts/import-muslimbusiness.ts --write --limit 50
 *   npx tsx scripts/import-muslimbusiness.ts --write
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required — service-role for admin writes)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  extractProviderCardsFromHtml,
  parseStandorte,
  parseBranchen,
  normalizeSocialMedia,
  normalizePhone,
  isPlaceholder,
  extractPrimaryCity,
} from '../src/utils/muslimbusiness-parser';
import {
  buildCardsFromClientDataset,
  type MuslimBusinessSourceBusiness,
  type MuslimBusinessSourceStandort,
  type MuslimBusinessSourceBranche,
  type MuslimBusinessSourceBusinessStandortRelation,
  type MuslimBusinessSourceBusinessBrancheRelation,
} from '../src/utils/muslimbusiness-client-dataset';

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
 * Source-specific import-bot UUID for muslimbusiness.de imports.
 * Uses plan number 052 as suffix for human traceability.
 * Separate from JoinHalal bot (047) for per-source provenance queries.
 *
 * Per critique finding M-1: source-specific bot UUID for independent provenance.
 */
const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000052000001';
const IMPORT_BOT_EMAIL = 'import-bot-muslimbusiness@system.internal';

/** The single source URL — all cards are rendered on one page */
const SOURCE_URL = 'https://muslimbusiness.de/datenbank';

/** Supabase upsert batch size */
const BATCH_SIZE = 50;

/** HTTP User-Agent — identifies the bot as a legitimate import tool */
const USER_AGENT = 'UFlow-Import/1.0 (+https://ummahflow.com/import)';

// muslimbusiness.de currently renders the directory client-side. The data backing the UI
// is loaded from the site's own Supabase project using an embedded anon key.
// We fall back to this acquisition path when the server-delivered HTML contains 0 cards.
const SOURCE_CLIENT_DATA_PAGE_CHUNK_REGEX = /\/_next\/static\/chunks\/app\/datenbank\/page-[^"'\s]+\.js/g;
const SOURCE_SUPABASE_PROJECT_REGEX = /https:\/\/([a-z0-9]+)\.supabase\.co\b/;
const SOURCE_SUPABASE_ANON_JWT_REGEX = /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/;

interface SourceSupabaseConfig {
  supabaseUrl: string;
  anonKey: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  category_id: string;
  name_de: string;
}

interface ProviderUpsert {
  provider_name: string;
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
}

interface ImportStats {
  total: number;
  parsed: number;
  mapped: number;
  unmapped: number;
  skipped: number;
  failed: number;
  inserted?: number;
}

interface UnmappedEntry {
  sourceBranchen: string[];
  name: string;
}

// ─── Category mapping ─────────────────────────────────────────────────────────

/**
 * Maps muslimbusiness.de Branchen values (lowercased) to UFlow category name_de.
 *
 * Only categories with a clear UFlow counterpart are mapped.
 * Unknown Branchen result in category_id = null and are reported as unmapped.
 *
 * UFlow categories (from sync-categories-dev-to-prod.sql):
 *   - Kleidung & Mode
 *   - Gesundheit & Sport
 *   - Dienstleistungen
 *   - Handwerk & Reparatur
 *   - Essen & Trinken
 *   - Bildung & Lernen
 *   - Sonstiges
 */
const BRANCHEN_CATEGORY_MAP: Record<string, string> = {
  // ─── Essen & Trinken ───────────────────────────────────────────
  'gastronomie': 'Essen & Trinken',
  'lebensmittel': 'Essen & Trinken',
  'lieferservice': 'Essen & Trinken',
  'getränkefachhandel': 'Essen & Trinken',
  'nahrungsergänzungsmittel': 'Essen & Trinken',

  // ─── Bildung & Lernen ──────────────────────────────────────────
  'bildung': 'Bildung & Lernen',
  'nachhilfeschule': 'Bildung & Lernen',
  'pädagogik': 'Bildung & Lernen',
  'schulbegleitung': 'Bildung & Lernen',
  'sprachdienstleistungen': 'Bildung & Lernen',
  'fahrschule': 'Bildung & Lernen',

  // ─── Gesundheit & Sport ────────────────────────────────────────
  'gesundheits- und sozialwesen': 'Gesundheit & Sport',
  'sport': 'Gesundheit & Sport',
  'fitness': 'Gesundheit & Sport',
  'ems': 'Gesundheit & Sport',
  'personaltraining': 'Gesundheit & Sport',
  'physiotherapie': 'Gesundheit & Sport',
  'psychologie': 'Gesundheit & Sport',
  'sterbebegleitung': 'Gesundheit & Sport',
  'wellness': 'Gesundheit & Sport',
  'stillberatung': 'Gesundheit & Sport',
  'familienbetreuung': 'Gesundheit & Sport',

  // ─── Handwerk & Reparatur ──────────────────────────────────────
  'bauwesen': 'Handwerk & Reparatur',
  'elektrotechnik': 'Handwerk & Reparatur',
  'handwerk': 'Handwerk & Reparatur',
  'sanierung': 'Handwerk & Reparatur',
  'renovierung': 'Handwerk & Reparatur',
  'reparatur- und technikservice': 'Handwerk & Reparatur',
  'ingenieurdienstleistungen': 'Handwerk & Reparatur',
  'bauingenieurwesen': 'Handwerk & Reparatur',
  'bauplanung': 'Handwerk & Reparatur',
  'bauträger': 'Handwerk & Reparatur',
  'bauphysik': 'Handwerk & Reparatur',
  'haustechnik': 'Handwerk & Reparatur',
  'gebäudetechnik': 'Handwerk & Reparatur',
  'photovoltaik': 'Handwerk & Reparatur',
  'gartenbau': 'Handwerk & Reparatur',
  'grünanlagenpflege': 'Handwerk & Reparatur',
  'lackierer': 'Handwerk & Reparatur',
  'statik': 'Handwerk & Reparatur',

  // ─── Kleidung & Mode ──────────────────────────────────────────
  'textil': 'Kleidung & Mode',
  'mode': 'Kleidung & Mode',
  'bekleidung': 'Kleidung & Mode',
  'massanfertigung': 'Kleidung & Mode',
  'schmuck': 'Kleidung & Mode',

  // ─── Dienstleistungen ─────────────────────────────────────────
  'it': 'Dienstleistungen',
  'marketing': 'Dienstleistungen',
  'beratung': 'Dienstleistungen',
  'coaching': 'Dienstleistungen',
  'unternehmensberatung': 'Dienstleistungen',
  'webdesign': 'Dienstleistungen',
  'reinigung': 'Dienstleistungen',
  'gebäudereinigung': 'Dienstleistungen',
  'industriereinigung': 'Dienstleistungen',
  'sicherheitsdienst': 'Dienstleistungen',
  'logistik': 'Dienstleistungen',
  'umzug': 'Dienstleistungen',
  'buchhaltung': 'Dienstleistungen',
  'steuerberatung': 'Dienstleistungen',
  'rechtswesen': 'Dienstleistungen',
  'rechtsdienstleistungen': 'Dienstleistungen',
  'personalvermittlung': 'Dienstleistungen',
  'personalberatung': 'Dienstleistungen',
  'personalmarketing': 'Dienstleistungen',
  'recruiting': 'Dienstleistungen',
  'dienstleistung': 'Dienstleistungen',
  'dienstleistungen': 'Dienstleistungen',
  'eventmanagement': 'Dienstleistungen',
  'fotografie': 'Dienstleistungen',
  'videografie': 'Dienstleistungen',
  'grafikdesign': 'Dienstleistungen',
  'design': 'Dienstleistungen',
  'mediendesign': 'Dienstleistungen',
  'werbetechnik': 'Dienstleistungen',
  'werbeagentur': 'Dienstleistungen',
  'digitalagentur': 'Dienstleistungen',
  'social media': 'Dienstleistungen',
  'content-creator': 'Dienstleistungen',
  'content management': 'Dienstleistungen',
  'softwareentwicklung': 'Dienstleistungen',
  'software': 'Dienstleistungen',
  'automatisierung': 'Dienstleistungen',
  'ki': 'Dienstleistungen',
  'künstliche intelligenz': 'Dienstleistungen',
  'digitalisierung': 'Dienstleistungen',
  'technologieunternehmen': 'Dienstleistungen',
  'datenschutz': 'Dienstleistungen',
  'telekommunikation': 'Dienstleistungen',
  'mobilfunk': 'Dienstleistungen',
  'suchmaschienenoptimierung': 'Dienstleistungen',
  'sales': 'Dienstleistungen',
  'vertrieb': 'Dienstleistungen',
  'immobilien': 'Dienstleistungen',
  'energie': 'Dienstleistungen',
  'energielösungen': 'Dienstleistungen',
  'verwaltung': 'Dienstleistungen',
  'kundenservice': 'Dienstleistungen',
  'büroservice': 'Dienstleistungen',
  'übersetzung': 'Dienstleistungen',
  'dokumentenorganisation': 'Dienstleistungen',
  'kommunikation': 'Dienstleistungen',
  'konfliktlösung': 'Dienstleistungen',
  'architektur': 'Dienstleistungen',
  'facility services': 'Dienstleistungen',
  'redaktion': 'Dienstleistungen',
  'filmproduktion': 'Dienstleistungen',
  'medien': 'Dienstleistungen',
  'tourismus': 'Dienstleistungen',
  'reisen': 'Dienstleistungen',
  'kfz': 'Dienstleistungen',
  'autohandel': 'Dienstleistungen',
  'parfümerie': 'Dienstleistungen',
  'kosmetik': 'Dienstleistungen',
  'ticketing': 'Dienstleistungen',
  'gemeinnützige organisation': 'Dienstleistungen',
  'erste hilfe schulung': 'Dienstleistungen',
  'gutachten': 'Dienstleistungen',
  'versicherung': 'Dienstleistungen',
  'produktivität': 'Dienstleistungen',
  'business services': 'Dienstleistungen',
  'vermittlung': 'Dienstleistungen',
  'wohnungs- und gebäudeverwaltung': 'Dienstleistungen',

  // ─── Sonstiges (catch-all for less common Branchen) ────────────
  'e-commerce': 'Sonstiges',
  'einzelhandel': 'Sonstiges',
  'großhandel': 'Sonstiges',
  'buchhandel': 'Sonstiges',
  'spielwaren': 'Sonstiges',
  'lern- und familienprodukte': 'Sonstiges',
  'kunst': 'Sonstiges',
  'graffiti': 'Sonstiges',
};

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── Import bot user setup ────────────────────────────────────────────────────

async function ensureImportBotUser(): Promise<boolean> {
  try {
    const { data: existing } = await supabase.auth.admin.getUserById(IMPORT_BOT_UUID);
    if (existing?.user) {
      console.log(`  ✓ Import-bot user already exists (${IMPORT_BOT_UUID})`);
      return true;
    }
  } catch {
    // Not found — proceed to create
  }

  const { error } = await supabase.auth.admin.createUser({
    id: IMPORT_BOT_UUID,
    email: IMPORT_BOT_EMAIL,
    email_confirm: true,
    user_metadata: {
      display_name: 'MuslimBusiness Import Bot',
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

/**
 * Resolves a muslimbusiness.de Branchen list to a UFlow category_id.
 *
 * Strategy: take the FIRST Branche that maps to a UFlow category.
 * This ensures the most relevant category (listed first on the source) wins.
 *
 * Returns null for providers where no Branchen map to known categories.
 */
function resolveCategoryId(
  branchen: string[],
  categories: Category[]
): { categoryId: string | null; matched: string | null } {
  for (const branche of branchen) {
    const targetName = BRANCHEN_CATEGORY_MAP[branche.toLowerCase().trim()];
    if (!targetName) continue;

    const match = categories.find(
      (c) => c.name_de.toLowerCase() === targetName.toLowerCase()
    );
    if (match) {
      return { categoryId: match.category_id, matched: targetName };
    }
  }
  return { categoryId: null, matched: null };
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'de,en;q=0.5',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
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

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...headers,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${text ? ` — ${text.slice(0, 250)}` : ''}`);
  }

  return response.json() as Promise<T>;
}

async function discoverSourceSupabaseConfigFromHtml(html: string): Promise<SourceSupabaseConfig | null> {
  const chunkMatches = html.match(SOURCE_CLIENT_DATA_PAGE_CHUNK_REGEX) ?? [];
  if (chunkMatches.length === 0) return null;

  // Use the first matching chunk URL for /datenbank
  const chunkPath = chunkMatches[0];
  const chunkUrl = new URL(chunkPath, SOURCE_URL).toString();
  const js = await fetchText(chunkUrl);
  if (!js) return null;

  const projectMatch = js.match(SOURCE_SUPABASE_PROJECT_REGEX);
  const jwtMatch = js.match(SOURCE_SUPABASE_ANON_JWT_REGEX);
  if (!projectMatch || !jwtMatch) return null;

  const projectRef = projectMatch[1];
  return {
    supabaseUrl: `https://${projectRef}.supabase.co`,
    anonKey: jwtMatch[0],
  };
}

async function fetchAllFromSupabaseRest<T>(
  config: SourceSupabaseConfig,
  table: string,
  query: string
): Promise<T[]> {
  // Supabase REST pagination uses Range headers. We'll page in chunks to avoid
  // relying on unbounded responses.
  const pageSize = 1000;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const url = `${config.supabaseUrl}/rest/v1/${table}?${query}`;
    const page = await fetchJson<T[]>(url, {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      Range: `${from}-${to}`,
    });

    results.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return results;
}

async function fetchCardsFromSourceClientDataset(html: string) {
  const config = await discoverSourceSupabaseConfigFromHtml(html);
  if (!config) {
    console.warn('  ⚠ Could not discover source Supabase config from /datenbank HTML.');
    return [];
  }

  console.log(`  ℹ Using source Supabase project: ${config.supabaseUrl}`);

  const businesses = await fetchAllFromSupabaseRest<MuslimBusinessSourceBusiness>(
    config,
    '7tv9s_business',
    'select=*&genehmigt=eq.true'
  );
  if (businesses.length === 0) return [];

  const standortRelations = await fetchAllFromSupabaseRest<MuslimBusinessSourceBusinessStandortRelation>(
    config,
    '7tv9s_business_standort_relation',
    'select=id_business,id_standort'
  );
  const brancheRelations = await fetchAllFromSupabaseRest<MuslimBusinessSourceBusinessBrancheRelation>(
    config,
    'business_branche_relation',
    'select=id_business,id_branche'
  );
  const standorte = await fetchAllFromSupabaseRest<MuslimBusinessSourceStandort>(
    config,
    '7tv9s_standort',
    'select=id,standort'
  );
  const branchen = await fetchAllFromSupabaseRest<MuslimBusinessSourceBranche>(
    config,
    '7tv9s_branche',
    'select=id,branche'
  );

  const cards = buildCardsFromClientDataset({
    businesses,
    standorte,
    branchen,
    standortRelations,
    brancheRelations,
  });

  // Shape into the same interface the rest of the importer expects.
  return cards.map((c) => ({
    name: c.name,
    standorte: c.standorte,
    branchen: c.branchen,
    email: c.email,
    telefon: c.telefon,
    socialMedia: c.socialMedia,
  }));
}

// ─── Transformation ────────────────────────────────────────────────────────────

interface TransformResult {
  record: ProviderUpsert | null;
  error?: string;
  unmappedBranchen?: string[];
}

function transformCardToProvider(
  card: ReturnType<typeof extractProviderCardsFromHtml>[0],
  categories: Category[],
  _includeDescription: boolean
): TransformResult {
  const providerName = card.name.trim();
  if (!providerName) {
    return { record: null, error: 'Empty provider name' };
  }

  // Parse structured fields
  const standorte = parseStandorte(card.standorte);
  const branchen = parseBranchen(card.branchen);
  const primaryCity = extractPrimaryCity(standorte);

  // Resolve category from Branchen
  const { categoryId } = resolveCategoryId(branchen, categories);

  // Normalize contact fields
  const email = isPlaceholder(card.email) ? null : card.email.trim() || null;
  const phone = normalizePhone(card.telefon);
  const socialHandle = normalizeSocialMedia(card.socialMedia);

  // Map social media to Instagram if it looks like a handle (not a URL)
  let socialInstagram: string | null = null;
  let socialWebsite: string | null = null;

  if (socialHandle) {
    if (socialHandle.includes('instagram.com')) {
      socialInstagram = socialHandle;
    } else if (socialHandle.includes('linkedin.com') || socialHandle.includes('://')) {
      socialWebsite = socialHandle;
    } else {
      // Assume plain handles are Instagram handles
      socialInstagram = socialHandle;
    }
  }

  // Per critique M-2: use first real city for address_city (option a/d)
  const record: ProviderUpsert = {
    provider_name: providerName,
    category_id: categoryId,
    address_street: null,
    address_zip: null,
    address_city: primaryCity,
    address_country: primaryCity ? 'DE' : null,
    contact_email: email,
    contact_phone: phone,
    social_website: socialWebsite,
    social_instagram: socialInstagram,
    review_status: 'pending',
    user_created_id: IMPORT_BOT_UUID,
    provider_owner_id: null,
    show_address: true,
    offers_ids: [],
    needs_ids: [],
    barakah_effects: [],
  };

  const unmappedBranchen = !categoryId && branchen.length > 0
    ? branchen
    : undefined;

  return { record, unmappedBranchen };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

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
      const key = makeProviderKey({
        provider_name: row.provider_name ?? '',
        address_city: row.address_city ?? '',
      });
      existing.add(key);
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return existing;
}

function makeProviderKey(record: { provider_name: string; address_city: string | null }): string {
  return `${(record.provider_name ?? '').toLowerCase().trim()}|${(record.address_city ?? '').toLowerCase().trim()}`;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function printDryRunReport(
  stats: ImportStats,
  unmapped: UnmappedEntry[],
  samples: ProviderUpsert[],
  allLocations: string[]
) {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  DRY-RUN REPORT — no data was written');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  Cards extracted       : ${stats.total}`);
  console.log(`  Successfully parsed   : ${stats.parsed}`);
  console.log(`  Category mapped       : ${stats.mapped}`);
  console.log(`  Unmapped category     : ${stats.unmapped}`);
  console.log(`  Skipped (duplicate)   : ${stats.skipped}`);
  console.log(`  Parse failures        : ${stats.failed}`);
  console.log(`  Would INSERT          : ${stats.parsed - stats.skipped}`);

  if (unmapped.length > 0) {
    console.log('\n  Unmapped Branchen (top 15):');
    const brancheCounts = new Map<string, number>();
    for (const entry of unmapped) {
      for (const b of entry.sourceBranchen) {
        brancheCounts.set(b, (brancheCounts.get(b) ?? 0) + 1);
      }
    }
    const sorted = [...brancheCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    for (const [branche, count] of sorted) {
      console.log(`    "${branche}" (${count} entries)`);
    }
  }

  // Report all location values for operator review
  if (allLocations.length > 0) {
    const locationCounts = new Map<string, number>();
    for (const loc of allLocations) {
      locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
    }
    const topLocations = [...locationCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log('\n  Top 20 Standorte:');
    for (const [loc, count] of topLocations) {
      console.log(`    "${loc}" (${count})`);
    }
  }

  if (samples.length > 0) {
    console.log('\n  Sample records (first 5):');
    samples.slice(0, 5).forEach((r, i) => {
      console.log(`\n  [${i + 1}] ${r.provider_name}`);
      console.log(`      city     : ${r.address_city ?? '—'}`);
      console.log(`      category : ${r.category_id ?? 'UNMAPPED'}`);
      console.log(`      email    : ${r.contact_email ?? '—'}`);
      console.log(`      phone    : ${r.contact_phone ?? '—'}`);
      console.log(`      insta    : ${r.social_instagram ?? '—'}`);
      console.log(`      website  : ${r.social_website ?? '—'}`);
    });
  }

  console.log('\n  To execute the import, run:');
  console.log('    npx tsx scripts/import-muslimbusiness.ts --write [--limit N]');
  console.log('════════════════════════════════════════════════════════\n');
}

function printWriteReport(stats: ImportStats) {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  WRITE REPORT');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  Cards processed       : ${stats.total}`);
  console.log(`  Successfully parsed   : ${stats.parsed}`);
  console.log(`  Inserted              : ${stats.inserted ?? 0}`);
  console.log(`  Skipped (duplicate)   : ${stats.skipped}`);
  console.log(`  Unmapped category     : ${stats.unmapped}`);
  console.log(`  Parse failures        : ${stats.failed}`);
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
  if (limitRaw !== null && (!Number.isInteger(limitRaw) || limitRaw <= 0)) {
    console.error(`❌ --limit requires a positive integer (got: ${args[limitFlag + 1]})`);
    process.exit(1);
  }
  const limit = limitRaw;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  UFlow — MuslimBusiness Provider Import (Plan 052)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Mode       : ${isDryRun ? '🔍 DRY-RUN (no writes)' : '✍️  WRITE'}`);
  console.log(`  Limit      : ${limit !== null ? limit : 'all'}`);
  console.log(`  Source     : ${SOURCE_URL}\n`);

  // ─ Load categories
  console.log('▶ Loading categories from Supabase...');
  const categories = await loadCategories();
  console.log(`  ✓ Loaded ${categories.length} categories`);
  if (categories.length === 0) {
    console.error('  ❌ No categories found — cannot resolve category IDs. Aborting.');
    process.exit(1);
  }

  // ─ Check provider_description column availability
  console.log('▶ Checking provider_description column availability...');
  const hasDescriptionColumn = await checkProviderDescriptionExists();
  console.log(
    `  ${hasDescriptionColumn ? '✓ Column available' : '⚠ Column absent — description mapping skipped'}`
  );

  // ─ Fetch the directory page (single page, all cards)
  console.log('\n▶ Fetching directory page...');
  const html = await fetchText(SOURCE_URL);
  if (!html) {
    console.error('  ❌ Could not fetch directory page. Aborting.');
    process.exit(1);
  }
  console.log(`  ✓ Page fetched (${(html.length / 1024).toFixed(0)} KB)`);

  // ─ Extract provider cards
  console.log('\n▶ Extracting provider cards...');
  let cards = extractProviderCardsFromHtml(html);
  console.log(`  ✓ Found ${cards.length} cards`);

  if (cards.length === 0) {
    console.warn('  ⚠ No provider cards found in server HTML. Trying client-dataset acquisition...');
    cards = await fetchCardsFromSourceClientDataset(html);
    console.log(`  ✓ Found ${cards.length} cards via client dataset`);

    if (cards.length === 0) {
      console.error('  ❌ No provider cards found. Source structure may have changed.');
      process.exit(1);
    }
  }

  // Apply limit
  if (limit !== null) {
    cards = cards.slice(0, limit);
    console.log(`  ℹ Limited to first ${cards.length} cards`);
  }

  // ─ Load existing providers for duplicate detection (both modes)
  console.log('\n▶ Loading existing provider keys for deduplication...');
  const existingKeys = await loadExistingProviderKeys();
  console.log(`  ✓ Loaded ${existingKeys.size} existing providers`);

  // ─ Process each card
  console.log('\n▶ Processing provider cards...');
  const stats: ImportStats = {
    total: cards.length,
    parsed: 0,
    mapped: 0,
    unmapped: 0,
    skipped: 0,
    failed: 0,
    inserted: 0,
  };

  const unmappedEntries: UnmappedEntry[] = [];
  const toInsert: ProviderUpsert[] = [];
  const sampleRecords: ProviderUpsert[] = [];
  const allLocations: string[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const progress = `[${i + 1}/${cards.length}]`;

    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`  ${progress} Processing...`);
    }

    const { record, error, unmappedBranchen } = transformCardToProvider(
      card,
      categories,
      hasDescriptionColumn
    );

    if (error || !record) {
      stats.failed++;
      console.warn(`  ⚠ ${progress} Parse error (${card.name}): ${error ?? 'unknown'}`);
      continue;
    }

    stats.parsed++;

    // Collect all locations for reporting
    const standorte = parseStandorte(card.standorte);
    allLocations.push(...standorte);

    if (unmappedBranchen) {
      stats.unmapped++;
      unmappedEntries.push({ sourceBranchen: unmappedBranchen, name: record.provider_name });
    } else {
      stats.mapped++;
    }

    // Deduplication
    const providerKey = makeProviderKey(record);
    if (existingKeys.has(providerKey)) {
      stats.skipped++;
      continue;
    }
    existingKeys.add(providerKey);

    toInsert.push(record);
    if (sampleRecords.length < 5) sampleRecords.push(record);
  }

  // ─ Write or report
  if (isDryRun) {
    printDryRunReport(stats, unmappedEntries, sampleRecords, allLocations);
    return;
  }

  // ─ Ensure import-bot user exists (required for FK constraint)
  console.log('▶ Ensuring import-bot user exists in auth.users...');
  const botOk = await ensureImportBotUser();
  if (!botOk) {
    console.error('  ❌ Cannot proceed without import-bot user. Aborting.');
    process.exit(1);
  }

  // ─ Bulk insert in batches
  if (toInsert.length === 0) {
    console.log('\n  No new records to insert (all duplicates or mapping failures).');
    printWriteReport(stats);
    return;
  }

  console.log(`\n▶ Inserting ${toInsert.length} providers in batches of ${BATCH_SIZE}...`);

  for (let offset = 0; offset < toInsert.length; offset += BATCH_SIZE) {
    const batch = toInsert.slice(offset, offset + BATCH_SIZE);

    const { error } = await supabase
      .from('providers')
      .insert(batch);

    if (error) {
      console.error(
        `  ❌ Batch insert failed (offset ${offset}): ${error.message}`
      );
      stats.failed += batch.length;
      continue;
    }

    stats.inserted = (stats.inserted ?? 0) + batch.length;
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
