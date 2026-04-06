/**
 * TDD tests for GET /api/admin/community-services/[id] route
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
  getCommunityServiceForAdmin: vi.fn(),
}));

vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  getRequestMetadata: vi.fn(() => ({})),
}));

// Import route — will fail with ModuleNotFoundError before route file is created
import { GET } from '@/app/api/admin/community-services/[id]/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { getCommunityServiceForAdmin } from '@/services/admin/communityServiceEdit';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockGetCS = getCommunityServiceForAdmin as ReturnType<typeof vi.fn>;

const VALID_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const adminUser = { id: 'admin-id', email: 'admin@test.com' };

function makeRequest(id: string) {
  return new Request(`http://localhost:3000/api/admin/community-services/${id}`, { method: 'GET' });
}

describe('GET /api/admin/community-services/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await GET(makeRequest('not-a-uuid'), { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when community service not found', async () => {
    mockGetCS.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with data when found', async () => {
    const mockCS = { community_service_id: VALID_ID, community_service_name: 'Test' };
    mockGetCS.mockResolvedValue(mockCS);
    const res = await GET(makeRequest(VALID_ID), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(mockCS);
  });
});
