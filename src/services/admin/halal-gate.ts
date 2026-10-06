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

export type HalalAttestationField = (typeof HALAL_ATTESTATION_FIELDS)[number];

export type HalalAttestationValueMap = Partial<Record<HalalAttestationField, boolean | null>>;

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
 * Pure classifier for the halal attestation gate (#548).
 * true = compliant, false = denied, null/absent = unanswered.
 * Approval requires all three fields to be true.
 */
export function classifyAttestation(
  values: HalalAttestationValueMap,
): Omit<HalalAttestationCheckResult, 'sourceTable'> {
  const denied: string[] = [];
  const unanswered: string[] = [];
  for (const field of HALAL_ATTESTATION_FIELDS) {
    if (values[field] === false) {
      denied.push(field);
    } else if (values[field] == null) {
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
  };
}

export interface StoredHalalAttestation {
  /** Which extension table holds the answers, or null for non-food/store providers */
  sourceTable: 'food_providers' | 'store_providers' | null;
  /** Stored answers; null when the extension row does not exist yet */
  values: Record<HalalAttestationField, boolean | null> | null;
}

/**
 * Read the stored attestation row for a provider (#548).
 * Used by the review endpoint to overlay the answers the admin just
 * submitted onto the stored values before gating the approval.
 */
export async function getHalalAttestationValues(
  providerId: string,
): Promise<StoredHalalAttestation> {
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
    return { sourceTable: null, values: null };
  }

  const extTable = provider.listing_type === 'food' ? 'food_providers' : 'store_providers';

  const { data: extData, error: extError } = await supabase
    .from(extTable)
    .select(HALAL_ATTESTATION_FIELDS.join(', '))
    .eq('provider_id', providerId)
    .single();

  if (extError || !extData) {
    return { sourceTable: extTable, values: null };
  }

  return {
    sourceTable: extTable,
    values: extData as unknown as Record<HalalAttestationField, boolean | null>,
  };
}

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
  const { sourceTable, values } = await getHalalAttestationValues(providerId);

  // Only food and store providers have attestation data
  if (!sourceTable) {
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

  // A missing extension row classifies as all-unanswered.
  return { ...classifyAttestation(values ?? {}), sourceTable };
}
