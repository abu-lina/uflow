/**
 * Admin provider service
 * Business logic for admin provider operations
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';
import { logger } from '@/lib/logging/structuredLogger';
import type { AdminProviderWithExtensions } from '@/types/adminProvider';
import type { Provider as CanonicalProvider } from '@/services/providers';

// Admin-specific projection of the canonical Provider type.
// Uses Pick to stay in sync instead of a separate interface.
type Provider = Pick<
  CanonicalProvider,
  | 'provider_id'
  | 'provider_name'
  | 'provider_images'
  | 'category_id'
  | 'address_city'
  | 'contact_email'
  | 'review_status'
  | 'review_feedback'
  | 'created_at'
  | 'updated_at'
  | 'description'
>;

export interface PendingProvider {
  provider_id: string;
  provider_name: string;
  provider_images: string | null;
  category_id: string | null;
  address_city: string | null;
  contact_email: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_feedback: string | null;
  created_at: string;
  updated_at: string;
  user_created_id: string | null;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Get pending providers with pagination
 */
export async function getPendingProviders(
  status: 'pending' | 'needs_revision',
  pagination: PaginationParams,
): Promise<PaginatedResult<PendingProvider>> {
  const supabase = getSupabaseAdmin();

  // Fetch providers
  const { data, error } = await supabase
    .from('providers')
    .select(
      'provider_id, provider_name, provider_images, category_id, address_city, contact_email, review_status, review_feedback, created_at, updated_at, user_created_id',
    )
    .eq('review_status', status)
    .order('created_at', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.limit - 1);

  if (error) {
    throw new Error(`Failed to fetch pending providers: ${error.message}`);
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .eq('review_status', status);

  if (countError) {
    logger.error('providers: count query failed (non-critical)', undefined, {
      error: countError.message,
    });
  }

  return {
    data: (data as PendingProvider[]) || [],
    pagination: {
      total: count || 0,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: (count || 0) > pagination.offset + pagination.limit,
    },
  };
}

/**
 * Extend PendingProvider with fields needed in the review queue.
 * contact_email omitted — not rendered in queue, avoid PII over-exposure.
 */
export interface ReadyForReviewProvider extends Omit<PendingProvider, 'contact_email'> {
  screening_status: 'clear' | 'review' | 'flagged' | null;
  screening_flags: Array<{
    code: string;
    term: string | null;
    snippet: string | null;
    url: string;
    source: string;
  }>;
  enrichment_links: Array<{ platform: string; url: string }>;
  last_enriched_at: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  wolt_url: 'Wolt',
  ubereats_url: 'Uber Eats',
  google_place_url: 'Google Places',
  website: 'Website',
};

function platformLabel(fieldName: string): string {
  if (fieldName in PLATFORM_LABELS) return PLATFORM_LABELS[fieldName];
  return fieldName.replace(/_url$/, '').replace(/^./, (c) => c.toUpperCase());
}

function extractUrl(proposed_value: unknown): string | null {
  if (typeof proposed_value === 'string') return proposed_value;
  try {
    const parsed = JSON.parse(String(proposed_value));
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Get providers ready for admin review:
 * - review_status = 'pending'
 * - last_enriched_at IS NOT NULL
 * - no enrichment_candidates with status = 'pending'
 * - at least one provider_screenings row
 */
export async function getReadyForReviewProviders(
  pagination: PaginationParams,
): Promise<PaginatedResult<ReadyForReviewProvider>> {
  const supabase = getSupabaseAdmin();

  // Step 1: fetch pending+enriched providers (no join — avoids schema cache issues)
  // shortcut: full-table fetch before JS filter; replace with DB-side EXISTS subquery at scale
  const { data: providerRows, error } = await supabase
    .from('providers')
    .select(
      'provider_id, provider_name, provider_images, category_id, address_city, review_status, review_feedback, created_at, updated_at, user_created_id, last_enriched_at',
    )
    .eq('review_status', 'pending')
    .not('last_enriched_at', 'is', null)
    .range(0, 999)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch review queue: ${error.message}`);
  }

  if (!providerRows || providerRows.length === 0) {
    return {
      data: [],
      pagination: { total: 0, limit: pagination.limit, offset: pagination.offset, hasMore: false },
    };
  }

  const allIds = providerRows.map((p) => p.provider_id);

  // Step 2: fetch screenings and candidates in parallel
  const [screeningsRes, candidatesRes] = await Promise.all([
    supabase
      .from('provider_screenings')
      .select('provider_id, status, flags')
      .in('provider_id', allIds),
    supabase
      .from('enrichment_candidates')
      .select('provider_id, field_name, proposed_value, source_url, status')
      .in('provider_id', allIds),
  ]);

  if (screeningsRes.error)
    throw new Error(`Failed to fetch screenings: ${screeningsRes.error.message}`);
  if (candidatesRes.error)
    throw new Error(`Failed to fetch candidates: ${candidatesRes.error.message}`);

  const screeningsByProvider = new Map<string, Array<{ status: string; flags: unknown[] }>>();
  for (const s of screeningsRes.data ?? []) {
    const arr = screeningsByProvider.get(s.provider_id) ?? [];
    arr.push({ status: s.status, flags: (s.flags as unknown[]) ?? [] });
    screeningsByProvider.set(s.provider_id, arr);
  }

  const candidatesByProvider = new Map<
    string,
    Array<{
      field_name: string;
      proposed_value: unknown;
      source_url: string | null;
      status: string;
    }>
  >();
  for (const c of candidatesRes.data ?? []) {
    const arr = candidatesByProvider.get(c.provider_id) ?? [];
    arr.push({
      field_name: c.field_name,
      proposed_value: c.proposed_value,
      source_url: c.source_url,
      status: c.status,
    });
    candidatesByProvider.set(c.provider_id, arr);
  }

  const mapped = providerRows.map((row) => {
    const screenings = screeningsByProvider.get(row.provider_id) ?? [];
    const candidates = candidatesByProvider.get(row.provider_id) ?? [];

    // Must have at least one screening row
    if (screenings.length === 0) return null;

    // Exclude if any enrichment candidate is still pending
    if (candidates.some((c) => c.status === 'pending')) return null;

    // Derive worst screening status across all screening rows
    const statuses = screenings.map((s) => s.status);
    let screeningStatus: 'clear' | 'review' | 'flagged' | null = null;
    if (statuses.includes('flagged')) screeningStatus = 'flagged';
    else if (statuses.includes('review')) screeningStatus = 'review';
    else if (statuses.length > 0) screeningStatus = 'clear';

    const flags = screenings.flatMap(
      (s) => (s.flags ?? []) as ReadyForReviewProvider['screening_flags'],
    );

    const appliedLinks = candidates
      .filter(
        (c) =>
          (c.status === 'applied' || c.status === 'auto-applied') && c.field_name.endsWith('_url'),
      )
      .flatMap((c) => {
        const url = extractUrl(c.proposed_value);
        return url ? [{ platform: platformLabel(c.field_name), url }] : [];
      });

    return {
      provider_id: row.provider_id as string,
      provider_name: row.provider_name as string,
      provider_images: row.provider_images as string | null,
      category_id: row.category_id as string | null,
      address_city: row.address_city as string | null,
      review_status: row.review_status as PendingProvider['review_status'],
      review_feedback: row.review_feedback as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      user_created_id: row.user_created_id as string | null,
      last_enriched_at: row.last_enriched_at as string | null,
      screening_status: screeningStatus,
      screening_flags: flags,
      enrichment_links: appliedLinks,
    };
  });

  const filtered = mapped.filter((r): r is ReadyForReviewProvider => r !== null);

  // Apply pagination after client-side filtering
  const total = filtered.length;
  const page = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

  return {
    data: page,
    pagination: {
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.offset + pagination.limit < total,
    },
  };
}

/**
 * Halal answers submitted from the admin halal check page (#548).
 * CamelCase here; translated to the extension-table column names for the
 * RPC. Key PRESENCE is meaningful: an absent key leaves the stored column
 * untouched, an explicit null stores NULL ("not sure").
 */
export interface HalalReviewAnswers {
  noAlcohol?: boolean | null;
  noPork?: boolean | null;
  noGambling?: boolean | null;
  verificationMethod?: 'online' | 'onsite' | null;
  hasCertificate?: boolean;
  certificateUrl?: string | null;
}

/**
 * Client-facing message when the admin_review_provider RPC is absent
 * (#548 deploy-ordering guard). Names our own migration so the failure is
 * self-diagnosing, but leaks no Postgres/PostgREST internals.
 */
export const REVIEW_RPC_UNAVAILABLE_MESSAGE =
  'Provider review is temporarily unavailable: the deployment is misconfigured and database migration 138 is still pending. Please contact the platform team.';

/**
 * True when PostgREST/Postgres reports the admin_review_provider function as
 * undefined: PGRST202 = function not in the schema cache (the usual signal
 * when migration 138 has not been applied), 42883 = undefined_function if the
 * call ever reaches Postgres directly, plus a message fallback for drift.
 */
function isMissingReviewRpcError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    (error.message ?? '').includes('Could not find the function')
  );
}

/**
 * Update provider review status with optional optimistic concurrency check.
 * When expectedUpdatedAt is provided, the update only succeeds if the provider's
 * updated_at still matches, preventing silent overwrites by concurrent admins.
 *
 * #548: routes through the admin_review_provider RPC so the submitted halal
 * answers and the status change commit in one transaction, and so
 * reviewed_by / reviewed_at are recorded on every decision.
 */
export async function updateProviderReview(
  providerId: string,
  reviewStatus: 'approved' | 'rejected' | 'needs_revision',
  reviewFeedback?: string | null,
  expectedUpdatedAt?: string,
  reviewerId?: string,
  halal?: HalalReviewAnswers,
): Promise<Provider> {
  const supabase = getSupabaseAdmin();

  // camelCase -> extension-table column names, key-presence preserved so an
  // explicit null is stored as NULL and an absent key does not clobber.
  let halalPayload: Record<string, unknown> | null = null;
  if (halal) {
    halalPayload = {};
    if ('noAlcohol' in halal) halalPayload.no_alcohol = halal.noAlcohol;
    if ('noPork' in halal) halalPayload.no_pork = halal.noPork;
    if ('noGambling' in halal) halalPayload.no_gambling = halal.noGambling;
    if ('verificationMethod' in halal) {
      halalPayload.verification_method = halal.verificationMethod;
    }
    if ('hasCertificate' in halal) halalPayload.has_certificate = halal.hasCertificate;
    if ('certificateUrl' in halal) halalPayload.certificate_url = halal.certificateUrl;
  }

  const { data, error } = await supabase.rpc('admin_review_provider', {
    p_provider_id: providerId,
    p_review_status: reviewStatus,
    // Sanitize feedback text to prevent XSS (defense in depth)
    p_review_feedback: reviewFeedback ? sanitizeTextInput(reviewFeedback) : null,
    p_reviewer_id: reviewerId ?? null,
    p_halal: halalPayload,
    p_expected_updated_at: expectedUpdatedAt ?? null,
  });

  if (error) {
    const message = error.message ?? '';
    // Deploy-ordering guard (#548): migration 138 creates this RPC, and it is
    // the only review write path (halal footer, provider-list buttons,
    // edit-provider auto-reject). If the code ships ahead of the migration,
    // fail fast with an explicit signal instead of an opaque PostgREST error;
    // the route maps MISCONFIGURED: to a safe client message.
    if (isMissingReviewRpcError(error)) {
      console.error(
        '[review] admin_review_provider RPC unavailable — migration 138 (138_issue548_review_audit_and_tri_state) not applied to this environment',
        { code: error.code, message: error.message, details: error.details, hint: error.hint },
      );
      throw new Error(
        'MISCONFIGURED: admin_review_provider RPC is not available; migration 138 has not been applied to this environment',
      );
    }
    // Preserve the error contract so the route can map each signal:
    // CONFLICT: -> 409, HALAL_GATE: -> 422, NOT_FOUND: -> 404,
    // FORBIDDEN: -> 403.
    for (const prefix of ['CONFLICT:', 'HALAL_GATE:', 'NOT_FOUND:', 'FORBIDDEN:']) {
      const at = message.indexOf(prefix);
      if (at >= 0) {
        throw new Error(message.slice(at));
      }
    }
    throw new Error(`Failed to update provider review: ${message}`);
  }

  if (!data) {
    // The RPC either returns the updated row or raises; a null result means
    // the provider doesn't exist (defensive — the RPC raises first).
    throw new Error('NOT_FOUND: Provider not found');
  }

  return data as Provider;
}

/**
 * Delete a provider by ID.
 * Uses .select() after delete to detect non-existent providers.
 * All child tables have ON DELETE CASCADE, so cleanup is automatic.
 */
export async function deleteProvider(providerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('providers')
    .delete()
    .eq('provider_id', providerId)
    .select();

  if (error) {
    throw new Error(`Failed to delete provider: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    throw new Error('Provider not found');
  }
}

/**
 * Get a single provider by ID for admin editing.
 * Uses service-role to bypass RLS (can load non-approved providers).
 * Plan 145: Left-joins extension tables (food_providers, store_providers),
 * food_menu, and provider_delivery_links for the edit form.
 */
export async function getProviderForAdmin(
  providerId: string,
): Promise<AdminProviderWithExtensions | null> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('providers')
    .select(
      `
      *,
      category:categories!providers_category_id_fkey(name_de, name_en, category_images),
      provider_categories(category_id),
      locations(*),
      food_providers(*),
      store_providers(*),
      food_menu(*),
      provider_delivery_links(*)
    `,
    )
    .eq('provider_id', providerId);

  if (error) {
    throw new Error(`Failed to fetch provider: ${error.message}`);
  }

  return (rows as AdminProviderWithExtensions[] | null)?.[0] ?? null;
}
