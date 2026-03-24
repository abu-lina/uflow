/**
 * Tests for POST /api/admin/import-joinhalal/dry-run
 *
 * Written FIRST (TDD Red → Green → Refactor).
 * Tests cover: auth rejection, authorization, input validation, response shape.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock getUserFromCookie — injected per-test
const mockGetUserFromCookie = vi.fn();
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: () => mockGetUserFromCookie(),
}));

// Mock isAdminOrModerator — injected per-test
const mockIsAdminOrModerator = vi.fn();
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: (id: string) => mockIsAdminOrModerator(id),
}));

// Mock runJoinHalalDryRun — inject controlled dry-run results
const mockRunDryRun = vi.fn();
vi.mock('@/lib/import/joinhalal', async (original) => {
  const mod = await original<typeof import('@/lib/import/joinhalal')>();
  return {
    ...mod,
    runJoinHalalDryRun: (opts: unknown) => mockRunDryRun(opts),
  };
});

// Mock Supabase service-role client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/import-joinhalal/dry-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_DRY_RUN_RESULT = {
  stats: {
    total: 10,
    parsed: 8,
    mapped: 6,
    unmapped: 2,
    skipped: 1,
    failed: 2,
    wouldInsert: 5,
  },
  unmappedGroups: [{ sourceCategory: 'pizza', count: 2, example: 'Pizza Roma' }],
  samples: [
    {
      provider_name: 'Test Restaurant',
      address_city: 'Berlin',
      category_id: 'cat-001',
      address_street: 'Hauptstraße 1',
      social_website: null,
      contact_email: null,
    },
  ],
};

// ---------------------------------------------------------------------------
// The route handler is lazy-imported after mocks are set up
// ---------------------------------------------------------------------------

async function getHandler() {
  const { POST } = await import('@/app/api/admin/import-joinhalal/dry-run/route');
  return POST;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/import-joinhalal/dry-run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 10 }));
    expect(resp.status).toBe(401);
    const data = await resp.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 403 when user is not admin or moderator', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'user-123', email: 'user@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(false);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 10 }));
    expect(resp.status).toBe(403);
    const data = await resp.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when limit is missing', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    const POST = await getHandler();

    const resp = await POST(makeRequest({}));
    expect(resp.status).toBe(400);
    const data = await resp.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when limit is an invalid value', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 999 }));
    expect(resp.status).toBe(400);
  });

  it('returns 400 when limit is an arbitrary string', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 'everything' }));
    expect(resp.status).toBe(400);
  });

  it('returns 200 with DryRunResult for valid limit 10', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockResolvedValue(MOCK_DRY_RUN_RESULT);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 10 }));
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('unmappedGroups');
    expect(data).toHaveProperty('samples');
    expect(data.stats).toMatchObject({ total: 10, wouldInsert: 5 });
  });

  it('returns 200 with DryRunResult for limit "all"', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockResolvedValue(MOCK_DRY_RUN_RESULT);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 'all' }));
    expect(resp.status).toBe(200);
  });

  it('returns 200 for valid limits 50 and 100', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockResolvedValue(MOCK_DRY_RUN_RESULT);
    const POST = await getHandler();

    for (const limit of [50, 100]) {
      const resp = await POST(makeRequest({ limit }));
      expect(resp.status).toBe(200);
    }
  });

  it('passes the correct limit to runJoinHalalDryRun', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockResolvedValue(MOCK_DRY_RUN_RESULT);
    const POST = await getHandler();

    await POST(makeRequest({ limit: 50 }));
    expect(mockRunDryRun).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('returns 500 when runJoinHalalDryRun throws', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockRejectedValue(new Error('Sitemap unavailable'));
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 10 }));
    expect(resp.status).toBe(500);
    const data = await resp.json();
    expect(data).toHaveProperty('error');
  });

  it('does not expose service-role keys in the response', async () => {
    mockGetUserFromCookie.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' });
    mockIsAdminOrModerator.mockResolvedValue(true);
    mockRunDryRun.mockResolvedValue(MOCK_DRY_RUN_RESULT);
    const POST = await getHandler();

    const resp = await POST(makeRequest({ limit: 10 }));
    const text = await resp.text();
    expect(text).not.toContain('service-role');
    expect(text).not.toContain('SERVICE_ROLE');
    expect(text).not.toContain('mock-service-key');
  });
});
