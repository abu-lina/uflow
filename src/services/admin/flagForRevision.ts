import { logAdminAction } from '@/lib/audit/adminAudit';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

const FEEDBACK = 'Halal-Attestierung nicht mehr vollständig bestätigt';

/**
 * #987: move an approved provider to needs_revision after a halal write that
 * drops it below the approval bar. Only `approved` rows move.
 *
 * Callers flip BEFORE they write the answer, so a failed flip or write leaves a
 * flagged provider, never a public one with a false answer. The flip and the write
 * are two statements: a concurrent edit can land between them. The database trigger
 * on the owner's hardening list is the real fix.
 */
export async function flagApprovedProviderForRevision(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  providerId: string,
  reviewerId: string,
): Promise<{ flagged: boolean; error?: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('providers')
    .update({
      review_status: 'needs_revision',
      review_feedback: FEEDBACK,
      reviewed_by: reviewerId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('provider_id', providerId)
    .eq('review_status', 'approved')
    .select('provider_id');
  if (error)
    return { flagged: false, error: `Failed to flag provider for revision: ${error.message}` };

  const flagged = (data?.length ?? 0) > 0;
  if (flagged) {
    await logAdminAction(reviewerId, 'provider_review_needs_revision', 'provider', providerId, {
      reviewStatus: 'needs_revision',
      reviewFeedback: FEEDBACK,
      trigger: 'halal_gate_auto',
    });
  }
  return { flagged };
}
