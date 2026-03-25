import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

vi.mock('@/services/admin/providerEdit', () => ({
  updateProviderFields: vi.fn(),
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

// Mock the validation schema — return parsed data as-is with uuid check
vi.mock('@/lib/validations/adminSchemas', () => ({
  providerEditUpdateSchema: {
    parse: (data: Record<string, unknown>) => {
      if (!data.providerId || typeof data.providerId !== 'string') {
        throw new Error('Invalid provider ID format');
      }
      // Simple UUID format check
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(data.providerId as string)) {
        throw new Error('Invalid provider ID format');
      }
      return data;
    },
  },
}));

import { PATCH } from '@/app/api/admin/edit-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderFields } from '@/services/admin/providerEdit';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdateProviderFields = updateProviderFields as ReturnType<typeof vi.fn>;

function createRequest(body: Record<string, unknown>, method = 'PATCH'): Request {
  return new Request('http://localhost:3000/api/admin/edit-provider', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/edit-provider', () => {
  const adminUser = { id: 'admin-user-id', email: 'admin@example.com' };
  const validBody = {
    providerId: '123e4567-e89b-12d3-a456-426614174000',
    providerName: 'Updated Provider',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(adminUser);
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockUpdateProviderFields.mockResolvedValue({
      provider_id: validBody.providerId,
      provider_name: validBody.providerName,
      review_status: 'pending',
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);

    const response = await PATCH(createRequest(validBody));
    expect(response.status).toBe(401);

    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not admin or moderator', async () => {
    mockIsAdminOrModerator.mockResolvedValue(false);

    const response = await PATCH(createRequest(validBody));
    expect(response.status).toBe(403);

    const json = await response.json();
    expect(json.error).toMatch(/Forbidden/);
  });

  it('returns 400 when providerId is missing', async () => {
    const response = await PATCH(createRequest({ providerName: 'Test' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when providerId is not a valid UUID', async () => {
    const response = await PATCH(createRequest({ providerId: 'not-a-uuid', providerName: 'Test' }));
    expect(response.status).toBe(400);
  });

  it('returns 200 on successful admin edit', async () => {
    const response = await PATCH(createRequest(validBody));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.provider_id).toBe(validBody.providerId);
    expect(json.data.provider_name).toBe(validBody.providerName);
  });

  it('calls updateProviderFields with correct arguments', async () => {
    await PATCH(createRequest(validBody));

    expect(mockUpdateProviderFields).toHaveBeenCalledWith(
      validBody.providerId,
      expect.objectContaining({ providerName: validBody.providerName }),
      adminUser.id
    );
  });

  it('logs admin edit action for audit', async () => {
    const { logAdminAction } = await import('@/lib/audit/adminAudit');
    const mockLogAdminAction = logAdminAction as ReturnType<typeof vi.fn>;

    await PATCH(createRequest(validBody));

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      adminUser.id,
      'provider_edit',
      'provider',
      validBody.providerId,
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('returns 409 on concurrency conflict', async () => {
    mockUpdateProviderFields.mockRejectedValue(new Error('CONFLICT: Provider was modified'));

    const response = await PATCH(createRequest(validBody));
    expect(response.status).toBe(409);
  });

  it('returns 500 on unexpected error', async () => {
    mockUpdateProviderFields.mockRejectedValue(new Error('Unexpected DB failure'));

    const response = await PATCH(createRequest(validBody));
    expect(response.status).toBe(500);
  });
});
