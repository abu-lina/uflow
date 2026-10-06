import { describe, it, expect, vi, beforeEach } from 'vitest';

import { updateProviderReview } from '../providers';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    rpc: mockRpc,
  }),
}));

const PROVIDER_ID = '123e4567-e89b-12d3-a456-426614174000';
const REVIEWER_ID = 'admin-user-id';

describe('updateProviderReview — admin_review_provider RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: { provider_id: PROVIDER_ID, review_status: 'approved' },
      error: null,
    });
  });

  it('calls the RPC with the reviewer id and snake_case halal payload', async () => {
    await updateProviderReview(PROVIDER_ID, 'approved', null, undefined, REVIEWER_ID, {
      noAlcohol: true,
      noPork: true,
      noGambling: true,
      verificationMethod: 'onsite',
      hasCertificate: true,
      certificateUrl: 'https://example.com/cert.pdf',
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('admin_review_provider', {
      p_provider_id: PROVIDER_ID,
      p_review_status: 'approved',
      p_review_feedback: null,
      p_reviewer_id: REVIEWER_ID,
      p_expected_updated_at: null,
      p_halal: {
        no_alcohol: true,
        no_pork: true,
        no_gambling: true,
        verification_method: 'onsite',
        has_certificate: true,
        certificate_url: 'https://example.com/cert.pdf',
      },
    });
  });

  it('passes an explicit null answer through as JSON null, not false (tri-state)', async () => {
    await updateProviderReview(PROVIDER_ID, 'approved', null, undefined, REVIEWER_ID, {
      noAlcohol: null,
      noPork: true,
      noGambling: false,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'admin_review_provider',
      expect.objectContaining({
        p_halal: { no_alcohol: null, no_pork: true, no_gambling: false },
      }),
    );
  });

  it('sends p_halal null when no answers are given (list path stays untouched)', async () => {
    await updateProviderReview(PROVIDER_ID, 'approved');

    expect(mockRpc).toHaveBeenCalledWith(
      'admin_review_provider',
      expect.objectContaining({ p_halal: null, p_reviewer_id: null }),
    );
  });

  it('omits absent halal keys so they cannot clobber stored values', async () => {
    await updateProviderReview(PROVIDER_ID, 'approved', null, undefined, REVIEWER_ID, {
      noGambling: true,
    });

    const halal = mockRpc.mock.calls[0][1].p_halal;
    expect(halal).toEqual({ no_gambling: true });
    expect('no_alcohol' in halal).toBe(false);
  });

  it('forwards expectedUpdatedAt for optimistic concurrency', async () => {
    await updateProviderReview(
      PROVIDER_ID,
      'rejected',
      'reason',
      '2025-01-01T00:00:00Z',
      REVIEWER_ID,
    );

    expect(mockRpc).toHaveBeenCalledWith(
      'admin_review_provider',
      expect.objectContaining({ p_expected_updated_at: '2025-01-01T00:00:00Z' }),
    );
  });

  it('rethrows CONFLICT errors with the CONFLICT: prefix for the 409 mapping', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'CONFLICT: Provider was modified by another reviewer. Please refresh and try again.',
      },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved', null, 'stale-ts')).rejects.toThrow(
      /^CONFLICT:/,
    );
  });

  it('rethrows HALAL_GATE errors with the HALAL_GATE: prefix for the 422 mapping', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'HALAL_GATE: denied=[no_alcohol], unanswered=[]' },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(/^HALAL_GATE:/);
  });

  it('rethrows NOT_FOUND errors with the NOT_FOUND: prefix for the 404 mapping', async () => {
    // Not-found is not a conflict: it must not surface as 409 (#548 review).
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'NOT_FOUND: Provider 123e4567-e89b-12d3-a456-426614174000 does not exist',
      },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved', null, 'stale-ts')).rejects.toThrow(
      /^NOT_FOUND:/,
    );
  });

  it('rethrows FORBIDDEN errors with the FORBIDDEN: prefix for the 403 mapping', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'FORBIDDEN: reviewer abc is not an admin or moderator' },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(/^FORBIDDEN:/);
  });

  it('fails fast with a MISCONFIGURED signal when the RPC is missing from the schema cache', async () => {
    // Deploy-ordering guard (#548): migration 138 creates
    // admin_review_provider, which is now the ONLY review write path (halal
    // footer, provider-list buttons, edit-provider auto-reject). If code
    // ships ahead of the migration, PostgREST answers PGRST202 — surface an
    // explicit, self-diagnosing signal instead of an opaque PostgREST error.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST202',
        message:
          'Could not find the function public.admin_review_provider(p_expected_updated_at, p_halal, p_provider_id, p_review_feedback, p_review_status, p_reviewer_id) in the schema cache',
        details: null,
        hint: null,
      },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(/^MISCONFIGURED:/);
    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(/migration 138/);
    // The diagnosis is logged server-side with the PostgREST detail.
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('admin_review_provider'),
      expect.objectContaining({ code: 'PGRST202' }),
    );
    consoleSpy.mockRestore();
  });

  it('also fails fast on a raw undefined_function (42883) error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: '42883',
        message: 'function public.admin_review_provider(...) does not exist',
      },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(
      /^MISCONFIGURED:.*migration 138/,
    );
  });

  it('wraps other RPC failures in the existing message shape', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'provider gone' },
    });

    await expect(updateProviderReview(PROVIDER_ID, 'approved')).rejects.toThrow(
      'Failed to update provider review: provider gone',
    );
  });

  it('sanitizes review feedback before it reaches the RPC', async () => {
    await updateProviderReview(
      PROVIDER_ID,
      'rejected',
      '<script>alert(1)</script>bad venue',
      undefined,
      REVIEWER_ID,
    );

    const feedback = mockRpc.mock.calls[0][1].p_review_feedback;
    expect(feedback).not.toContain('<script>');
    expect(feedback).toContain('bad venue');
  });
});
