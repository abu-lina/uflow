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

      const existing = await snapshot(
        await GET(request(`email=${encodeURIComponent(EXISTING_EMAIL)}`)),
      );
      const unknown = await snapshot(
        await GET(request(`email=${encodeURIComponent(UNKNOWN_EMAIL)}`)),
      );

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

  it.each([
    ['same-length wrong key', 'FAKE-ADMIN-KEY-FOR-TESTINX'],
    ['shorter wrong key', 'FAKE'],
    ['empty key', ''],
  ])('rejects a %s', async (_name, key) => {
    vi.stubEnv('ADMIN_DEBUG_KEY', ADMIN_KEY);

    const response = await GET(request('ip=198.51.100.1', { 'x-admin-key': key }));

    expect(response.status).toBe(403);
  });

  it('HTML-escapes every query value in the admin HTML view, including the JSON block', async () => {
    vi.stubEnv('ADMIN_DEBUG_KEY', ADMIN_KEY);
    const emailPayload = `"><script>alert('email')</script>`;
    const ipPayload = `<img src=x onerror="alert('ip')">`;

    const response = await GET(
      request(
        `format=html&email=${encodeURIComponent(emailPayload)}&ip=${encodeURIComponent(ipPayload)}`,
        { 'x-admin-key': ADMIN_KEY },
      ),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).not.toContain(emailPayload);
    expect(html).not.toContain(ipPayload);
    expect(html).not.toContain('<img');
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(&#39;email&#39;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(&#39;ip&#39;)&quot;&gt;');
    const pre = html.slice(html.indexOf('<pre id="json-data">'), html.indexOf('</pre>'));
    expect(pre).not.toMatch(/<(?!pre)/);
    expect(pre).toContain('&lt;script&gt;');
  });
});
