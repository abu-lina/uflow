import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUserFromCookie,
  mockIsAdminOrModerator,
  mockWarn,
  mockError,
  mockInfo,
  mockGetRequestMetadata,
  mockLogAdminAction,
  mockGetClientIp,
  mockGetUserAgent,
  mockAdminReviewPerHour,
  mockAdminReviewPerMinute,
  mockGetClientIdentifier,
  mockOffersSelect,
  mockOffersInsertSingle,
  mockNeedsSelect,
  mockNeedsInsertSingle,
} = vi.hoisted(() => ({
  mockGetUserFromCookie: vi.fn(),
  mockIsAdminOrModerator: vi.fn(),
  mockWarn: vi.fn(),
  mockError: vi.fn(),
  mockInfo: vi.fn(),
  mockGetRequestMetadata: vi.fn(() => ({})),
  mockLogAdminAction: vi.fn(),
  mockGetClientIp: vi.fn(() => '127.0.0.1'),
  mockGetUserAgent: vi.fn(() => 'test-agent'),
  mockAdminReviewPerHour: vi.fn(() => true),
  mockAdminReviewPerMinute: vi.fn(() => true),
  mockGetClientIdentifier: vi.fn(() => 'user:test-admin'),
  mockOffersSelect: vi.fn(),
  mockOffersInsertSingle: vi.fn(),
  mockNeedsSelect: vi.fn(),
  mockNeedsInsertSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUserFromCookie,
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: mockIsAdminOrModerator,
}));

vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: {
    warn: mockWarn,
    error: mockError,
    info: mockInfo,
  },
  getRequestMetadata: mockGetRequestMetadata,
}));

vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: mockLogAdminAction,
  getClientIp: mockGetClientIp,
  getUserAgent: mockGetUserAgent,
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    adminReview: {
      perHour: mockAdminReviewPerHour,
      perMinute: mockAdminReviewPerMinute,
    },
  },
  getClientIdentifier: mockGetClientIdentifier,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'offers') {
        return {
          select: mockOffersSelect,
          insert: () => ({
            select: () => ({
              single: mockOffersInsertSingle,
            }),
          }),
        };
      }

      if (table === 'needs') {
        return {
          select: mockNeedsSelect,
          insert: () => ({
            select: () => ({
              single: mockNeedsInsertSingle,
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

import { POST as postAdminOffer } from '@/app/api/admin/offers/route';
import { POST as postAdminNeed } from '@/app/api/admin/needs/route';

function createJsonRequest(body: Record<string, unknown>, url: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin taxonomy create APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-user-id', email: 'admin@example.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockOffersSelect.mockResolvedValue({ data: [], error: null });
    mockNeedsSelect.mockResolvedValue({ data: [], error: null });
    mockOffersInsertSingle.mockResolvedValue({
      data: { offer_id: 'offer-1', name_de: 'Baguette' },
      error: null,
    });
    mockNeedsInsertSingle.mockResolvedValue({
      data: { need_id: 'need-1', name_de: 'Volunteers' },
      error: null,
    });
  });

  it('creates offers through the admin server boundary', async () => {
    const response = await postAdminOffer(createJsonRequest({ name: 'Baguette' }, 'http://localhost/api/admin/offers'));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data).toEqual({ offer_id: 'offer-1', name_de: 'Baguette' });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'admin-user-id',
      'offer_create',
      'system',
      'offer-1',
      expect.objectContaining({ name_de: 'Baguette' }),
      expect.any(Object)
    );
  });

  it('rejects duplicate offer names with a clear message', async () => {
    mockOffersSelect.mockResolvedValue({ data: [{ name_de: 'Baguette' }], error: null });

    const response = await postAdminOffer(createJsonRequest({ name: 'Baguette' }, 'http://localhost/api/admin/offers'));

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.error).toBe('An entry with this name already exists');
  });

  it('creates needs through the admin server boundary', async () => {
    const response = await postAdminNeed(createJsonRequest({ name: 'Volunteers' }, 'http://localhost/api/admin/needs'));

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data).toEqual({ need_id: 'need-1', name_de: 'Volunteers' });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'admin-user-id',
      'need_create',
      'system',
      'need-1',
      expect.objectContaining({ name_de: 'Volunteers' }),
      expect.any(Object)
    );
  });
});