/**
 * Regression tests for auth.ts callers of /api/check-email-exists
 *
 * QA Finding (Plan 049): After F-049-04 removed the `exists` field from
 * the check-email-exists response, both signInWithEmailConfirmation() and
 * resetPasswordWithLanguage() still destructured `{ exists, confirmed }`,
 * causing `exists` to be `undefined` and ALL users to hit EMAIL_NOT_FOUND.
 *
 * These tests prove:
 *  1. [pre-fix FAILS] The old code breaks for confirmed users
 *  2. [post-fix PASSES] The fixed code works with the new response shape
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock supabase client
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a mock Response returning the given JSON body */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('signInWithEmailConfirmation — check-email-exists caller regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error noise from auth.ts
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should proceed to signInWithPassword when API returns { confirmed: true } [post-fix PASSES]', async () => {
    // Simulate the NEW check-email-exists response shape (no `exists` field)
    mockFetch.mockResolvedValueOnce(jsonResponse({ confirmed: true, message: 'If this email is registered...' }));

    // Simulate successful sign-in
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-123',
          email: 'confirmed@example.com',
          email_confirmed_at: '2025-01-01T00:00:00Z',
          user_metadata: {},
        },
        session: { access_token: 'tok' },
      },
      error: null,
    });

    const { signInWithEmailConfirmation } = await import('@/lib/auth');
    const result = await signInWithEmailConfirmation('confirmed@example.com', 'password123');

    // Must NOT return EMAIL_NOT_FOUND for a confirmed user
    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'confirmed@example.com',
      password: 'password123',
    });
  });

  it('should return EMAIL_NOT_FOUND when API returns { confirmed: false } [post-fix PASSES]', async () => {
    // Unconfirmed or non-existent user — same response per F-049-04
    mockFetch.mockResolvedValueOnce(jsonResponse({ confirmed: false, message: 'If this email is registered...' }));

    const { signInWithEmailConfirmation } = await import('@/lib/auth');
    const result = await signInWithEmailConfirmation('unknown@example.com', 'password123');

    expect(result.error?.message).toBe('EMAIL_NOT_FOUND');
    expect(result.data).toBeNull();
    // Must NOT attempt signInWithPassword
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe('resetPasswordWithLanguage — check-email-exists caller regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should proceed to generate token when API returns { confirmed: true } [post-fix PASSES]', async () => {
    // 1st fetch: check-email-exists — confirmed user
    mockFetch.mockResolvedValueOnce(jsonResponse({ confirmed: true, message: 'If this email is registered...' }));
    // 2nd fetch: generate-confirmation-token — success
    mockFetch.mockResolvedValueOnce(jsonResponse({ token: 'reset-token-abc' }));
    // 3rd fetch: send-auth-email — success
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'email-id' }));

    const { resetPasswordWithLanguage } = await import('@/lib/auth');
    const result = await resetPasswordWithLanguage('confirmed@example.com', 'en');

    // Must NOT return EMAIL_NOT_FOUND for a confirmed user
    expect(result.error).toBeNull();
    // Should have called all three endpoints
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should return EMAIL_NOT_FOUND when API returns { confirmed: false } [post-fix PASSES]', async () => {
    // Unconfirmed or non-existent — same response per F-049-04
    mockFetch.mockResolvedValueOnce(jsonResponse({ confirmed: false, message: 'If this email is registered...' }));

    const { resetPasswordWithLanguage } = await import('@/lib/auth');
    const result = await resetPasswordWithLanguage('unknown@example.com', 'en');

    expect(result.error?.message).toBe('EMAIL_NOT_FOUND');
    // Must NOT attempt token generation
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
