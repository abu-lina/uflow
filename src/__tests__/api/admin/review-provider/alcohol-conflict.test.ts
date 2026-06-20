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
  checkMenuForAlcohol: vi.fn(),
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
import { checkMenuForAlcohol } from '@/services/admin/enrichment-gate';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdateProviderReview = updateProviderReview as ReturnType<typeof vi.fn>;
const mockCheckMenuForAlcohol = checkMenuForAlcohol as ReturnType<typeof vi.fn>;

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

describe('PATCH /api/admin/review-provider — Plan 193 menu alcohol check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(ADMIN_USER);
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockUpdateProviderReview.mockResolvedValue(PROVIDER_RESPONSE);
    mockCheckMenuForAlcohol.mockResolvedValue({
      hasAlcohol: false,
      matchedItemNames: [],
      matchedKeywords: [],
      totalMenuItems: 0,
    });
  });

  it('approves provider when menu has no alcohol', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    })) as Response;

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.review_status).toBe('approved');
    expect(mockCheckMenuForAlcohol).toHaveBeenCalledWith(VALID_ID);
  });

  it('returns 409 when menu contains alcohol keywords', async () => {
    mockCheckMenuForAlcohol.mockResolvedValue({
      hasAlcohol: true,
      matchedItemNames: ['Bier 0,5l', 'Wein Rot'],
      matchedKeywords: ['Bier', 'Wein'],
      totalMenuItems: 5,
    });

    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    })) as Response;

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.code).toBe('MENU_ALCOHOL_DETECTED');
    expect(json.error).toContain('alcohol keywords');
    expect(json.menuCheck.hasAlcohol).toBe(true);
    expect(json.menuCheck.matchedItemNames).toContain('Bier 0,5l');
    expect(json.menuCheck.matchedKeywords).toContain('Bier');
    expect(mockUpdateProviderReview).not.toHaveBeenCalled();
  });

  it('bypasses alcohol check when rejecting a provider', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'rejected',
      reviewFeedback: 'No halal certificate',
    })) as Response;

    expect(response.status).toBe(200);
    expect(mockCheckMenuForAlcohol).not.toHaveBeenCalled();
    expect(mockUpdateProviderReview).toHaveBeenCalled();
  });

  it('bypasses alcohol check when marking needs_revision', async () => {
    const response = await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'needs_revision',
    })) as Response;

    expect(response.status).toBe(200);
    expect(mockCheckMenuForAlcohol).not.toHaveBeenCalled();
    expect(mockUpdateProviderReview).toHaveBeenCalled();
  });

  it('logs warning when blocking approval due to menu alcohol', async () => {
    mockCheckMenuForAlcohol.mockResolvedValue({
      hasAlcohol: true,
      matchedItemNames: ['Bier'],
      matchedKeywords: ['Bier'],
      totalMenuItems: 3,
    });

    await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    }));

    const { logger: mockedLogger } = await import('@/lib/logging/structuredLogger');
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Provider approval blocked — enriched menu contains alcohol keywords',
      expect.objectContaining({
        providerId: VALID_ID,
        userId: ADMIN_USER.id,
      }),
      expect.any(Object)
    );
  });

  it('does not call updateProviderReview when blocked', async () => {
    mockCheckMenuForAlcohol.mockResolvedValue({
      hasAlcohol: true,
      matchedItemNames: ['Bier'],
      matchedKeywords: ['Bier'],
      totalMenuItems: 3,
    });

    await PATCH(createPatchRequest({
      providerId: VALID_ID,
      reviewStatus: 'approved',
    }));

    expect(mockUpdateProviderReview).not.toHaveBeenCalled();
  });
});
