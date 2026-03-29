/**
 * Admin enrichment service — Plan 065, Milestone 3.
 *
 * Business logic for admin enrichment candidate operations.
 * Uses service-role Supabase client for writes (bypasses RLS).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminField } from '@/lib/enrichment/enrichment-fields';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichmentCandidateRow {
  id: string;
  provider_id: string;
  source: string;
  source_url: string | null;
  field_name: string;
  proposed_value: unknown;
  current_value: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  enriched_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  run_id: string | null;
  created_at: string;
}

export interface EnrichmentCandidateWithProvider extends EnrichmentCandidateRow {
  provider_name: string;
}

export interface PendingCandidatesResult {
  data: EnrichmentCandidateWithProvider[];
  total: number;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Fetch pending enrichment candidates, optionally filtered by provider_id.
 * Joins provider_name for display in admin UI.
 */
export async function getPendingCandidates(
  options: { providerId?: string; limit?: number; offset?: number } = {}
): Promise<PendingCandidatesResult> {
  const supabase = getSupabaseAdmin();
  const { providerId, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('enrichment_candidates')
    .select(
      `
      id,
      provider_id,
      source,
      source_url,
      field_name,
      proposed_value,
      current_value,
      status,
      enriched_at,
      reviewed_at,
      reviewer_id,
      run_id,
      created_at,
      providers!inner(provider_name)
    `,
      { count: 'exact' }
    )
    .eq('status', 'pending')
    .order('enriched_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending candidates: ${error.message}`);
  }

  const candidates: EnrichmentCandidateWithProvider[] = (data ?? []).map(
    (row: Record<string, unknown>) => ({
      ...(row as unknown as EnrichmentCandidateRow),
      provider_name:
        (row.providers as { provider_name: string } | null)?.provider_name ?? 'Unknown',
    })
  );

  return { data: candidates, total: count ?? 0 };
}

/**
 * Approve a single enrichment candidate: apply the proposed value to the
 * provider and mark the candidate as 'applied'.
 *
 * Enforces admin-field preservation: rejects if field_name is admin-controlled.
 */
export async function approveCandidate(
  candidateId: string,
  reviewerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the candidate
  const { data: candidate, error: fetchError } = await supabase
    .from('enrichment_candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !candidate) {
    return { success: false, error: 'Candidate not found or not pending' };
  }

  // 2. Admin-field preservation check (server-side enforcement)
  if (isAdminField(candidate.field_name)) {
    return {
      success: false,
      error: `Cannot apply enrichment to admin-controlled field: ${candidate.field_name}`,
    };
  }

  // 2b. Ownership guard: fail closed if provider now has an owner (Plan 065 scope revision)
  const { data: providerCheck, error: ownerCheckError } = await supabase
    .from('providers')
    .select('provider_owner_id')
    .eq('provider_id', candidate.provider_id)
    .single();

  if (ownerCheckError || !providerCheck) {
    return { success: false, error: 'Failed to verify provider ownership status' };
  }

  if (providerCheck.provider_owner_id !== null) {
    return {
      success: false,
      error: `Cannot enrich provider that now has an owner (provider_owner_id is set). Candidate left as pending.`,
    };
  }

  // 3. Apply the proposed value to the provider
  const { error: updateError } = await supabase
    .from('providers')
    .update({
      [candidate.field_name]: candidate.proposed_value,
      last_enriched_at: new Date().toISOString(),
    })
    .eq('provider_id', candidate.provider_id);

  if (updateError) {
    return { success: false, error: `Failed to update provider: ${updateError.message}` };
  }

  // 4. Mark candidate as applied
  const { error: statusError } = await supabase
    .from('enrichment_candidates')
    .update({
      status: 'applied',
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
    })
    .eq('id', candidateId);

  if (statusError) {
    return { success: false, error: `Failed to update candidate status: ${statusError.message}` };
  }

  return { success: true };
}

/**
 * Reject a single enrichment candidate.
 */
export async function rejectCandidate(
  candidateId: string,
  reviewerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('enrichment_candidates')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
    })
    .eq('id', candidateId)
    .eq('status', 'pending');

  if (error) {
    return { success: false, error: `Failed to reject candidate: ${error.message}` };
  }

  return { success: true };
}

/**
 * Bulk approve all pending candidates for a specific provider.
 * Enforces admin-field preservation per-candidate.
 */
export async function bulkApproveByProvider(
  providerId: string,
  reviewerId: string
): Promise<{ approved: number; skipped: number; errors: string[] }> {
  const supabase = getSupabaseAdmin();

  // Ownership guard: fail closed if provider now has an owner (Plan 065 scope revision)
  const { data: providerCheck, error: ownerCheckError } = await supabase
    .from('providers')
    .select('provider_owner_id')
    .eq('provider_id', providerId)
    .single();

  if (ownerCheckError || !providerCheck) {
    return { approved: 0, skipped: 0, errors: ['Failed to verify provider ownership status'] };
  }

  if (providerCheck.provider_owner_id !== null) {
    return {
      approved: 0,
      skipped: 0,
      errors: ['Cannot enrich provider that now has an owner (provider_owner_id is set). Candidates left as pending.'],
    };
  }

  const { data: candidates, error } = await supabase
    .from('enrichment_candidates')
    .select('id, field_name')
    .eq('provider_id', providerId)
    .eq('status', 'pending');

  if (error) {
    return { approved: 0, skipped: 0, errors: [`Failed to fetch candidates: ${error.message}`] };
  }

  let approved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const candidate of candidates ?? []) {
    if (isAdminField(candidate.field_name)) {
      skipped++;
      errors.push(`Skipped admin-controlled field: ${candidate.field_name}`);
      continue;
    }

    const result = await approveCandidate(candidate.id, reviewerId);
    if (result.success) {
      approved++;
    } else {
      errors.push(result.error ?? `Failed to approve candidate ${candidate.id}`);
    }
  }

  return { approved, skipped, errors };
}
