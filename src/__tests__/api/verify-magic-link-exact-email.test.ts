import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spyOnConsole } from '@/__tests__/utils/pii-probe';

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

const STORED_EMAIL = 'ab@example.test';
const TOKEN = 'exact-email-token-669';

const rows: Row[] = [];
const ilikeCalls: unknown[][] = [];
const eqCalls: unknown[][] = [];

function likeToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('')
    .map((char) => (char === '%' ? '.*' : char === '_' ? '.' : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${source}$`, 'i');
}

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => {
      const filters: Filter[] = [];
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          eqCalls.push([column, value]);
          filters.push((row) => row[column] === value);
          return builder;
        },
        ilike: (column: string, pattern: string) => {
          ilikeCalls.push([column, pattern]);
          filters.push((row) => likeToRegExp(pattern).test(String(row[column])));
          return builder;
        },
        maybeSingle: async () => ({
          data: rows.find((row) => filters.every((filter) => filter(row))) ?? null,
          error: null,
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
      return builder;
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: 'user-669', email: STORED_EMAIL, email_confirmed_at: 'now', user_metadata: {} } },
          error: null,
        }),
        updateUserById: async () => ({ error: null }),
        generateLink: async () => ({ data: { properties: { hashed_token: 'hashed-669' } }, error: null }),
      },
    },
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => true,
  getClientIdentifier: () => 'ip:192.0.2.1',
}));

vi.mock('@/utils/security', () => ({
  getClientIP: () => '192.0.2.1',
  checkIPBlocked: () => false,
}));

import { POST } from '@/app/api/auth/verify-magic-link/route';

function request(email: string): Request {
  return new Request('http://localhost/api/auth/verify-magic-link', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, email }),
  });
}

describe('AC6: verify-magic-link matches email exactly (#669)', () => {
  beforeEach(() => {
    spyOnConsole();
    ilikeCalls.length = 0;
    eqCalls.length = 0;
    rows.length = 0;
    rows.push({
      id: 'row-669',
      user_id: 'user-669',
      email: STORED_EMAIL,
      token: TOKEN,
      type: 'magic_link',
      used: false,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['a%@example.test', '_b@example.test'])(
    'a lookup for %s does not match a row for ab@example.test',
    async (email) => {
      const response = await POST(request(email));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBeUndefined();
      expect(body.hashedToken).toBeUndefined();
    },
  );

  it('uses no ilike on user input', async () => {
    await POST(request('a%@example.test'));

    expect(ilikeCalls).toEqual([]);
  });

  it.each(['AB@Example.TEST', '  ab@example.test  '])(
    'matches the stored row with .eq on the normalised email for %j',
    async (email) => {
      const response = await POST(request(email));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(eqCalls).toContainEqual(['email', STORED_EMAIL]);
    },
  );
});
