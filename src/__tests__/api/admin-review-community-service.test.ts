import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/communityServices', () => ({
  updateCommunityServiceReview: vi.fn(),
}));
vi.mock('@/lib/validations/adminSchemas', () => ({
  communityServiceReviewUpdateSchema: {
    parse: (data: Record<string, unknown>) => {
      const id = data.communityServiceId;
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid community service ID format');
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id as string)) {
        throw new Error('Invalid community service ID format');
      }
      const validStatuses = ['approved', 'rejected', 'needs_revision'];
      if (!validStatuses.includes(data.reviewStatus as string)) {
        throw new Error('reviewStatus must be one of: approved, rejected, needs_revision');
      }
      if (data.reviewStatus === 'rejected') {
        const feedback = data.reviewFeedback;
        if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
          throw new Error('Rejection reason is required.');
        }
      }
      return data;
    },
  },
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

// TDD: this route does not exist yet — import MUST fail until implemented
import { PATCH } from '@/app/api/admin/review-community-service/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateCommunityServiceReview } from '@/services/admin/communityServices';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockReview = updateCommunityServiceReview as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/review-community-service', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/review-community-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockReview.mockResolvedValue({
      community_service_id: validId,
      review_status: 'approved',
      updated_at: new Date().toISOString(),
    });
  });

  it('[TDD RED] returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ communityServiceId: validId, reviewStatus: 'approved' }));
    expect(res.status).toBe(401);
  });

  it('[TDD RED] returns 403 when not admin/moderator', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ communityServiceId: validId, reviewStatus: 'approved' }));
    expect(res.status).toBe(403);
  });

  it('[TDD RED] returns 400 when communityServiceId is missing', async () => {
    const res = await PATCH(makeRequest({ reviewStatus: 'approved' }));
    expect(res.status).toBe(400);
  });

  it('[TDD RED] returns 400 when reviewStatus is invalid', async () => {
    const res = await PATCH(
      makeRequest({ communityServiceId: validId, reviewStatus: 'invalid_status' }),
    );
    expect(res.status).toBe(400);
  });

  it('[TDD RED] returns 400 when rejecting without feedback', async () => {
    const res = await PATCH(
      makeRequest({ communityServiceId: validId, reviewStatus: 'rejected' }),
    );
    expect(res.status).toBe(400);
  });

  it('[TDD RED] returns 200 for valid approve', async () => {
    const res = await PATCH(
      makeRequest({ communityServiceId: validId, reviewStatus: 'approved' }),
    );
    expect(res.status).toBe(200);
    expect(mockReview).toHaveBeenCalledWith(validId, 'approved', null, 'admin-id');
  });

  it('[TDD RED] returns 200 for valid reject with feedback', async () => {
    mockReview.mockResolvedValue({
      community_service_id: validId,
      review_status: 'rejected',
      review_feedback: 'reason',
    });

    const res = await PATCH(
      makeRequest({
        communityServiceId: validId,
        reviewStatus: 'rejected',
        reviewFeedback: 'reason',
      }),
    );
    expect(res.status).toBe(200);
    expect(mockReview).toHaveBeenCalledWith(validId, 'rejected', 'reason', 'admin-id');
  });
});
