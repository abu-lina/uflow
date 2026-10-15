import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROBE_EMAIL, PROBE_IP } from '@/__tests__/utils/pii-probe';

const EXISTING_EMAIL = PROBE_EMAIL;
const UNKNOWN_EMAIL = 'nobody-here@example.test';
const ADMIN_KEY = 'FAKE-ADMIN-KEY-FOR-TESTING';

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: [{ id: 'diag-user-1', email: EXISTING_EMAIL, email_confirmed_at: null }] },
          error: null,
        }),
        getUserById: async () => ({ data: { user: { id: 'diag-user-1' } }, error: null }),
      },
    },
  }),
}));

import { GET } from '@/app/api/auth/magic-link-diagnostic/route';

function request(query: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost/api/auth/magic-link-diagnostic?${query}`, {
    headers: { 'x-real-ip': PROBE_IP, ...headers },
  });
}

async function snapshot(response: Response) {
  return { status: response.status, body: await response.text() };
}

describe('GET /api/auth/magic-link-diagnostic (AC4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['ADMIN_DEBUG_KEY set', ADMIN_KEY],
    ['ADMIN_DEBUG_KEY unset', undefined],
  ])(
    'without x-admin-key, an existing email and an unknown email get the same 403 (%s)',
    async (_name, envKey) => {
      if (envKey) vi.stubEnv('ADMIN_DEBUG_KEY', envKey);

      const existing = await snapshot(await GET(request(`email=${encodeURIComponent(EXISTING_EMAIL)}`)));
      const unknown = await snapshot(await GET(request(`email=${encodeURIComponent(UNKNOWN_EMAIL)}`)));

      expect(existing.status).toBe(403);
      expect(unknown).toEqual(existing);
      expect(existing.body).not.toContain(EXISTING_EMAIL);
      expect(existing.body).not.toContain(PROBE_IP);
    },
  );

  it.each([
    ['ADMIN_DEBUG_KEY set', ADMIN_KEY],
    ['ADMIN_DEBUG_KEY unset', undefined],
  ])('rejects the ip override and html format without a valid key (%s)', async (_name, envKey) => {
    if (envKey) vi.stubEnv('ADMIN_DEBUG_KEY', envKey);
    const payload = encodeURIComponent('<script>alert(1)</script>');

    const response = await GET(
      request(`email=${payload}&ip=198.51.100.1&format=html`, { 'x-admin-key': 'wrong-key' }),
    );
    const body = await response.text();

    expect(response.status).toBe(403);
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('198.51.100.1');
  });

  it('still serves the diagnostic to a caller with the admin key', async () => {
    vi.stubEnv('ADMIN_DEBUG_KEY', ADMIN_KEY);

    const response = await GET(request('ip=198.51.100.1', { 'x-admin-key': ADMIN_KEY }));

    expect(response.status).toBe(200);
    expect((await response.json()).mode).toBe('admin');
  });
});
