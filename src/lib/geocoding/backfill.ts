import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPrimaryLocationRow, hasEnoughAddress, type AddressFields } from './nominatim';

/**
 * Backfill for #756, driven by scripts/backfill-location-coords.ts.
 *
 * Pass 1 fills coordinates on existing location rows that lack them (never
 * overwrites existing coordinates). Pass 2 inserts a primary location for
 * approved providers with no location row. Both passes page by keyset
 * (PostgREST caps responses at 1000 rows), and pass 2 re-checks for a row
 * right before each insert.
 */

export interface Coords {
  lat: number;
  lon: number;
}

export interface BackfillOptions {
  supabase: SupabaseClient;
  geocode: (address: AddressFields) => Promise<Coords | null>;
  apply: boolean;
  limit?: number;
  pageSize?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  rateLimitMs?: number;
}

export interface BackfillSummary {
  updated: number;
  skipped: number;
  failed: number;
  total: number;
}

interface LocationRow extends AddressFields {
  location_id: string;
}
interface ProviderRow extends AddressFields {
  provider_id: string;
}

const ADDRESS = 'address_street, address_zip, address_city, address_country';
const MISSING_COORDS = 'location_latitude.is.null,location_longitude.is.null';

const labelOf = (a: AddressFields) =>
  [a.address_street, a.address_zip, a.address_city].filter(Boolean).join(', ') || '(no address)';

export async function backfillCoordinates(opts: BackfillOptions): Promise<BackfillSummary> {
  const { supabase, geocode, apply, limit } = opts;
  const pageSize = opts.pageSize ?? 200;
  const sleep = opts.sleep ?? (() => Promise.resolve());
  const log = opts.log ?? (() => undefined);
  const rateLimitMs = opts.rateLimitMs ?? 0;
  const summary: BackfillSummary = { updated: 0, skipped: 0, failed: 0, total: 0 };
  const remaining = () => (limit === undefined ? Infinity : limit - summary.total);

  // Returns coordinates, or null after counting the skip or failure.
  const resolve = async (id: string, address: AddressFields): Promise<Coords | null> => {
    summary.total += 1;
    if (!hasEnoughAddress(address)) {
      log(`SKIP  ${id} — insufficient address: ${labelOf(address)}`);
      summary.skipped += 1;
      return null;
    }
    try {
      const coords = await geocode(address);
      await sleep(rateLimitMs);
      if (!coords) {
        log(`MISS  ${id} — no geocode match: ${labelOf(address)}`);
        summary.failed += 1;
      }
      return coords;
    } catch (err) {
      log(`FAIL  ${id} — ${(err as Error).message}`);
      summary.failed += 1;
      return null;
    }
  };

  // Pass 1: location rows without coordinates.
  let cursor = '';
  while (remaining() > 0) {
    const { data, error } = await supabase
      .from('locations')
      .select(`location_id, ${ADDRESS}, providers!inner(listing_type, review_status)`)
      .eq('providers.listing_type', 'food')
      .in('providers.review_status', ['approved', 'pending'])
      .or(MISSING_COORDS)
      .gt('location_id', cursor)
      .order('location_id', { ascending: true })
      .limit(Math.min(pageSize, remaining()));
    if (error) throw new Error(`Failed to load locations: ${error.message}`);
    const rows = (data ?? []) as unknown as LocationRow[];
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].location_id;

    for (const row of rows) {
      const coords = await resolve(row.location_id, row);
      if (!coords) continue;
      if (!apply) {
        log(`WOULD ${row.location_id} — ${labelOf(row)} -> ${coords.lat}, ${coords.lon}`);
        summary.updated += 1;
        continue;
      }
      const { error: updateError } = await supabase
        .from('locations')
        .update({ location_latitude: coords.lat, location_longitude: coords.lon })
        .eq('location_id', row.location_id)
        .or(MISSING_COORDS);
      if (updateError) {
        log(`FAIL  ${row.location_id} — update error: ${updateError.message}`);
        summary.failed += 1;
        continue;
      }
      log(`OK    ${row.location_id} — ${labelOf(row)} -> ${coords.lat}, ${coords.lon}`);
      summary.updated += 1;
    }
  }

  // Pass 2: approved providers without any location row.
  let providerCursor = '';
  while (remaining() > 0) {
    const { data, error } = await supabase
      .from('providers')
      .select(`provider_id, ${ADDRESS}`)
      .eq('review_status', 'approved')
      .gt('provider_id', providerCursor)
      .order('provider_id', { ascending: true })
      .limit(pageSize);
    if (error) throw new Error(`Failed to load providers: ${error.message}`);
    const providers = (data ?? []) as unknown as ProviderRow[];
    if (providers.length === 0) break;
    providerCursor = providers[providers.length - 1].provider_id;

    const { data: existing, error: existingError } = await supabase
      .from('locations')
      .select('provider_id')
      .in(
        'provider_id',
        providers.map((p) => p.provider_id),
      );
    if (existingError) throw new Error(`Failed to load locations: ${existingError.message}`);
    const withRow = new Set((existing ?? []).map((l: { provider_id: string }) => l.provider_id));

    for (const p of providers) {
      if (withRow.has(p.provider_id) || remaining() <= 0) continue;
      const coords = await resolve(`provider ${p.provider_id}`, p);
      if (!coords) continue;
      if (!apply) {
        log(`WOULD provider ${p.provider_id} — ${labelOf(p)} -> ${coords.lat}, ${coords.lon}`);
        summary.updated += 1;
        continue;
      }
      // A row may have appeared during the slow geocode call.
      const { data: now } = await supabase
        .from('locations')
        .select('location_id')
        .eq('provider_id', p.provider_id)
        .limit(1);
      if (now && now.length > 0) {
        log(`SKIP  provider ${p.provider_id} — location row appeared meanwhile`);
        summary.skipped += 1;
        continue;
      }
      const { error: insertError } = await supabase
        .from('locations')
        .insert(buildPrimaryLocationRow(p.provider_id, p, coords));
      if (insertError) {
        log(`FAIL  provider ${p.provider_id} — insert error: ${insertError.message}`);
        summary.failed += 1;
        continue;
      }
      log(`OK    provider ${p.provider_id} — ${labelOf(p)} -> ${coords.lat}, ${coords.lon}`);
      summary.updated += 1;
    }
  }

  return summary;
}
