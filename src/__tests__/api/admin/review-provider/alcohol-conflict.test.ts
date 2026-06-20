import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the validation schema module to avoid zod import issue in test environment
vi.mock('@/lib/validations/adminSchemas', () => ({
  providerReviewUpdateSchema: {
    parse: vi.fn((data) => data),
  },
}));

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
}));

vi.mock('@/services/admin/enrichment-gate', () => ({
  checkEnrichmentAlcoholConflict: vi.fn(),
}));

vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));

vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  getRequestMetadata: vi.fn(() => ({})),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    adminReview: {
      perHour: vi.fn(() => true),
      perMinute: vi.fn(() => true),
    },
  },
  getClientIdentifier: vi.fn(() => 'user:test-admin'),
}));

import { PATCH } from '@/app/api/admin/review-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderReview } from '@/services/admin/providers';
import { checkEnrichmentAlcoholConflict } from '@/services/admin/enrichment-gate';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdateProviderReview = updateProviderReview as ReturnType<typeof vi.fn>;
const mockCheckEnrichmentAlcoholConflict = checkEnrichmentAlcoholConflict as ReturnType<typeof vi.fn>;

function createPatchRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/admin/review-provider', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const PROVIDER_RESPONSE = {
  provider_id: VALID_ID,
  provider_name: 'Test Provider',
  review_status: 'approved',
  review_feedback: null,
};

describe('PATCH /api/admin/review-provider — Plan 193 alcohol conflict gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(ADMIN_USER);
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockUpdateProviderReview.mockResolvedValue(PROVIDER_RESPONSE);
    mockCheckEnrichmentAlcoholConflict.mockResolvedValue({ hasConflict: false, conflicts: [] });
  });

  it('approves provider when no alcohol conflict exists', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    })) as Response;

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.review_status).toBe('approved');
    expect(mockCheckEnrichmentAlcoholConflict).toHaveBeenCalledWith(VALID_ID);
  });

  it('returns 409 when alcohol conflict exists', async () => {
    mockCheckEnrichmentAlcoholConflict.mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          candidateId: 'candidate-1',
          source: 'wolt',
          sourceUrl: 'https://wolt.com/venue/test',
          enrichedAt: '2026-06-20T10:00:00Z',
        },
      ],
    });

    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    })) as Response;

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.code).toBe('ALCOHOL_ENRICHMENT_CONFLICT');
    expect(json.error).toContain('Enrichment detected alcohol');
    expect(json.conflict.hasConflict).toBe(true);
    expect(json.conflict.conflicts).toHaveLength(1);
    expect(json.conflict.conflicts[0].source).toBe('wolt');
    expect(mockUpdateProviderReview).not.toHaveBeenCalled();
  });

  it('bypasses alcohol check when rejecting a provider', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'rejected',
      reviewFeedback: 'No halal certificate',
    })) as Response;

    expect(response.status).toBe(200);
    expect(mockCheckEnrichmentAlcoholConflict).not.toHaveBeenCalled();
    expect(mockUpdateProviderReview).toHaveBeenCalled();
  });

  it('bypasses alcohol check when marking needs_revision', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'needs_revision',
    })) as Response;

    expect(response.status).toBe(200);
    expect(mockCheckEnrichmentAlcoholConflict).not.toHaveBeenCalled();
    expect(mockUpdateProviderReview).toHaveBeenCalled();
  });

  it('logs warning when blocking approval due to alcohol conflict', async () => {
    mockCheckEnrichmentAlcoholConflict.mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          candidateId: 'candidate-1',
          source: 'wolt',
          sourceUrl: 'https://wolt.com/venue/test',
          enrichedAt: '2026-06-20T10:00:00Z',
        },
      ],
    });

    await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    }));

    const { logger: mockedLogger } = await import('@/lib/logging/structuredLogger');
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Provider approval blocked by enrichment alcohol conflict',
      expect.objectContaining({
        providerId: VALID_ID,
        userId: ADMIN_USER.id,
      }),
      expect.any(Object)
    );
  });

  it('does not call updateProviderReview when blocked by alcohol conflict', async () => {
    mockCheckEnrichmentAlcoholConflict.mockResolvedValue({
      hasConflict: true,
      conflicts: [{ candidateId: 'c-1', source: 'wolt', sourceUrl: null, enrichedAt: '' }],
    });

    await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    }));

    expect(mockUpdateProviderReview).not.toHaveBeenCalled();
  });
});
