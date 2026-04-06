import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/communityServices', () => ({
  updateCommunityServiceFields: vi.fn(),
}));
vi.mock('@/lib/validations/adminSchemas', () => ({
  communityServiceEditUpdateSchema: {
    parse: (data: Record<string, unknown>) => {
      const id = data.communityServiceId;
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid community service ID format');
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id as string)) {
        throw new Error('Invalid community service ID format');
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

import { PATCH } from '@/app/api/admin/edit-community-service/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateCommunityServiceFields } from '@/services/admin/communityServices';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdate = updateCommunityServiceFields as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';
const validBody = { communityServiceId: validId, communityServiceName: 'Updated Name' };

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/edit-community-service', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/edit-community-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({
      community_service_id: validId,
      community_service_name: 'Updated Name',
      review_status: 'pending',
      updated_at: new Date().toISOString(),
    });
  });

  it('[post-fix PASSES] returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await PATCH(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('[post-fix PASSES] returns 403 when not admin/moderator', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('[post-fix PASSES] returns 400 when communityServiceId is missing', async () => {
    const res = await PATCH(makeRequest({ communityServiceName: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('[post-fix PASSES] returns 400 when communityServiceId is not a valid UUID', async () => {
    const res = await PATCH(makeRequest({ communityServiceId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('[post-fix PASSES] returns 200 and calls update service on success', async () => {
    const res = await PATCH(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      validId,
      expect.objectContaining({ communityServiceName: 'Updated Name' }),
      'admin-id',
    );
  });
});
