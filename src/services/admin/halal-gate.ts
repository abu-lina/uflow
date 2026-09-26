/**
 * Halal attestation check service — Plan 228.
 *
 * Quality gate that prevents provider approval when halal attestation
 * questions are not all affirmed. The attestations (no alcohol, no
 * forbidden meat, no gambling) are answered by the provider owner or
 * recommender during creation. The reviewer verifies these claims
 * in the admin Halal Check page before approving.
 *
 * Uses service-role Supabase client for reads (bypasses RLS).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Attestation fields checked for the halal gate. Single source of truth. */
export const HALAL_ATTESTATION_FIELDS = ['no_alcohol', 'no_pork', 'no_gambling'] as const;

/** Human-readable labels for attestation fields (used in admin-facing messages). */
export const HALAL_FIELD_LABELS: Record<string, string> = {
  no_alcohol: 'Kein Alkohol',
  no_pork: 'Kein verbotenes Fleisch',
  no_gambling: 'Kein Glücksspiel',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HalalAttestationCheckResult {
  allAttested: boolean;
  /** Which specific attestations are missing (column names): denied + unanswered */
  missing: string[];
  /** Human-readable labels for missing attestations */
  missingLabels: string[];
  /** Attestations the submitter answered "no" to (column === false) */
  denied: string[];
  /** Human-readable labels for denied attestations */
  deniedLabels: string[];
  /** Attestations left unknown / "not sure" (column IS NULL) */
  unanswered: string[];
  /** Human-readable labels for unanswered attestations */
  unansweredLabels: string[];
  /** Which extension table was checked */
  sourceTable: 'food_providers' | 'store_providers' | null;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Check that all halal attestation questions are affirmed for a provider.
 * Reads from the food_providers or store_providers extension table based
 * on the provider's listing_type.
 *
 * Returns which attestations are missing so the reviewer can take action.
 */
export async function checkHalalAttestation(
  providerId: string,
): Promise<HalalAttestationCheckResult> {
  const supabase = getSupabaseAdmin();

  // First, determine the provider's listing type
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('listing_type')
    .eq('provider_id', providerId)
    .single();

  if (providerError || !provider) {
    throw new Error(`Failed to fetch provider: ${providerError?.message ?? 'Not found'}`);
  }

  // Only food and store providers have attestation data
  if (provider.listing_type !== 'food' && provider.listing_type !== 'store') {
    return {
      allAttested: true,
      missing: [],
      missingLabels: [],
      denied: [],
      deniedLabels: [],
      unanswered: [],
      unansweredLabels: [],
      sourceTable: null,
    };
  }

  const extTable = provider.listing_type === 'food' ? 'food_providers' : 'store_providers';

  const { data: extData, error: extError } = await supabase
    .from(extTable)
    .select(HALAL_ATTESTATION_FIELDS.join(', '))
    .eq('provider_id', providerId)
    .single();

  if (extError) {
    // No extension row exists — attestations are not yet answered
    return {
      allAttested: false,
      missing: [...HALAL_ATTESTATION_FIELDS],
      missingLabels: HALAL_ATTESTATION_FIELDS.map((f) => HALAL_FIELD_LABELS[f]),
      denied: [],
      deniedLabels: [],
      unanswered: [...HALAL_ATTESTATION_FIELDS],
      unansweredLabels: HALAL_ATTESTATION_FIELDS.map((f) => HALAL_FIELD_LABELS[f]),
      sourceTable: extTable,
    };
  }

  const denied: string[] = [];
  const unanswered: string[] = [];
  const row = extData as unknown as Record<string, boolean | null>;
  for (const field of HALAL_ATTESTATION_FIELDS) {
    if (row[field] === false) {
      denied.push(field);
    } else if (row[field] == null) {
      unanswered.push(field);
    }
  }
  const missing = [...denied, ...unanswered];

  return {
    allAttested: missing.length === 0,
    missing,
    missingLabels: missing.map((f) => HALAL_FIELD_LABELS[f]),
    denied,
    deniedLabels: denied.map((f) => HALAL_FIELD_LABELS[f]),
    unanswered,
    unansweredLabels: unanswered.map((f) => HALAL_FIELD_LABELS[f]),
    sourceTable: extTable,
  };
}
