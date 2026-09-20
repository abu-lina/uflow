import { describe, it, expect, vi, beforeEach } from 'vitest';

// Global setup mocks zod — restore the real implementation for this test suite
vi.unmock('zod');

// Mock dependencies before imports
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/providerEdit', () => ({
  updateProviderFields: vi.fn(),
}));
vi.mock('@/services/admin/halal-gate', () => ({
  checkHalalAttestation: vi.fn(),
}));
vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
}));
vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  getRequestMetadata: vi.fn(() => ({})),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) },
  },
  getClientIdentifier: vi.fn(() => 'user:admin'),
}));

import { PATCH } from '@/app/api/admin/edit-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderFields } from '@/services/admin/providerEdit';
import { checkHalalAttestation } from '@/services/admin/halal-gate';
import { updateProviderReview } from '@/services/admin/providers';
import { logAdminAction } from '@/lib/audit/adminAudit';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdateFields = updateProviderFields as ReturnType<typeof vi.fn>;
const mockHalalCheck = checkHalalAttestation as ReturnType<typeof vi.fn>;
const mockReview = updateProviderReview as ReturnType<typeof vi.fn>;
const mockAudit = logAdminAction as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/edit-provider', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const allAttested = {
  allAttested: true,
  missing: [],
  missingLabels: [],
  sourceTable: 'food_providers' as const,
};

const notAttested = {
  allAttested: false,
  missing: ['no_alcohol', 'no_pork'],
  missingLabels: ['Kein Alkohol', 'Kein verbotenes Fleisch'],
  sourceTable: 'food_providers' as const,
};

describe('PATCH /api/admin/edit-provider — halal attestation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockUpdateFields.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'approved',
      updated_at: '2025-01-01T00:00:00Z',
    });
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'rejected',
      review_feedback: null,
    });
  });

  it('auto-rejects when attestation changes from complete to incomplete', async () => {
    // Before: all attested. After: not attested.
    mockHalalCheck
      .mockResolvedValueOnce(allAttested) // before
      .mockResolvedValueOnce(notAttested); // after

    const res = await PATCH(makeRequest({ providerId: validId, noAlcohol: false }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledTimes(2);
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      expect.stringContaining('Kein Alkohol'),
      '2025-01-01T00:00:00Z',
    );

    const json = await res.json();
    expect(json.data.review_status).toBe('rejected');
  });

  it('does NOT auto-approve when attestation becomes complete', async () => {
    // Before: not attested. After: all attested.
    mockHalalCheck
      .mockResolvedValueOnce(notAttested) // before
      .mockResolvedValueOnce(allAttested); // after

    const res = await PATCH(
      makeRequest({ providerId: validId, noAlcohol: true, noPork: true, noGambling: true }),
    );

    expect(res.status).toBe(200);
    // Gate ran but should NOT call updateProviderReview
    expect(mockHalalCheck).toHaveBeenCalledTimes(2);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('does nothing when attestation state does not change', async () => {
    // Before and after: both all attested (e.g. editing a name on a fully attested provider)
    mockHalalCheck.mockResolvedValue(allAttested);

    const res = await PATCH(
      makeRequest({ providerId: validId, noAlcohol: true, providerName: 'New Name' }),
    );

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledTimes(2);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('does not check halal gate when no halal fields are in the edit', async () => {
    const res = await PATCH(makeRequest({ providerId: validId, providerName: 'New Name' }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).not.toHaveBeenCalled();
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('logs audit entry with provider_review_rejected on auto-reject', async () => {
    mockHalalCheck.mockResolvedValueOnce(allAttested).mockResolvedValueOnce(notAttested);

    await PATCH(makeRequest({ providerId: validId, noAlcohol: false }));

    // Should have two audit calls: one for the review change, one for the edit
    const auditCalls = mockAudit.mock.calls;
    const reviewAudit = auditCalls.find(
      (call: unknown[]) => call[1] === 'provider_review_rejected',
    );
    expect(reviewAudit).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test assertion: reviewAudit is guaranteed by the expect above
    const call = reviewAudit!;
    expect(call[3]).toBe(validId);
    expect(call[4]).toEqual(
      expect.objectContaining({
        reviewStatus: 'rejected',
        trigger: 'halal_gate_auto',
      }),
    );
  });

  it('passes expectedUpdatedAt to updateProviderReview for concurrency safety', async () => {
    mockHalalCheck.mockResolvedValueOnce(allAttested).mockResolvedValueOnce(notAttested);

    await PATCH(makeRequest({ providerId: validId, noAlcohol: false }));

    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      expect.any(String),
      '2025-01-01T00:00:00Z', // expectedUpdatedAt from updatedProvider
    );
  });

  it('uses human-readable labels in rejection feedback', async () => {
    const allMissing = {
      allAttested: false,
      missing: ['no_alcohol', 'no_pork', 'no_gambling'],
      missingLabels: ['Kein Alkohol', 'Kein verbotenes Fleisch', 'Kein Glücksspiel'],
      sourceTable: 'food_providers' as const,
    };

    mockHalalCheck.mockResolvedValueOnce(allAttested).mockResolvedValueOnce(allMissing);

    await PATCH(makeRequest({ providerId: validId, noAlcohol: false }));

    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      'Halal-Attestierung unvollständig: Kein Alkohol, Kein verbotenes Fleisch, Kein Glücksspiel',
      expect.any(String),
    );
  });
});
