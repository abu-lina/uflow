/**
 * Regression tests for issue #577, AC5.
 *
 * /api/auth/signup returned English prose in `error`, which the client
 * printed raw regardless of locale. The route now returns a stable opaque
 * `code` alongside a safe generic `error`, and never leaks internals
 * (Supabase errors, validation detail) to the client.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        listUsers: (...args: unknown[]) => mockListUsers(...args),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
      },
    },
    from: () => ({
      insert: (...args: unknown[]) => mockInsert(...args),
    }),
  }),
}));

import { POST } from '@/app/api/auth/signup/route';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: 'new@example.com',
  password: 'abcd1234',
  language: 'en',
  honeypot: '',
  termsAccepted: true,
  privacyAccepted: true,
};

// Sentinel codes must be opaque identifiers only
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

describe('POST /api/auth/signup — sentinel error codes (issue #577)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: VALID_BODY.email } },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });
  });

  it('returns CONSENT_REQUIRED when consent flags are missing', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, termsAccepted: false }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('CONSENT_REQUIRED');
    expect(body.code).toMatch(CODE_PATTERN);
  });

  it('returns EMAIL_INVALID for a malformed email', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('EMAIL_INVALID');
  });

  it('returns PASSWORD_REQUIRED when password is missing', async () => {
    const res = await POST(
      makeRequest({
        email: 'new@example.com',
        password: undefined,
        termsAccepted: true,
        privacyAccepted: true,
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('PASSWORD_REQUIRED');
  });

  it('returns a password rule code for a weak password', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: 'short' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('returns EMAIL_ALREADY_REGISTERED when the user exists', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [{ email: VALID_BODY.email }] },
      error: null,
    });
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('never leaks Supabase internals on createUser failure', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'duplicate key value violates unique constraint "users_pkey"' },
    });
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe('SIGNUP_FAILED');
    expect(JSON.stringify(body)).not.toContain('users_pkey');
    expect(JSON.stringify(body)).not.toContain('duplicate key');
  });

  it('returns SIGNUP_FAILED with no internals on unexpected exceptions', async () => {
    mockListUsers.mockRejectedValue(new Error('connection to db.internal:5432 refused'));
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe('SIGNUP_FAILED');
    expect(JSON.stringify(body)).not.toContain('db.internal');
  });

  it('keeps success behaviour unchanged', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userId).toBe('u-1');
  });
});
