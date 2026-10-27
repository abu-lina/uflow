import type { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * admin_update_provider replaces the whole delivery link set when delivery_links
 * is sent, so the live links are read and merged first. An existing link for the
 * same platform is never overwritten.
 *
 * The read, merge and RPC are not one transaction: a link added by someone else
 * between the read and the RPC is dropped. Acceptable for a single reviewer
 * approving one candidate at a time; a Postgres function that appends links would
 * remove the window but needs a schema change.
 */
export async function applyDeliveryLinksCandidate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  candidate: { id: string; provider_id: string; proposed_value: unknown },
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  const proposed = (
    Array.isArray(candidate.proposed_value) ? candidate.proposed_value : []
  ) as Array<{ platform?: string }>;
  if (proposed.length === 0) {
    return { success: false, error: 'Delivery candidate has no links to apply' };
  }

  const { data: existing, error: linksError } = await supabase
    .from('provider_delivery_links')
    .select('platform, platform_url, platform_slug, is_active')
    .eq('provider_id', candidate.provider_id);

  if (linksError) {
    return {
      success: false,
      error: `Failed to load existing delivery links: ${linksError.message}`,
    };
  }

  const current = (existing ?? []) as Array<{ platform: string }>;
  const held = new Set(current.map((link) => link.platform));
  const additions = proposed.filter((link) => !held.has(link.platform ?? ''));
  if (additions.length === 0) {
    const platforms = proposed.map((link) => link.platform).join(', ');
    return {
      success: false,
      error: `Provider already has a delivery link for ${platforms}. Candidate left as pending.`,
    };
  }

  const { error: rpcError } = await supabase.rpc('admin_update_provider', {
    p_provider_id: candidate.provider_id,
    p_data: { delivery_links: [...current, ...additions] },
  });
  if (rpcError) {
    return { success: false, error: `Failed to update delivery links: ${rpcError.message}` };
  }

  const { error: statusError } = await supabase
    .from('enrichment_candidates')
    .update({
      status: 'applied',
      reviewed_at: new Date().toISOString(),
      reviewer_id: reviewerId,
    })
    .eq('id', candidate.id);
  if (statusError) {
    return { success: false, error: `Failed to update candidate status: ${statusError.message}` };
  }

  return { success: true };
}
