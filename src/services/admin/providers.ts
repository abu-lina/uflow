/**
 * Admin provider service
 * Business logic for admin provider operations
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';
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
    // Log but don't fail - count is not critical
    console.error('Error fetching provider count:', countError);
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
    // Preserve the error contract: CONFLICT: -> 409, HALAL_GATE: -> 422.
    const conflictAt = message.indexOf('CONFLICT:');
    if (conflictAt >= 0) {
      throw new Error(message.slice(conflictAt));
    }
    const gateAt = message.indexOf('HALAL_GATE:');
    if (gateAt >= 0) {
      throw new Error(message.slice(gateAt));
    }
    throw new Error(`Failed to update provider review: ${message}`);
  }

  if (!data) {
    // The RPC either returns the updated row or raises; a null result means
    // the provider doesn't exist (defensive — the RPC raises first).
    throw new Error('Provider not found');
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
      category:categories(name_de, name_en, category_images),
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
