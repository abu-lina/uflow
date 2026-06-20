/**
 * Enrichment gate service — Plan 193.
 *
 * Quality gate that prevents provider approval when automated enrichment
 * has detected alcohol on menu items that contradicts manual review.
 *
 * Uses service-role Supabase client for reads (bypasses RLS).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlcoholConflictDetail {
  candidateId: string;
  source: string;
  sourceUrl: string | null;
  enrichedAt: string;
}

export interface AlcoholConflictResult {
  hasConflict: boolean;
  conflicts: AlcoholConflictDetail[];
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Check if a provider has pending enrichment candidates that propose
 * `no_alcohol = false` (alcohol detected) while the provider is currently
 * marked as `no_alcohol = true` from manual review.
 *
 * Returns conflict details including enrichment source, source URL,
 * and candidate ID for resolution via the enrichment review panel.
 */
export async function checkEnrichmentAlcoholConflict(
  providerId: string
): Promise<AlcoholConflictResult> {
  const supabase = getSupabaseAdmin();

  // 1. Check if provider is currently marked as no_alcohol = true
  const { data: foodProvider, error: foodError } = await supabase
    .from('food_providers')
    .select('no_alcohol')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (foodError) {
    throw new Error(`Failed to fetch food_providers: ${foodError.message}`);
  }

  // If no food_providers row exists or no_alcohol is not true, there's no conflict
  if (!foodProvider || foodProvider.no_alcohol !== true) {
    return { hasConflict: false, conflicts: [] };
  }

  // 2. Check for pending enrichment candidates proposing no_alcohol = false
  const { data: candidates, error: candidatesError } = await supabase
    .from('enrichment_candidates')
    .select('id, source, source_url, enriched_at, proposed_value, current_value')
    .eq('provider_id', providerId)
    .eq('field_name', 'no_alcohol')
    .eq('status', 'pending')
    .eq('proposed_value', false);

  if (candidatesError) {
    throw new Error(`Failed to fetch enrichment candidates: ${candidatesError.message}`);
  }

  if (!candidates || candidates.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // 3. Build conflict details
  const conflicts: AlcoholConflictDetail[] = candidates.map((c: Record<string, unknown>) => ({
    candidateId: c.id as string,
    source: c.source as string,
    sourceUrl: (c.source_url as string) ?? null,
    enrichedAt: c.enriched_at as string,
  }));

  return { hasConflict: true, conflicts };
}
