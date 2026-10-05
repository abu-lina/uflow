// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: () => 'ip:127.0.0.1',
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { PATCH } from '@/app/api/waitlist/update/route';

describe('PATCH /api/waitlist/update', () => {
  it('returns 400 with mapped { path, message } details for an invalid email', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/waitlist/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', waitlistToken: 'token-123' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      data: null,
      error: {
        message: 'Please enter a valid email address',
        details: [{ path: 'email', message: 'Please enter a valid email address' }],
      },
    });
  });
});
