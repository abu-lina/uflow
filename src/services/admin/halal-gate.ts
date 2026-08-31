/**
 * Halal attestation check service — Plan 192.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HalalAttestationCheckResult {
  allAttested: boolean;
  /** Which specific attestations are missing */
  missing: string[];
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
  providerId: string
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
    return { allAttested: true, missing: [], sourceTable: null };
  }

  const extTable = provider.listing_type === 'food' ? 'food_providers' : 'store_providers';

  const { data: extData, error: extError } = await supabase
    .from(extTable)
    .select('no_alcohol, no_pork, no_gambling')
    .eq('provider_id', providerId)
    .single();

  if (extError) {
    // No extension row exists — attestations are not yet answered
    return {
      allAttested: false,
      missing: ['no_alcohol', 'no_pork', 'no_gambling'],
      sourceTable: extTable,
    };
  }

  const missing: string[] = [];
  if (!extData.no_alcohol) missing.push('no_alcohol');
  if (!extData.no_pork) missing.push('no_pork');
  if (!extData.no_gambling) missing.push('no_gambling');

  return {
    allAttested: missing.length === 0,
    missing,
    sourceTable: extTable,
  };
}
