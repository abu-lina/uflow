/**
 * Provider Owner Outreach Service
 * Plan 038: Provider Owner Outreach & Claim System
 *
 * Handles outreach queue operations, token management, and status tracking
 * for the provider owner outreach workflow.
 */
import { supabase } from '@/lib/supabase/client';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export type OutreachStatus =
  | 'pending_approval'
  | 'approved'
  | 'pending_dispatch'
  | 'dispatched'
  | 'failed'
  | 'claimed'
  | 'removed'
  | 'kept'
  | 'expired';

export type OutreachChannel = 'email' | 'phone' | 'instagram';

export type TokenActionScope = 'decision' | 'claim' | 'remove';

export interface ProviderOutreach {
  id: string;
  providerId: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  candidateInstagram: string | null;
  selectedChannel: OutreachChannel;
  language: string;
  status: OutreachStatus;
  attemptCount: number;
  approvedAt?: string | null;
  approvedBy?: string | null;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  dispatchAfter?: string;
  dispatchError?: string | null;
  outcomeAt?: string | null;
  outcomeNote?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OutreachToken {
  id: string;
  tokenHash: string;
  providerId: string;
  outreachId?: string | null;
  actionScope: TokenActionScope;
  expiresAt: string;
  consumedAt: string | null;
  providerNameSnapshot: string;
  createdAt: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  providerId?: string;
  providerName?: string;
  actionScope?: TokenActionScope;
  errorMessage?: string;
}

export interface CreateTokenParams {
  providerId: string;
  outreachId?: string;
  providerName: string;
  actionScope: TokenActionScope;
  expiresInDays?: number;
}

export interface CreateTokenResult {
  tokenId: string;
  rawToken: string; // Raw token to include in email link
}

// ============================================================================
// Token Operations
// ============================================================================

/**
 * Generate a cryptographically secure random token and its hash.
 * The raw token is returned for inclusion in emails; only the hash is stored.
 */
function generateToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Hash a raw token for lookup.
 */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Validate an outreach token using the database RPC function.
 * Returns provider info if valid, error message if not.
 */
export async function validateOutreachToken(
  tokenHash: string
): Promise<TokenValidationResult> {
  const { data, error } = await supabase.rpc('validate_outreach_token', {
    p_token_hash: tokenHash,
  });

  if (error || !data || data.length === 0) {
    return {
      isValid: false,
      errorMessage: error?.message || 'Token validation error',
    };
  }

  const result = data[0];
  return {
    isValid: result.is_valid,
    providerId: result.provider_id ?? undefined,
    providerName: result.provider_name ?? undefined,
    actionScope: result.action_scope ?? undefined,
    errorMessage: result.error_message ?? undefined,
  };
}

/**
 * Create a new outreach token for a provider.
 * Returns both the raw token (for email) and the token record ID.
 */
export async function createOutreachToken(
  params: CreateTokenParams
): Promise<CreateTokenResult> {
  const { rawToken, tokenHash } = generateToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 7));

  const { data, error } = await supabase
    .from('provider_owner_action_tokens')
    .insert({
      token_hash: tokenHash,
      provider_id: params.providerId,
      outreach_id: params.outreachId ?? null,
      action_scope: params.actionScope,
      expires_at: expiresAt.toISOString(),
      provider_name_snapshot: params.providerName,
    })
    .select('id, token_hash')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create outreach token: ${error?.message}`);
  }

  return {
    tokenId: data.id,
    rawToken,
  };
}

/**
 * Mark a token as consumed.
 */
export async function consumeToken(tokenHash: string): Promise<void> {
  const { error } = await supabase
    .from('provider_owner_action_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  if (error) {
    throw new Error(`Failed to consume token: ${error.message}`);
  }
}

// ============================================================================
// Outreach Operations
// ============================================================================

/**
 * Get the current outreach record for a provider.
 */
export async function getOutreachByProvider(
  providerId: string
): Promise<ProviderOutreach | null> {
  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .select('*')
    .eq('provider_id', providerId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapOutreachRow(data);
}

/**
 * Get outreach record by ID.
 */
export async function getOutreachById(
  outreachId: string
): Promise<ProviderOutreach | null> {
  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .select('*')
    .eq('id', outreachId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapOutreachRow(data);
}

/**
 * Update the status of an outreach record.
 */
export async function updateOutreachStatus(
  outreachId: string,
  status: OutreachStatus,
  outcomeNote?: string
): Promise<ProviderOutreach> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (outcomeNote !== undefined) {
    updateData.outcome_note = outcomeNote;
    updateData.outcome_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .update(updateData)
    .eq('id', outreachId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update outreach status: ${error?.message}`);
  }

  return mapOutreachRow(data);
}

/**
 * Get pending outreach records that are ready for dispatch.
 * - Status is 'approved' or 'pending_dispatch'
 * - dispatch_after has passed
 * - next_attempt_at has passed (or is null)
 */
export async function getPendingOutreach(
  limit: number = 10
): Promise<ProviderOutreach[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .select('*')
    .in('status', ['approved', 'pending_dispatch'])
    .lte('dispatch_after', now)
    .lt('attempt_count', 3) // Don't exceed max attempts
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(mapOutreachRow);
}

/**
 * Record a dispatch attempt result.
 */
export async function recordDispatchAttempt(
  outreachId: string,
  success: boolean,
  errorMessage?: string
): Promise<ProviderOutreach> {
  const { data: current, error: fetchError } = await supabase
    .from('provider_owner_outreach')
    .select('attempt_count, max_attempts')
    .eq('id', outreachId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Failed to fetch outreach: ${fetchError?.message}`);
  }

  const newAttemptCount = (current.attempt_count ?? 0) + 1;
  const maxAttempts = current.max_attempts ?? 3;

  let newStatus: OutreachStatus;
  if (success) {
    newStatus = 'dispatched';
  } else if (newAttemptCount >= maxAttempts) {
    newStatus = 'failed';
  } else {
    newStatus = 'pending_dispatch';
  }

  // Set next attempt time (exponential backoff: 1h, 4h, 12h)
  const backoffHours = Math.pow(2, newAttemptCount) - 1; // 1, 3, 7
  const nextAttempt = new Date();
  nextAttempt.setHours(nextAttempt.getHours() + backoffHours);

  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .update({
      status: newStatus,
      attempt_count: newAttemptCount,
      last_attempt_at: new Date().toISOString(),
      next_attempt_at: success ? null : nextAttempt.toISOString(),
      dispatch_error: success ? null : errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outreachId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to record dispatch attempt: ${error?.message}`);
  }

  return mapOutreachRow(data);
}

/**
 * Approve an outreach record for dispatch.
 * Only admins/operators can approve.
 */
export async function approveOutreach(
  outreachId: string,
  approvedByUserId: string
): Promise<ProviderOutreach> {
  const { data, error } = await supabase
    .from('provider_owner_outreach')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedByUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', outreachId)
    .eq('status', 'pending_approval') // Can only approve pending items
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to approve outreach: ${error?.message}`);
  }

  return mapOutreachRow(data);
}

// ============================================================================
// Manual Task Operations
// ============================================================================

export interface OutreachTask {
  id: string;
  providerId: string;
  outreachId: string | null;
  channel: OutreachChannel;
  contactValue: string;
  taskStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt: string | null;
  completedBy: string | null;
  outcomeNote: string | null;
  createdAt: string;
}

/**
 * Create a manual outreach task (for phone/Instagram).
 */
export async function createOutreachTask(params: {
  providerId: string;
  outreachId?: string;
  channel: OutreachChannel;
  contactValue: string;
}): Promise<OutreachTask> {
  const { data, error } = await supabase
    .from('provider_outreach_tasks')
    .insert({
      provider_id: params.providerId,
      outreach_id: params.outreachId ?? null,
      channel: params.channel,
      contact_value: params.contactValue,
      task_status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create outreach task: ${error?.message}`);
  }

  return mapTaskRow(data);
}

/**
 * Get pending manual outreach tasks.
 */
export async function getPendingTasks(
  limit: number = 20
): Promise<OutreachTask[]> {
  const { data, error } = await supabase
    .from('provider_outreach_tasks')
    .select('*')
    .eq('task_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(mapTaskRow);
}

// ============================================================================
// Provider Lookups (used by dispatcher for email personalisation)
// ============================================================================

/**
 * Fetch the display name for a provider by ID.
 * Returns null if the provider is not found or on query error,
 * so the caller can apply a safe fallback without breaking dispatch.
 */
export async function getProviderName(providerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('providers')
    .select('provider_name')
    .eq('provider_id', providerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.provider_name ?? null;
}

// ============================================================================
// Helpers
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOutreachRow(row: any): ProviderOutreach {
  return {
    id: row.id,
    providerId: row.provider_id,
    candidateEmail: row.candidate_email,
    candidatePhone: row.candidate_phone,
    candidateInstagram: row.candidate_instagram,
    selectedChannel: row.selected_channel,
    language: row.language,
    status: row.status,
    attemptCount: row.attempt_count,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    lastAttemptAt: row.last_attempt_at,
    nextAttemptAt: row.next_attempt_at,
    dispatchAfter: row.dispatch_after,
    dispatchError: row.dispatch_error,
    outcomeAt: row.outcome_at,
    outcomeNote: row.outcome_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTaskRow(row: any): OutreachTask {
  return {
    id: row.id,
    providerId: row.provider_id,
    outreachId: row.outreach_id,
    channel: row.channel,
    contactValue: row.contact_value,
    taskStatus: row.task_status,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    outcomeNote: row.outcome_note,
    createdAt: row.created_at,
  };
}
