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
vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
}));
vi.mock('@/services/admin/halal-gate', () => ({
  checkHalalAttestation: vi.fn(),
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

import { PATCH } from '@/app/api/admin/review-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderReview } from '@/services/admin/providers';
import { checkHalalAttestation } from '@/services/admin/halal-gate';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockReview = updateProviderReview as ReturnType<typeof vi.fn>;
const mockHalalCheck = checkHalalAttestation as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/review-provider', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/review-provider — halal attestation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'approved',
      review_feedback: null,
    });
    // Default: all attested (non-food providers or fully attested food providers)
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      missingLabels: [],
      sourceTable: null,
    });
  });

  it('approves a food provider when all attestations are present', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      missingLabels: [],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, reviewStatus: 'approved' }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalled();
  });

  it('returns 422 when approving a food provider missing attestations', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol', 'no_pork'],
      missingLabels: ['Kein Alkohol', 'Kein verbotenes Fleisch'],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, reviewStatus: 'approved' }));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('halal attestation incomplete');
    expect(json.error).toContain('Kein Alkohol');
    expect(json.error).toContain('Kein verbotenes Fleisch');
    // updateProviderReview must NOT have been called
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('approves a non-food provider without checking attestation (gate skipped)', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      missingLabels: [],
      sourceTable: null,
    });

    const res = await PATCH(makeRequest({ providerId: validId, reviewStatus: 'approved' }));

    expect(res.status).toBe(200);
    // checkHalalAttestation is still called, but returns allAttested: true for non-food
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalled();
  });

  it('rejects a food provider without attestations (gate only blocks approval)', async () => {
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'rejected',
      review_feedback: 'Not halal compliant',
    });

    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'rejected',
        reviewFeedback: 'Not halal compliant',
      }),
    );

    expect(res.status).toBe(200);
    // Gate should NOT be checked for rejections
    expect(mockHalalCheck).not.toHaveBeenCalled();
    expect(mockReview).toHaveBeenCalled();
  });

  it('sets needs_revision without checking attestation gate', async () => {
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'needs_revision',
      review_feedback: 'Please fix images',
    });

    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'needs_revision',
        reviewFeedback: 'Please fix images',
      }),
    );

    expect(res.status).toBe(200);
    expect(mockHalalCheck).not.toHaveBeenCalled();
    expect(mockReview).toHaveBeenCalled();
  });

  it('returns 422 with all three missing attestations listed', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol', 'no_pork', 'no_gambling'],
      missingLabels: ['Kein Alkohol', 'Kein verbotenes Fleisch', 'Kein Glücksspiel'],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, reviewStatus: 'approved' }));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('Kein Alkohol');
    expect(json.error).toContain('Kein verbotenes Fleisch');
    expect(json.error).toContain('Kein Glücksspiel');
  });
});
