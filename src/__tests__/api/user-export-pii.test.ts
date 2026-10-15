import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUserFromCookie = vi.fn((..._args: unknown[]): Promise<unknown> =>
  Promise.resolve(null),
);
const mockCheckRateLimit = vi.fn((..._args: unknown[]) => true);
let providerQueries = 0;

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: (...args: unknown[]) => mockGetUserFromCookie(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIdentifier: (_request: Request, userId?: string) => `user:${userId}`,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: null, error: null }) }),
          }),
        };
      }
      if (table === 'providers') {
        providerQueries += 1;
        return {
          select: () => ({
            eq: () =>
              providerQueries === 1
                ? Promise.resolve({ data: [], error: null })
                : { eq: async () => ({ data: [], error: null }) },
          }),
        };
      }
      if (table === 'consent_logs') {
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: [], error: null }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      };
    },
  }),
}));

import { GET } from '@/app/api/user/export-data/route';

const IP = '203.0.113.77';
const user = { id: 'export-user-1', email: 'pii-probe@example.test', user_metadata: {} };

function makeRequest(): Request {
  return new Request('http://localhost/api/user/export-data', {
    headers: { 'x-real-ip': IP },
  });
}

function loggedOutput(): string {
  return JSON.stringify([
    vi.mocked(console.log).mock.calls,
    vi.mocked(console.info).mock.calls,
    vi.mocked(console.warn).mock.calls,
    vi.mocked(console.error).mock.calls,
    vi.mocked(console.debug).mock.calls,
  ]);
}

describe('GET /api/user/export-data PII logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerQueries = 0;
    mockGetUserFromCookie.mockResolvedValue(user);
    mockCheckRateLimit.mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps successful export data and headers while logging only masked IP', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('my-data-');
    const exported = await response.json();
    expect(exported.email).toBe(user.email);
    const logs = loggedOutput();
    expect(logs).not.toContain(user.email);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('203.0.113.0');
    expect(logs).toContain(user.id);
  });

  it('preserves unauthorized and rate-limited responses without logging PII', async () => {
    mockGetUserFromCookie.mockResolvedValueOnce(null);
    expect((await GET(makeRequest())).status).toBe(401);

    mockCheckRateLimit.mockReturnValue(false);
    expect((await GET(makeRequest())).status).toBe(429);

    const logs = loggedOutput();
    expect(logs).not.toContain(user.email);
    expect(logs).not.toContain(IP);
  });
});
