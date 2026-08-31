import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

import { GET } from '@/app/api/admin/providers/[id]/menu/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;

function createRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

describe('GET /api/admin/providers/[id]/menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(ADMIN_USER);
    mockIsAdminOrModerator.mockResolvedValue(true);

    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);

    const response = await GET(createRequest(`http://localhost/api/admin/providers/${VALID_ID}/menu`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin/moderator', async () => {
    mockIsAdminOrModerator.mockResolvedValue(false);

    const response = await GET(createRequest(`http://localhost/api/admin/providers/${VALID_ID}/menu`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 400 for invalid UUID', async () => {
    const response = await GET(createRequest('http://localhost/api/admin/providers/bad-id/menu'), {
      params: Promise.resolve({ id: 'bad-id' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns menu items ordered by sort_order', async () => {
    const mockItems = [
      { id: '1', name_de: 'Item 1', sort_order: 1, is_available: true },
      { id: '2', name_de: 'Item 2', sort_order: 2, is_available: false },
    ];
    mockOrder.mockResolvedValue({ data: mockItems, error: null });

    const response = await GET(createRequest(`http://localhost/api/admin/providers/${VALID_ID}/menu`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toHaveLength(2);

    expect(mockEq).toHaveBeenCalledWith('provider_id', VALID_ID);
    expect(mockOrder).toHaveBeenCalledWith('sort_order');
  });

  it('returns empty array when no menu items exist', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const response = await GET(createRequest(`http://localhost/api/admin/providers/${VALID_ID}/menu`), {
      params: Promise.resolve({ id: VALID_ID }),
    });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toEqual([]);
  });
});
