// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetUserFromCookie, mockCreateProviderOrServiceServer } = vi.hoisted(() => ({
  mockGetUserFromCookie: vi.fn(),
  mockCreateProviderOrServiceServer: vi.fn(),
}));

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUserFromCookie,
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIdentifier: vi.fn(() => 'user:test-user'),
}));

vi.mock('@/features/providers/services/create-provider.server', () => ({
  createProviderOrServiceServer: mockCreateProviderOrServiceServer,
}));

import { POST } from '@/app/api/providers/route';

const VALID_BODY = {
  creationMode: 'recommendation',
  title: 'Test Restaurant',
  category: '20c10efe-404b-4a39-bb81-5089a0332d78',
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/providers validation (zod v4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue({ id: 'user-1' });
    mockCreateProviderOrServiceServer.mockResolvedValue({ provider_id: 'provider-1' });
  });

  it('returns a coded 400 with the field name for an over-long title', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, title: 'x'.repeat(201) }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'INVALID_BODY',
      error: 'Invalid submission',
      field: 'title',
    });
  });

  it('returns a coded 400 for an unrecognized key (.strict), leaking no raw issue text', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, bogus: true }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe('INVALID_BODY');
    expect(json.error).toBe('Invalid submission');
    expect(JSON.stringify(json)).not.toContain('bogus');
  });

  it('applies default null to latitude/longitude when the keys are omitted', async () => {
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(200);
    const { formData } = mockCreateProviderOrServiceServer.mock.calls[0][0];
    expect(formData.latitude).toBeNull();
    expect(formData.longitude).toBeNull();
  });

  it('accepts explicit null latitude/longitude', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, latitude: null, longitude: null }));

    expect(response.status).toBe(200);
    const { formData } = mockCreateProviderOrServiceServer.mock.calls[0][0];
    expect(formData.latitude).toBeNull();
    expect(formData.longitude).toBeNull();
  });
});
