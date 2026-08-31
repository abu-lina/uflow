import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

let POST: typeof import('@/app/api/city-interest/subscribe/route').POST;

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => true), // Allow by default
  getClientIdentifier: vi.fn(() => '127.0.0.1'),
}));

describe('/api/city-interest/subscribe', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unmock('zod');
    ({ POST } = await import('@/app/api/city-interest/subscribe/route'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TDD Gate - Route existence', () => {
    it('[pre-fix FAILS] should export POST handler', () => {
      // This test will fail initially when route.ts doesn't exist
      expect(POST).toBeDefined();
      expect(typeof POST).toBe('function');
    });
  });

  describe('Authentication path - authenticated user', () => {
    it('[post-fix PASSES] should accept request from authenticated user without email in body', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'user@example.com' } },
            error: null,
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Frankfurt' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.city).toBe('Frankfurt');
      expect(mockAdminClient.from).toHaveBeenCalledWith('waitlist');
    });

    it('[post-fix PASSES] should use email from session for authenticated user', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'session@example.com' } },
            error: null,
          }),
        },
      };

      const mockAdminClient = { from: mockFrom };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Berlin' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'session@example.com',
          selected_city: 'Berlin',
        }),
        { onConflict: 'email' }
      );
    });
  });

  describe('Anonymous path - no session', () => {
    it('[post-fix PASSES] should accept email from body for anonymous user', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No user' },
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Munich', email: 'anon@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.city).toBe('Munich');
    });

    it('[post-fix PASSES] should return 400 if anonymous user does not provide email', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No user' },
          }),
        },
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Hamburg' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('[post-fix PASSES] should return 400 for invalid email format', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No user' },
          }),
        },
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Cologne', email: 'not-an-email' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('[post-fix PASSES] should return 400 for missing cityName', async () => {
      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('[post-fix PASSES] should trim and limit cityName to 100 chars', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'user@example.com' } },
            error: null,
          }),
        },
      };

      const mockAdminClient = { from: mockFrom };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const longCityName = ' '.repeat(10) + 'A'.repeat(150) + ' '.repeat(10);
      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: longCityName }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          selected_city: 'A'.repeat(100),
        }),
        { onConflict: 'email' }
      );
    });

    it('[post-fix PASSES] should normalize email to lowercase', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No user' },
          }),
        },
      };

      const mockAdminClient = { from: mockFrom };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Stuttgart', email: 'User@EXAMPLE.COM' }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
        }),
        { onConflict: 'email' }
      );
    });
  });

  describe('Idempotency', () => {
    it('[post-fix PASSES] should handle duplicate subscription without error', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'duplicate@example.com' } },
            error: null,
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Dresden' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('[post-fix PASSES] should return 500 if database upsert fails', async () => {
      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { email: 'user@example.com' } },
            error: null,
          }),
        },
      };

      const mockAdminClient = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      };

      vi.mocked(createSupabaseServerClient).mockReturnValue(mockSupabaseClient as any);
      vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdminClient as any);

      const request = new NextRequest('http://localhost:3000/api/city-interest/subscribe', {
        method: 'POST',
        body: JSON.stringify({ cityName: 'Leipzig' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
