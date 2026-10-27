import type { SupabaseClient } from '@supabase/supabase-js';
import { WEBSITE_SOURCE_PREFIX } from './website-delivery-links';

export interface HeldPlatformOptions {
  /** Only count candidates with this status (default: any status). */
  candidateStatus?: string;
  /** Only count `provider_website:*` candidates (default: any source). */
  websiteSourceOnly?: boolean;
}

/**
 * Platforms a provider already has a delivery link row or a `delivery_links` candidate for.
 * This is the "done once" check for website delivery links; no extra table is needed.
 */
export async function loadHeldPlatforms(
  supabase: SupabaseClient,
  providerId: string,
  options: HeldPlatformOptions = {},
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('provider_delivery_links')
    .select('platform')
    .eq('provider_id', providerId);
  if (error) throw new Error(`Failed to load delivery links: ${error.message}`);
  const held = new Set((data ?? []).map((r) => r.platform as string));

  let query = supabase
    .from('enrichment_candidates')
    .select('source, proposed_value')
    .eq('provider_id', providerId)
    .eq('field_name', 'delivery_links');
  if (options.candidateStatus) query = query.eq('status', options.candidateStatus);
  if (options.websiteSourceOnly) query = query.like('source', `${WEBSITE_SOURCE_PREFIX}:%`);
  const { data: candidates, error: candidateError } = await query;
  if (candidateError)
    throw new Error(`Failed to load delivery candidates: ${candidateError.message}`);

  for (const row of candidates ?? []) {
    const source = String(row.source ?? '');
    if (source.startsWith(`${WEBSITE_SOURCE_PREFIX}:`)) {
      held.add(source.slice(WEBSITE_SOURCE_PREFIX.length + 1));
    }
    if (options.websiteSourceOnly || !Array.isArray(row.proposed_value)) continue;
    for (const item of row.proposed_value as Array<{ platform?: unknown } | null>) {
      if (typeof item?.platform === 'string') held.add(item.platform);
    }
  }
  return held;
}
