/**
 * Provider Owner Outreach Dispatcher
 * Plan 038: Provider Owner Outreach & Claim System
 *
 * Processes the outreach queue, sends emails via Resend,
 * and creates manual tasks for non-automated channels.
 */
import {
  getPendingOutreach,
  createOutreachToken,
  recordDispatchAttempt,
  createOutreachTask,
  type ProviderOutreach,
  type OutreachChannel,
} from '@/services/outreach';
import { sendProviderOutreachEmail } from '@/services/email/outreachEmail';

// ============================================================================
// Types
// ============================================================================

export interface DispatchResult {
  outreachId: string;
  success: boolean;
  channel: OutreachChannel;
  error?: string;
}

// ============================================================================
// URL Building
// ============================================================================

/**
 * Build the landing page URL with token.
 */
export function buildOutreachTokenUrl(baseUrl: string, rawToken: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/owner-decision?token=${rawToken}`;
}

/**
 * Get the base URL from environment.
 */
function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://ummahflow.com'
  );
}

// ============================================================================
// Dispatcher Functions
// ============================================================================

/**
 * Process the outreach queue, dispatching pending outreach records.
 * Returns results for each processed record.
 */
export async function processOutreachQueue(
  limit: number = 10
): Promise<DispatchResult[]> {
  const pending = await getPendingOutreach(limit);

  if (pending.length === 0) {
    return [];
  }

  const results: DispatchResult[] = [];

  for (const outreach of pending) {
    try {
      const result = await dispatchSingleOutreach(outreach);
      results.push(result);
    } catch (error) {
      // Record failure but continue processing others
      results.push({
        outreachId: outreach.id,
        success: false,
        channel: outreach.selectedChannel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Dispatch a single outreach record based on its channel.
 */
export async function dispatchSingleOutreach(
  outreach: ProviderOutreach
): Promise<DispatchResult> {
  const { id, selectedChannel, candidateEmail, candidatePhone, candidateInstagram } = outreach;

  // Get the contact value for the selected channel
  let contactValue: string | null = null;
  switch (selectedChannel) {
    case 'email':
      contactValue = candidateEmail;
      break;
    case 'phone':
      contactValue = candidatePhone;
      break;
    case 'instagram':
      contactValue = candidateInstagram;
      break;
  }

  // Validate contact exists for channel
  if (!contactValue) {
    await recordDispatchAttempt(id, false, `No valid contact for ${selectedChannel} channel`);
    return {
      outreachId: id,
      success: false,
      channel: selectedChannel,
      error: `No valid contact for ${selectedChannel} channel`,
    };
  }

  // Dispatch based on channel
  if (selectedChannel === 'email') {
    return await dispatchEmail(outreach, contactValue);
  } else {
    // Phone and Instagram create manual tasks
    return await createManualTask(outreach, selectedChannel, contactValue);
  }
}

/**
 * Dispatch email outreach.
 */
async function dispatchEmail(
  outreach: ProviderOutreach,
  email: string
): Promise<DispatchResult> {
  const { id, providerId, language } = outreach;

  try {
    // Create token for landing page link
    const { rawToken } = await createOutreachToken({
      providerId,
      outreachId: id,
      providerName: 'Provider', // Will be populated from DB in real implementation
      actionScope: 'decision',
    });

    // Build the landing page URL
    const tokenUrl = buildOutreachTokenUrl(getBaseUrl(), rawToken);

    // Send the email
    const result = await sendProviderOutreachEmail({
      to: email,
      language: language as 'de' | 'en',
      tokenUrl,
      providerName: 'Your business', // Placeholder - will be populated from DB
    });

    // Record result
    if (result.success) {
      await recordDispatchAttempt(id, true);
      return {
        outreachId: id,
        success: true,
        channel: 'email',
      };
    } else {
      await recordDispatchAttempt(id, false, result.error);
      return {
        outreachId: id,
        success: false,
        channel: 'email',
        error: result.error,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Email dispatch failed';
    await recordDispatchAttempt(id, false, errorMessage);
    return {
      outreachId: id,
      success: false,
      channel: 'email',
      error: errorMessage,
    };
  }
}

/**
 * Create a manual outreach task for phone/Instagram.
 */
async function createManualTask(
  outreach: ProviderOutreach,
  channel: OutreachChannel,
  contactValue: string
): Promise<DispatchResult> {
  try {
    await createOutreachTask({
      providerId: outreach.providerId,
      outreachId: outreach.id,
      channel,
      contactValue,
    });

    // Record as successful dispatch (task created)
    await recordDispatchAttempt(outreach.id, true);

    return {
      outreachId: outreach.id,
      success: true,
      channel,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Task creation failed';
    await recordDispatchAttempt(outreach.id, false, errorMessage);
    return {
      outreachId: outreach.id,
      success: false,
      channel,
      error: errorMessage,
    };
  }
}
