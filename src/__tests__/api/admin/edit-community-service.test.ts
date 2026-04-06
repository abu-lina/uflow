/**
 * TDD tests for PATCH /api/admin/edit-community-service route
 * Plan 083 — M1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

vi.mock('@/services/admin/communityServiceEdit', () => ({
  updateCommunityServiceFields: vi.fn(),
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
    adminReview: {
      perHour: vi.fn(() => true),
      perMinute: vi.fn(() => true),
    },
  },
  getClientIdentifier: vi.fn(() => 'user:admin'),
}));

vi.mock('@/lib/validations/adminSchemas', () => ({
  communityServiceEditUpdateSchema: {
    parse: (data: Record<string, unknown>) => {
      if (!data.communityServiceId || typeof data.communityServiceId !== 'string') {
        throw new Error('Invalid community service ID format');
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.communityServiceId as string)) {
        throw new Error('Invalid community service ID format');
      }
      return data;
    },
  },
}));

// Import after mocks — will fail with ModuleNotFoundError before route is created
import { PATCH } from '@/app/api/admin/edit-community-service/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateCommunityServiceFields } from '@/services/admin/communityServiceEdit';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdate = updateCommunityServiceFields as ReturnType<typeof vi.fn>;

const VALID_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const adminUser = { id: 'admin-id', email: 'admin@test.com' };

function makeRequest(body: Record<string, unknown>) {
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
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ communityServiceId: VALID_ID }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ communityServiceId: VALID_ID }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    const res = await PATCH(makeRequest({ communityServiceId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful update', async () => {
    const mockResult = {
      community_service_id: VALID_ID,
      community_service_name: 'Updated',
      review_status: 'pending',
      updated_at: new Date().toISOString(),
    };
    mockUpdate.mockResolvedValue(mockResult);
    const res = await PATCH(makeRequest({ communityServiceId: VALID_ID, serviceName: 'Updated' }));
    expect(res.status).toBe(200);
  });

  it('returns 409 on conflict', async () => {
    mockUpdate.mockRejectedValue(new Error('CONFLICT: modified by another reviewer'));
    const res = await PATCH(makeRequest({ communityServiceId: VALID_ID }));
    expect(res.status).toBe(409);
  });
});
