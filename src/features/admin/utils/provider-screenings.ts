import type { ScreeningFlag, ScreeningStatus } from '@/types/providerScreening';

export interface ScreeningRow {
  source: string;
  status: string;
  flags: unknown;
  created_at: string;
}

export type ProviderScreeningsResult =
  | { state: 'forbidden' }
  | { state: 'error' }
  | { state: 'empty' }
  | {
      state: 'ready';
      status: ScreeningStatus;
      risks: ScreeningFlag[];
      positives: ScreeningFlag[];
      /** Overall status is clear, Google Maps matched a place and found no alcohol; the admin decides on no_alcohol. */
      suggestNoAlcohol?: boolean;
    };

const SEVERITY: Record<ScreeningStatus, number> = { clear: 0, review: 1, flagged: 2 };

// Unknown values never read as green.
function toStatus(value: string): ScreeningStatus {
  return value in SEVERITY ? (value as ScreeningStatus) : 'review';
}

function isFlag(value: unknown): value is ScreeningFlag {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return ['code', 'term', 'snippet', 'url', 'source'].every((k) => typeof f[k] === 'string');
}

export function summarizeScreenings(rows: ScreeningRow[]): ProviderScreeningsResult {
  const latest = new Map<string, ScreeningRow>();
  for (const r of rows) {
    const current = latest.get(r.source);
    if (!current || r.created_at > current.created_at) latest.set(r.source, r);
  }
  if (latest.size === 0) return { state: 'empty' };

  let status: ScreeningStatus = 'clear';
  const risks: ScreeningFlag[] = [];
  const positives: ScreeningFlag[] = [];
  for (const r of Array.from(latest.values())) {
    const s = toStatus(r.status);
    if (SEVERITY[s] > SEVERITY[status]) status = s;
    for (const f of Array.isArray(r.flags) ? r.flags : []) {
      if (!isFlag(f)) continue;
      (f.code === 'halal_positive' ? positives : risks).push(f);
    }
  }
  // Only a clear Google Maps screening backs the suggestion; any other flag or status withholds it.
  const suggestNoAlcohol =
    status === 'clear' &&
    latest.has('google_maps_apify') &&
    !risks.some((f) => f.code === 'alcohol' || f.code === 'no_maps_match');
  return { state: 'ready', status, risks, positives, suggestNoAlcohol };
}
