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

  it('returns the v4 default message for an over-long title', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, title: 'x'.repeat(201) }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Too big: expected string to have <=200 characters',
    });
  });

  it('returns the v4 default message for an unrecognized key (.strict)', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, bogus: true }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Unrecognized key: "bogus"',
    });
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
