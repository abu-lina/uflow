/**
 * Admin provider service
 * Business logic for admin provider operations
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeTextInput } from '@/utils/sanitizeInput';

// Provider type matching the database schema
interface Provider {
  provider_id: string;
  provider_name: string;
  provider_description?: string | null;
  provider_images: string | null;
  category_id: string | null;
  address_city: string | null;
  contact_email: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_feedback: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

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
  pagination: PaginationParams
): Promise<PaginatedResult<PendingProvider>> {
  const supabase = getSupabaseAdmin();

  // Fetch providers
  const { data, error } = await supabase
    .from('providers')
    .select('provider_id, provider_name, provider_images, category_id, address_city, contact_email, review_status, review_feedback, created_at, updated_at, user_created_id')
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
 * Update provider review status with optional optimistic concurrency check.
 * When expectedUpdatedAt is provided, the update only succeeds if the provider's
 * updated_at still matches, preventing silent overwrites by concurrent admins.
 */
export async function updateProviderReview(
  providerId: string,
  reviewStatus: 'approved' | 'rejected' | 'needs_revision',
  reviewFeedback?: string | null,
  expectedUpdatedAt?: string
): Promise<Provider> {
  const supabase = getSupabaseAdmin();

  const updateData: {
    review_status: string;
    review_feedback?: string | null;
    updated_at: string;
  } = {
    review_status: reviewStatus,
    updated_at: new Date().toISOString(),
  };

  if (reviewFeedback !== undefined) {
    // Sanitize feedback text to prevent XSS (defense in depth)
    updateData.review_feedback = reviewFeedback ? sanitizeTextInput(reviewFeedback) : null;
  }

  let query = supabase
    .from('providers')
    .update(updateData)
    .eq('provider_id', providerId);

  // Optimistic concurrency: only update if updated_at hasn't changed
  if (expectedUpdatedAt) {
    query = query.eq('updated_at', expectedUpdatedAt);
  }

  const { data, error } = await query
    .select()
    .single();

  if (error || !data) {
    // When expectedUpdatedAt was provided and PGRST116 is returned, the timestamp
    // condition did not match — another admin already changed this provider.
    if (expectedUpdatedAt && error?.code === 'PGRST116') {
      throw new Error('CONFLICT: Provider was modified by another reviewer. Please refresh and try again.');
    }
    if (error) {
      throw new Error(`Failed to update provider review: ${error.message}`);
    }
    throw new Error('Provider not found');
  }

  return data as Provider;
}

