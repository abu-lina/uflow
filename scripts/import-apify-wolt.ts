/**
 * scripts/import-apify-wolt.ts
 *
 * Imports Apify Wolt Scraper JSON exports and enriches UFlow providers
 * with menu data, alcohol detection, and opening hours.
 *
 * Uses the Apify actor: https://console.apify.com/actors/y0NfA98a3bpJBTodv
 *
 * Usage:
 *   npx tsx scripts/import-apify-wolt.ts --input imports/wolt-export.json --dry-run
 *   npx tsx scripts/import-apify-wolt.ts --dir imports/wolt-batch/ --write --limit 20
 *   npx tsx scripts/import-apify-wolt.ts --input imports/wolt-tevhid.json --write
 *
 * Environment variables (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL       (required)
 *   SUPABASE_SERVICE_ROLE_KEY      (required)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { detectAlcohol } from '../src/lib/enrichment/delivery-platform/alcohol-detector';
import { matchProviderToVenues, normalizeName, stringSimilarity } from '../src/lib/enrichment/delivery-platform/provider-matcher';
import type { WoltVenue } from '../src/lib/enrichment/delivery-platform/wolt-client';
import { detectConflict } from '../src/lib/enrichment/joinhalal-enricher';
import type { OpeningHours, OpeningHoursDay } from '../src/types/openingHours';

// ─── Env setup ────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isWrite = args.includes('--write');
const isDryRun = !isWrite;
const inputFile = getArgValue('--input');
const inputDir = getArgValue('--dir');
const limitArg = getArgValue('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApifyWoltVenue {
  slug: string;
  name: string;
  city: string;
  url: string;
  delivers: boolean;
  deliveryMethods: string[];
  menuItems: Array<{
    name: string;
    description: string | null;
    priceInCents: number;
    category: string;
  }>;
  openingTimesSchedule: Array<{
    day: string;   // "Monday", "Tuesday", etc.
    open: string;  // "11:00" or "Closed"
    close: string;
  }>;
}

interface EnrichedVenue {
  slug: string;
  name: string;
  city: string;
  url: string;
  delivers: boolean;
  deliveryMethods: string[];
  alcoholSignal: string;
  matchedKeywords: string[];
  openingHours: OpeningHours | null;
  providerId: string | null;
  providerName: string | null;
  matchConfidence: number | null;
  error: string | null;
}

// ─── Day name to index mapping ────────────────────────────────────────────────

const DAY_NAME_TO_INDEX: Record<string, number> = {
  'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
  'friday': 4, 'saturday': 5, 'sunday': 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeApifyOpeningHours(
  schedule: Array<{ day: string; open: string; close: string }> | null | undefined
): OpeningHours | null {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return null;

  const hours: OpeningHours = {};

  for (const entry of schedule) {
    const dayIndex = DAY_NAME_TO_INDEX[entry.day.toLowerCase()];
    if (dayIndex === undefined) continue;

    const open = entry.open?.trim();
    const close = entry.close?.trim();

    // Skip closed days
    if (!open || open.toLowerCase() === 'closed' || !close) {
      const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      hours[keys[dayIndex] as keyof OpeningHours] = null;
      continue;
    }

    const window = { open, close };
    const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    hours[keys[dayIndex] as keyof OpeningHours] = window as OpeningHoursDay;
  }

  // If all days are null, return null
  const hasAnyOpen = Object.values(hours).some(v => v !== null && v !== undefined);
  return hasAnyOpen ? hours : null;
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function loadVenueFiles(): ApifyWoltVenue[] {
  const venues: ApifyWoltVenue[] = [];
  const files: string[] = [];

  if (inputFile) {
    files.push(inputFile);
  }
  if (inputDir) {
    const entries = fs.readdirSync(inputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(path.join(inputDir, entry.name));
      }
    }
  }

  for (const file of files) {
    console.log(`  📄 Loading ${file}...`);
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const arr = Array.isArray(raw) ? raw : [raw];
    for (const item of arr) {
      if (item.slug) {
        venues.push(item as ApifyWoltVenue);
      }
    }
  }

  return venues;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!inputFile && !inputDir) {
    console.error('❌ Specify --input <file> or --dir <directory>');
    process.exit(1);
  }

  console.log(`\n🍔 Apify Wolt Import Pipeline`);
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN (preview only)' : 'WRITE (staging candidates)'}`);

  // 1. Load venues from files
  const apifyVenues = loadVenueFiles();
  console.log(`  📊 Loaded ${apifyVenues.length} Wolt venues from Apify export\n`);

  if (apifyVenues.length === 0) {
    console.log('  ℹ️  No venues found. Nothing to import.');
    return;
  }

  // 2. Fetch eligible providers for matching
  const { data: dbProviders, error: provError } = await supabase
    .from('providers')
    .select('provider_id, provider_name, address_city, listing_type, opening_hours, enrichment_eligible')
    .eq('listing_type', 'food')
    .eq('enrichment_eligible', true)
    .not('address_city', 'is', null);

  if (provError) {
    console.error('❌ Failed to fetch providers:', provError.message);
    process.exit(1);
  }

  console.log(`  📋 ${dbProviders?.length ?? 0} eligible food providers in database\n`);

  // 3. Fetch no_alcohol values from food_providers
  const providerIds = (dbProviders ?? []).map(p => p.provider_id);
  let noAlcoholMap: Record<string, boolean | null> = {};
  if (providerIds.length > 0) {
    const { data: fpData } = await supabase
      .from('food_providers')
      .select('provider_id, no_alcohol')
      .in('provider_id', providerIds);
    if (fpData) {
      for (const fp of fpData) {
        noAlcoholMap[fp.provider_id] = fp.no_alcohol ?? null;
      }
    }
  }

  // 4. Build WoltVenue-like objects from Apify data for matching
  const woltVenuesByCity: Record<string, WoltVenue[]> = {};

  for (const av of apifyVenues) {
    const venueName = av.name || slugToName(av.slug);
    const city = av.city?.trim();
    if (!city) continue;

    if (!woltVenuesByCity[city]) {
      woltVenuesByCity[city] = [];
    }
    woltVenuesByCity[city].push({
      name: venueName,
      slug: av.slug,
      city: city,
    } as WoltVenue);
  }

  // 5. Process each provider
  const results: EnrichedVenue[] = [];
  let processed = 0;
  const toProcess = limit ? (dbProviders ?? []).slice(0, limit) : (dbProviders ?? []);

  for (const provider of toProcess) {
    processed++;
    const city = provider.address_city?.trim();
    const result: EnrichedVenue = {
      slug: '',
      name: '',
      city: city ?? '',
      url: '',
      delivers: false,
      deliveryMethods: [],
      alcoholSignal: '',
      matchedKeywords: [],
      openingHours: null,
      providerId: provider.provider_id,
      providerName: provider.provider_name,
      matchConfidence: null,
      error: null,
    };

    if (!city || !woltVenuesByCity[city]) {
      result.error = 'NoApify venues in city';
      results.push(result);
      continue;
    }

    // Match provider to Apify venues in this city
    const match = matchProviderToVenues(
      provider.provider_name,
      city,
      woltVenuesByCity[city],
    );

    if (!match) {
      result.error = 'No name match';
      results.push(result);
      continue;
    }

    // Found a match — find the full Apify venue data
    const matchedSlug = match.woltVenue.slug;
    const apifyVenue = apifyVenues.find(
      av => av.slug === matchedSlug && av.city?.trim() === city
    );

    if (!apifyVenue) {
      result.error = 'Apify venue not found for matched slug';
      results.push(result);
      continue;
    }

    // Extract data
    const menuNames = (apifyVenue.menuItems ?? []).map(m => m.name);
    const alcoholResult = detectAlcohol(menuNames);
    const openingHours = normalizeApifyOpeningHours(apifyVenue.openingTimesSchedule);

    result.slug = apifyVenue.slug;
    result.name = apifyVenue.name || slugToName(apifyVenue.slug);
    result.city = apifyVenue.city;
    result.url = apifyVenue.url;
    result.delivers = apifyVenue.delivers;
    result.deliveryMethods = apifyVenue.deliveryMethods;
    result.alcoholSignal = alcoholResult.signal;
    result.matchedKeywords = alcoholResult.matchedKeywords;
    result.openingHours = openingHours;
    result.matchConfidence = match.confidence;

    // Stage enrichment candidates
    let proposedNoAlcohol: boolean | null = null;
    if (alcoholResult.signal === 'definite_alcohol') {
      proposedNoAlcohol = false;
    } else if (alcoholResult.signal === 'definite_no_alcohol') {
      proposedNoAlcohol = true;
    }

    const currentOpeningHours = provider.opening_hours ?? null;
    const currentNoAlcohol = noAlcoholMap[provider.provider_id] ?? null;

    // Build candidates
    const candidates: Array<{
      provider_id: string;
      source: string;
      source_url: string;
      field_name: string;
      proposed_value: unknown;
      current_value: unknown;
      status: string;
    }> = [];

    // opening_hours candidate
    const hoursConflict = detectConflict(currentOpeningHours, openingHours);
    if (hoursConflict !== 'no-change') {
      candidates.push({
        provider_id: provider.provider_id,
        source: 'wolt_apify',
        source_url: apifyVenue.url,
        field_name: 'opening_hours',
        proposed_value: openingHours,
        current_value: currentOpeningHours,
        status: 'pending',
      });
    }

    // no_alcohol candidate
    if (proposedNoAlcohol !== null) {
      const alcoholConflict = detectConflict(currentNoAlcohol, proposedNoAlcohol);
      if (alcoholConflict !== 'no-change') {
        candidates.push({
          provider_id: provider.provider_id,
          source: 'wolt_apify',
          source_url: apifyVenue.url,
          field_name: 'no_alcohol',
          proposed_value: proposedNoAlcohol,
          current_value: currentNoAlcohol,
          status: 'pending',
        });
      }
    }

    // Write candidates
    if (isWrite && candidates.length > 0) {
      for (const c of candidates) {
        const { error } = await supabase
          .from('enrichment_candidates')
          .upsert(
            {
              provider_id: c.provider_id,
              source: c.source,
              source_url: c.source_url,
              field_name: c.field_name,
              proposed_value: c.proposed_value,
              current_value: c.current_value,
              status: 'pending',
              enriched_at: new Date().toISOString(),
            },
            {
              onConflict: 'provider_id,field_name,source',
              ignoreDuplicates: true,
            }
          );

        if (error) {
          console.error(`     ❌ Failed to write candidate: ${error.message}`);
        }
      }
    }

    // Write delivery link
    if (isWrite) {
      await supabase
        .from('provider_delivery_links')
        .upsert({
          provider_id: provider.provider_id,
          platform: 'wolt',
          platform_url: apifyVenue.url,
          platform_slug: apifyVenue.slug,
          is_active: apifyVenue.delivers,
          last_verified_at: new Date().toISOString(),
        }, {
          onConflict: 'provider_id,platform',
          ignoreDuplicates: false,
        });
    }

    results.push(result);
  }

  // 6. Report
  console.log(`\n${'─'.repeat(60)}`);
  const matched = results.filter(r => !r.error).length;
  const withAlcoholSignal = results.filter(r => r.alcoholSignal && r.alcoholSignal !== 'no_signal').length;
  const withHours = results.filter(r => r.openingHours !== null).length;

  console.log(`  📊 Import Summary`);
  console.log(`     Venues loaded: ${apifyVenues.length}`);
  console.log(`     Providers processed: ${processed}`);
  console.log(`     Matched: ${matched}`);
  console.log(`     Not matched: ${processed - matched}`);
  console.log(`     With alcohol signal: ${withAlcoholSignal}`);
  console.log(`     With opening hours: ${withHours}`);
  console.log(`${'─'.repeat(60)}`);

  // Show details
  console.log(`\n  📋 Results:`);
  for (const r of results) {
    const status = r.error
      ? `⚠️  ${r.error}`
      : `✅ ${r.name} (slug: ${r.slug}) [alcohol: ${r.alcoholSignal}, hours: ${r.openingHours ? Object.keys(r.openingHours).filter(k => (r.openingHours as any)[k] !== null).length + ' days' : 'none'}, confidence: ${r.matchConfidence?.toFixed(2) ?? 'N/A'}]`;
    console.log(`     ${r.providerName} → ${status}`);
  }

  if (isDryRun) {
    console.log(`\n  ℹ️  Dry-run complete. Use --write to stage candidates.`);
  } else {
    console.log(`\n  ✅ Candidates staged in enrichment_candidates.`);
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
