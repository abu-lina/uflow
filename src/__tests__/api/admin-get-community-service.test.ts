import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/communityServices', () => ({
  getCommunityServiceForAdmin: vi.fn(),
}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  getRequestMetadata: vi.fn(() => ({})),
}));

import { GET } from '@/app/api/admin/community-services/[id]/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { getCommunityServiceForAdmin } from '@/services/admin/communityServices';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockGetCS = getCommunityServiceForAdmin as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(id: string): [Request, { params: Promise<{ id: string }> }] {
  const req = new Request(`http://localhost:3000/api/admin/community-services/${id}`);
  return [req, { params: Promise.resolve({ id }) }];
}

describe('GET /api/admin/community-services/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockGetCS.mockResolvedValue({
      community_service_id: validId,
      community_service_name: 'Test CS',
      review_status: 'pending',
    });
  });

  it('[post-fix PASSES] returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue(null);
    const [req, ctx] = makeRequest(validId);
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it('[post-fix PASSES] returns 403 when not admin/moderator', async () => {
    mockIsAdmin.mockResolvedValue(false);
    const [req, ctx] = makeRequest(validId);
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  it('[post-fix PASSES] returns 400 for invalid UUID', async () => {
    const [req, ctx] = makeRequest('not-a-uuid');
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid/);
  });

  it('[post-fix PASSES] returns 404 when community service not found', async () => {
    mockGetCS.mockResolvedValue(null);
    const [req, ctx] = makeRequest(validId);
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('[post-fix PASSES] returns 200 with data for valid admin request', async () => {
    const [req, ctx] = makeRequest(validId);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ community_service_id: validId });
  });
});
