import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/verify-magic-link/route';
import { createMockSupabaseAdmin, createMockTokenData, createMockUser } from '@/__mocks__/supabase-admin';
import { checkIPBlocked, clearAllBlockedIPs } from '@/utils/security';
import { checkRateLimit } from '@/lib/rate-limit';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/utils/security', () => ({
  getClientIP: vi.fn((request: Request) => {
    const ip = request.headers.get('x-test-ip') || '127.0.0.1';
    return ip;
  }),
  checkIPBlocked: vi.fn(),
  markSuspiciousIP: vi.fn(),
  unblockIP: vi.fn(),
  clearAllBlockedIPs: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIdentifier: vi.fn((request: Request) => {
    const ip = request.headers.get('x-test-ip') || '127.0.0.1';
    return `ip:${ip}`;
  }),
}));

// Set test environment
// NODE_ENV is already 'test' in vitest — no need to reassign (it's read-only)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

/**
 * Helper to set up the mock Supabase client for a test.
 * Handles the type casting between our mock and SupabaseClient generics.
 */
async function setupMockClient(options: Parameters<typeof createMockSupabaseAdmin>[0] = {}) {
  const { createClient } = await import('@supabase/supabase-js');
  const mock = createMockSupabaseAdmin(options);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockReturnValue(mock as any);
  return mock;
}

describe('POST /api/auth/verify-magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllBlockedIPs();
    vi.mocked(checkRateLimit).mockReturnValue(true);
    vi.mocked(checkIPBlocked).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should return 400 if token is missing', async () => {
      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing token or email');
    });

    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing token or email');
    });

    it('should return 400 if email format is invalid', async () => {
      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token', email: 'invalid-email' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email format');
    });
  });

  describe('Token Validation - Invalid Tokens', () => {
    it('should return 400 if token is not found', async () => {
      await setupMockClient({ tokenData: null });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'invalid-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired magic link. Please request a new one.');
    });

    it('should return 400 if token is expired', async () => {
      const expiredToken = createMockTokenData({
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      });

      await setupMockClient({ tokenData: expiredToken });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'expired-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Magic link has expired. Please request a new one.');
    });

    it('should return 400 if token is already used', async () => {
      const usedToken = createMockTokenData({
        used: true,
      });

      await setupMockClient({ tokenData: usedToken });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'used-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Token query now has a pre-check for used tokens with specific error message
      expect(response.status).toBe(400);
      expect(data.error).toBe('This magic link has already been used. Magic links can only be used once. Please request a new one.');
    });

    it('should return 400 if invalid token from blocked IP in test mode (IP blocking bypassed)', async () => {
      await setupMockClient({ tokenData: null });

      vi.mocked(checkIPBlocked).mockReturnValue(true);

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'invalid-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // In test mode (NODE_ENV=test), IP blocking is bypassed
      // Route returns 400 for invalid token instead of 403
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired magic link. Please request a new one.');
    });

    it('should return 429 if rate limit exceeded for invalid tokens', async () => {
      await setupMockClient({ tokenData: null });

      vi.mocked(checkRateLimit).mockReturnValue(false);

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'invalid-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many verification attempts. Please try again later.');
    });
  });

  describe('Token Validation - Valid Tokens', () => {
    it('should return 200 with hashedToken for valid token from non-blocked IP', async () => {
      const validToken = createMockTokenData({
        token: 'valid-token',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
      });

      await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
        hashedToken: 'test-hashed-token-123',
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'valid-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hashedToken).toBe('test-hashed-token-123');
      expect(data.user.id).toBe(validToken.user_id);
      expect(data.user.email).toBe(validToken.email);
    });

    it('should bypass IP blocking for valid token (bypass feature)', async () => {
      const validToken = createMockTokenData({
        token: 'valid-token',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
      });

      await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
        hashedToken: 'test-hashed-token-123',
      });

      // Simulate blocked IP
      vi.mocked(checkIPBlocked).mockReturnValue(true);

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'valid-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed even though IP is blocked (bypass feature)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hashedToken).toBe('test-hashed-token-123');
    });

    it('[pre-fix FAILS, post-fix PASSES] syncs DB role into auth user_metadata.role on successful verification', async () => {
      const validToken = createMockTokenData({
        token: 'valid-token-role-sync',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: { language: 'en' },
      });

      const mock = await setupMockClient({
        tokenData: validToken,
        userRole: 'user',
        users: [mockUser],
        hashedToken: 'test-hashed-token-123',
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'valid-token-role-sync',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mock.auth.admin.updateUserById).toHaveBeenCalledWith(validToken.user_id, {
        user_metadata: {
          language: 'en',
          role: 'user',
        },
      });
    });
  });

  describe('Database Errors', () => {
    it('should return 500 if token database query fails', async () => {
      await setupMockClient({
        tokenError: { message: 'Database connection failed' },
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to verify token');
    });

    it('should return 500 if user list query fails', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      await setupMockClient({
        tokenData: validToken,
        userError: { message: 'Failed to fetch users' },
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to verify user');
    });

    it('should return 404 if user not found', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      await setupMockClient({
        tokenData: validToken,
        users: [], // No users found
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if user email is missing', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: '', // Missing email
      });

      await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User email not found');
    });

    it('should return 500 if generateLink fails', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
      });

      await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
        generateLinkError: { message: 'Failed to generate link' },
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create session. Please try again.');
    });

    it('should return 500 if hashedToken is missing from generateLink response', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
      });

      const mockAdmin = await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
      });

      // Override generateLink to return data without hashed_token
      mockAdmin.auth.admin.generateLink = vi.fn().mockResolvedValue({
        data: {
          properties: {}, // Missing hashed_token
        },
        error: null,
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate session token');
    });
  });

  describe('Email Confirmation', () => {
    it('should confirm email if not already confirmed', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
        email_confirmed_at: null, // Not confirmed
        user_metadata: {},
      });

      const mockAdmin = await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
        hashedToken: 'test-hashed-token-123',
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify updateUserById was called to confirm email
      expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        validToken.user_id,
        expect.objectContaining({
          email_confirm: true,
        })
      );
    });

    it('should skip email confirmation if already confirmed', async () => {
      const validToken = createMockTokenData({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      const mockUser = createMockUser({
        id: validToken.user_id,
        email: validToken.email,
        email_confirmed_at: new Date().toISOString(), // Already confirmed
      });

      const mockAdmin = await setupMockClient({
        tokenData: validToken,
        users: [mockUser],
        hashedToken: 'test-hashed-token-123',
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // updateUserById should not be called if already confirmed
      expect(mockAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for unexpected errors', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      vi.mocked(createClient).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = new Request('http://localhost/api/auth/verify-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-ip': '192.168.1.1',
        },
        body: JSON.stringify({
          token: 'test-token',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An unexpected error occurred');
    });
  });
});
