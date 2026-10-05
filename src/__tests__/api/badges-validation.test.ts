// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: 'admin' }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/services/badges', () => ({
  verifyBadge: vi.fn(),
  unverifyBadge: vi.fn(),
}));

import { POST as verifyPOST } from '@/app/api/admin/badges/verify/route';
import { POST as unverifyPOST } from '@/app/api/admin/badges/unverify/route';

function makeRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/badges/verify', () => {
  it('returns 400 with mapped { path, message } details for an invalid badgeId', async () => {
    const response = await verifyPOST(
      makeRequest('http://localhost/api/admin/badges/verify', { badgeId: 'not-a-uuid' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Validation failed',
      details: [{ path: 'badgeId', message: 'Invalid badge ID format' }],
    });
  });
});

describe('POST /api/admin/badges/unverify', () => {
  it('returns 400 with mapped { path, message } details for an invalid badgeId', async () => {
    const response = await unverifyPOST(
      makeRequest('http://localhost/api/admin/badges/unverify', { badgeId: 'not-a-uuid' }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Validation failed',
      details: [{ path: 'badgeId', message: 'Invalid badge ID format' }],
    });
  });
});
