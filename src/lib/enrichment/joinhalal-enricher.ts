/**
 * JoinHalal Enrichment Core — Plan 065, Milestone 2.
 *
 * Side-effect-free enrichment logic: conflict detection, candidate building,
 * dedup checking. Used by both the CLI script and Edge Function.
 *
 * ESM-compatible: no Node-specific APIs (Arch Finding A-1, Option A).
 * Uses only standard Web APIs (fetch, JSON, etc.).
 */

import { isAdminField, SOURCE_ENRICHABLE_FIELDS } from './enrichment-fields';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Snapshot of the provider's current enrichable field values.
 * Used for comparison against parsed source data.
 */
export interface ProviderSnapshot {
  provider_id: string;
  offers_ids: string[] | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
}

/**
 * Parsed data from an external source, ready for comparison.
 * Only source-enrichable fields should be present.
 */
export type ParsedEnrichmentData = Partial<
  Pick<
    ProviderSnapshot,
    | 'offers_ids'
    | 'contact_phone'
    | 'social_website'
    | 'social_instagram'
    | 'address_street'
    | 'address_zip'
    | 'address_city'
    | 'address_country'
  >
>;

/**
 * An enrichment candidate ready to be staged in the DB.
 */
export interface EnrichmentCandidate {
  provider_id: string;
  source: string;
  source_url: string;
  field_name: string;
  proposed_value: unknown;
  current_value: unknown;
  status?: 'pending' | 'approved' | 'rejected' | 'applied';
}

export type ConflictType = 'no-change' | 'additive' | 'conflict';

// ─── Conflict Detection ───────────────────────────────────────────────────────

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (value === '') return true;
  return false;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, i) => val === sortedB[i]);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Detects whether a proposed value conflicts with the current value.
 *
 * Returns:
 * - 'no-change': values are identical (skip)
 * - 'additive': current is empty, proposed has value (safe to auto-apply)
 * - 'conflict': both have different non-empty values (requires admin review)
 */
export function detectConflict(
  currentValue: unknown,
  proposedValue: unknown
): ConflictType {
  const currentEmpty = isEmptyValue(currentValue);
  const proposedEmpty = isEmptyValue(proposedValue);

  if (currentEmpty && proposedEmpty) return 'no-change';
  if (valuesEqual(currentValue, proposedValue)) return 'no-change';
  if (currentEmpty && !proposedEmpty) return 'additive';
  return 'conflict';
}

// ─── Candidate Building ───────────────────────────────────────────────────────

/**
 * Builds enrichment candidates by comparing a provider's current data
 * against parsed source data. Only source-enrichable fields (not admin-controlled)
 * are considered. Returns candidates only for fields that have changed.
 */
export function buildEnrichmentCandidates(
  provider: ProviderSnapshot,
  parsed: ParsedEnrichmentData,
  source: string,
  sourceUrl: string
): EnrichmentCandidate[] {
  const candidates: EnrichmentCandidate[] = [];

  for (const fieldName of SOURCE_ENRICHABLE_FIELDS) {
    // Only process fields that are present in the parsed data
    if (!(fieldName in parsed)) continue;

    // Safety: skip if field is somehow admin-controlled
    if (isAdminField(fieldName)) continue;

    const currentValue = (provider as unknown as Record<string, unknown>)[fieldName] ?? null;
    const proposedValue = (parsed as unknown as Record<string, unknown>)[fieldName] ?? null;

    const conflict = detectConflict(currentValue, proposedValue);
    if (conflict === 'no-change') continue;

    candidates.push({
      provider_id: provider.provider_id,
      source,
      source_url: sourceUrl,
      field_name: fieldName,
      proposed_value: proposedValue,
      current_value: currentValue,
    });
  }

  return candidates;
}

// ─── Dedup Logic ──────────────────────────────────────────────────────────────

/**
 * Determines whether an incoming candidate should be suppressed because
 * an existing pending candidate for the same provider+field+source exists.
 *
 * Only pending candidates block new submissions. Applied/rejected candidates
 * do not prevent new proposals.
 */
export function shouldDedup(
  existing: EnrichmentCandidate & { status: string },
  incoming: EnrichmentCandidate
): boolean {
  if (existing.status !== 'pending') return false;
  return (
    existing.provider_id === incoming.provider_id &&
    existing.field_name === incoming.field_name &&
    existing.source === incoming.source
  );
}
