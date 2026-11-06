import { getSupabaseAdmin } from '@/lib/supabase/admin';

const HALAL_FIELDS = ['no_alcohol', 'no_pork', 'no_gambling'] as const;
type HalalField = (typeof HALAL_FIELDS)[number];
export type HalalToggles = Record<HalalField, boolean>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBSTANCE: Partial<Record<HalalField, string>> = { no_alcohol: 'alcohol', no_pork: 'pork' };

export interface HalalReviewItem {
  providerId: string;
  providerName: string;
  oldestPendingAt: string;
  mapsMatch: { url: string; category: string | null } | null;
  deliveryLinks: { platform: string; url: string }[];
  flaggedItems: { name: string; substance: string }[];
  toggles: HalalToggles;
}

interface CandidateRow {
  provider_id: string;
  field_name: HalalField;
  proposed_value: unknown;
  source_url: string | null;
  evidence: Record<string, unknown> | null;
  enriched_at: string;
  providers: { provider_name: string } | null;
}

/** Providers with pending halal candidates, oldest pending candidate first. */
export async function getHalalReviewQueue(): Promise<HalalReviewItem[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('enrichment_candidates')
    .select(
      'provider_id, field_name, proposed_value, source_url, evidence, enriched_at, providers!inner(provider_name)',
    )
    .eq('status', 'pending')
    .in('field_name', [...HALAL_FIELDS])
    .order('enriched_at', { ascending: true });
  if (error) throw new Error(`Failed to fetch halal review queue: ${error.message}`);

  const byProvider = new Map<string, CandidateRow[]>();
  for (const row of (data ?? []) as unknown as CandidateRow[]) {
    byProvider.set(row.provider_id, [...(byProvider.get(row.provider_id) ?? []), row]);
  }
  const providerIds = Array.from(byProvider.keys());
  if (providerIds.length === 0) return [];

  const [current, links] = await Promise.all([
    supabase
      .from('food_providers')
      .select('provider_id, no_alcohol, no_pork, no_gambling')
      .in('provider_id', providerIds),
    supabase
      .from('provider_delivery_links')
      .select('provider_id, platform, platform_url')
      .in('provider_id', providerIds)
      .eq('is_active', true),
  ]);
  if (current.error) throw new Error(`Failed to fetch food providers: ${current.error.message}`);
  if (links.error) throw new Error(`Failed to fetch delivery links: ${links.error.message}`);

  return Array.from(byProvider.entries())
    .map(([providerId, rows]) => {
      // Rows arrive oldest first, so later candidates overwrite earlier ones.
      const stored = (current.data ?? []).find((r) => r.provider_id === providerId);
      const toggles: HalalToggles = {
        no_alcohol: stored?.no_alcohol === true,
        no_pork: stored?.no_pork === true,
        no_gambling: stored?.no_gambling === true,
      };
      const flaggedItems: HalalReviewItem['flaggedItems'] = [];
      let mapsMatch: HalalReviewItem['mapsMatch'] = null;

      for (const row of rows) {
        if (typeof row.proposed_value === 'boolean') toggles[row.field_name] = row.proposed_value;
        const substance = SUBSTANCE[row.field_name];
        const items = row.evidence?.matched_items;
        if (substance && Array.isArray(items)) {
          for (const name of items.filter((i): i is string => typeof i === 'string')) {
            if (!flaggedItems.some((f) => f.name === name && f.substance === substance)) {
              flaggedItems.push({ name, substance });
            }
          }
        }
        if (!mapsMatch && row.evidence?.source_platform === 'google_maps' && row.source_url) {
          const category = row.evidence.maps_category;
          mapsMatch = {
            url: row.source_url,
            category: typeof category === 'string' ? category : null,
          };
        }
      }

      return {
        providerId,
        providerName: rows[0].providers?.provider_name ?? 'Unknown',
        oldestPendingAt: rows[0].enriched_at,
        mapsMatch,
        deliveryLinks: (links.data ?? [])
          .filter((l) => l.provider_id === providerId)
          .map((l) => ({ platform: l.platform, url: l.platform_url })),
        flaggedItems,
        toggles,
      };
    })
    .sort((a, b) => a.oldestPendingAt.localeCompare(b.oldestPendingAt));
}

/** Writes the three confirmed values to food_providers and marks the pending halal candidates applied. */
export async function confirmHalalReview(
  providerId: string,
  values: HalalToggles,
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(providerId)) return { success: false, error: 'Invalid provider id' };
  const supabase = getSupabaseAdmin();

  const { data: owner, error: ownerError } = await supabase
    .from('providers')
    .select('provider_owner_id')
    .eq('provider_id', providerId)
    .single();
  if (ownerError || !owner) {
    return { success: false, error: 'Failed to verify provider ownership status' };
  }
  if (owner.provider_owner_id !== null) {
    return { success: false, error: 'Cannot enrich provider that now has an owner' };
  }

  const { error: updateError } = await supabase
    .from('food_providers')
    .update({
      no_alcohol: values.no_alcohol,
      no_pork: values.no_pork,
      no_gambling: values.no_gambling,
    })
    .eq('provider_id', providerId);
  if (updateError)
    return { success: false, error: `Failed to update provider: ${updateError.message}` };

  const { error: statusError } = await supabase
    .from('enrichment_candidates')
    .update({ status: 'applied', reviewed_at: new Date().toISOString(), reviewer_id: reviewerId })
    .eq('provider_id', providerId)
    .eq('status', 'pending')
    .in('field_name', [...HALAL_FIELDS]);
  if (statusError) {
    return { success: false, error: `Failed to update candidate status: ${statusError.message}` };
  }

  return { success: true };
}
