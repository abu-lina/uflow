import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ADR 0003: true when unreviewed halal candidates exist for the provider. Fails closed to false on error. */
export async function hasPendingHalalCandidates(providerId: string): Promise<boolean> {
  if (!UUID_REGEX.test(providerId)) return false;

  const { count, error } = await getSupabaseAdmin()
    .from('enrichment_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId)
    .in('field_name', ['no_alcohol', 'no_pork'])
    .eq('status', 'pending');

  return !error && (count ?? 0) > 0;
}
