/**
 * Backfill missing location coordinates (#756, Plan 196).
 *
 * Fills coordinates on approved/pending food locations that lack them, and
 * creates a primary location for approved providers that have no location row
 * (they never reach the map). Logic lives in src/lib/geocoding/backfill.ts.
 *
 * Nominatim usage policy: max 1 request/second, identifying User-Agent. This
 * script sleeps 1.5s between requests. For large backfills prefer a paid geocoder.
 *
 * Usage:
 *   npx tsx scripts/backfill-location-coords.ts --dry-run   # preview only (default)
 *   npx tsx scripts/backfill-location-coords.ts --apply      # write coordinates
 *   npx tsx scripts/backfill-location-coords.ts --apply --limit 5
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { backfillCoordinates } from '../src/lib/geocoding/backfill';
import { geocodeAddress, GeocodeHttpError } from '../src/lib/geocoding/nominatim';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error(
    '  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
  );
  process.exit(1);
}

const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 3;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply'); // safe by default: never writes unless --apply
const limitIdx = args.indexOf('--limit');
const parsedLimit = limitIdx >= 0 ? Number.parseInt(args[limitIdx + 1] ?? '', 10) : NaN;
const LIMIT = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

async function geocodeWithBackoff(address: Parameters<typeof geocodeAddress>[0]) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await geocodeAddress(address);
    } catch (err) {
      if (!(err instanceof GeocodeHttpError) || err.status !== 429) throw err;
      const backoff = RATE_LIMIT_MS * (attempt + 2);
      console.warn(
        `  429 rate-limited, backing off ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
      );
      await sleep(backoff);
    }
  }
  throw new Error('geocoder rate limit: retries exhausted');
}

async function main(): Promise<void> {
  console.log(`Mode: ${APPLY ? 'APPLY (writing coordinates)' : 'DRY-RUN (no writes)'}`);
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const summary = await backfillCoordinates({
    supabase,
    geocode: geocodeWithBackoff,
    apply: APPLY,
    limit: LIMIT,
    sleep,
    rateLimitMs: RATE_LIMIT_MS,
    log: console.log,
  });

  console.log(
    `\nDone. ${APPLY ? 'updated' : 'would update'}: ${summary.updated}, skipped: ${summary.skipped}, failed: ${summary.failed}, total: ${summary.total}`,
  );
  if (!APPLY && summary.updated > 0)
    console.log('Re-run with --apply to persist these coordinates.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
