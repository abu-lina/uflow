import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

vi.mock('@/services/admin/providers', () => ({
  deleteProvider: vi.fn(),
  getProviderForAdmin: vi.fn(),
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

import { DELETE } from '@/app/api/admin/providers/[id]/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { deleteProvider } from '@/services/admin/providers';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockDeleteProvider = deleteProvider as ReturnType<typeof vi.fn>;

function createRequest(url: string): Request {
  return new Request(url, { method: 'DELETE' });
}

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };

describe('DELETE /api/admin/providers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(ADMIN_USER);
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockDeleteProvider.mockResolvedValue(undefined);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);

    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin/moderator', async () => {
    mockIsAdminOrModerator.mockResolvedValue(false);

    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toMatch(/Forbidden/);
  });

  it('returns 429 when rate limited', async () => {
    const { rateLimiters: mockedRateLimiters } = await import('@/lib/rate-limit');
    const mockPerHour = mockedRateLimiters.adminReview.perHour as ReturnType<typeof vi.fn>;
    mockPerHour.mockReturnValueOnce(false);

    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.error).toMatch(/Too many requests/);
  });

  it('returns 400 for invalid UUID path param', async () => {
    const response = await DELETE(
      createRequest('http://localhost/api/admin/providers/bad-id'),
      { params: Promise.resolve({ id: 'bad-id' }) }
    );
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('Invalid provider ID');
  });

  it('returns 200 on successful delete', async () => {
    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data).toEqual({ deleted: true });
  });

  it('calls deleteProvider with the correct ID', async () => {
    await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );

    expect(mockDeleteProvider).toHaveBeenCalledWith(VALID_ID);
  });

  it('logs admin action on successful delete', async () => {
    const { logAdminAction } = await import('@/lib/audit/adminAudit');
    const mockLogAdminAction = logAdminAction as ReturnType<typeof vi.fn>;

    await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      ADMIN_USER.id,
      'provider_deleted',
      'provider',
      VALID_ID,
      { providerId: VALID_ID },
      expect.objectContaining({ ipAddress: '127.0.0.1', userAgent: 'test-agent' })
    );
  });

  it('returns 404 when provider is not found', async () => {
    mockDeleteProvider.mockRejectedValue(new Error('Provider not found'));

    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.error).toBe('Provider not found');
  });

  it('returns 500 on unexpected error', async () => {
    mockDeleteProvider.mockRejectedValue(new Error('Unexpected DB failure'));

    const response = await DELETE(
      createRequest(`http://localhost/api/admin/providers/${VALID_ID}`),
      { params: Promise.resolve({ id: VALID_ID }) }
    );
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error).toBe('Unexpected DB failure');
  });
});
