/**
 * Route-level tests for POST /api/admin/import-joinhalal/dry-run.
 *
 * Plan 049 QA required action: verify the route handler returns a structured
 * 504 JSON response when the application-level timeout budget is exceeded.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (hoisted)
// ---------------------------------------------------------------------------

const { mockRunDryRun, mockIsAdminOrModerator, mockGetUserFromCookie } = vi.hoisted(() => ({
  mockRunDryRun: vi.fn(),
  mockIsAdminOrModerator: vi.fn(),
  mockGetUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/import/joinhalal', () => ({
  runJoinHalalDryRun: mockRunDryRun,
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: mockIsAdminOrModerator,
}));

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUserFromCookie,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}));

// Import route handler after all mocks are set up
import { POST } from '@/app/api/admin/import-joinhalal/dry-run/route';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/admin/import-joinhalal/dry-run — timeout handling (Plan 049)', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Auth always passes
    mockGetUserFromCookie.mockResolvedValue({ id: 'user-001' });
    mockIsAdminOrModerator.mockResolvedValue(true);

    // Env vars required by route
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('[QA-049] returns structured 504 JSON when route timeout is exceeded', async () => {
    // Mock runJoinHalalDryRun to hang until its caller signal is aborted.
    // This simulates a slow dry-run that exceeds the 90s budget.
    mockRunDryRun.mockImplementation(async (options: { signal?: AbortSignal }) => {
      return new Promise((_, reject) => {
        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new Error('Dry-run aborted: timeout exceeded during page fetch.'));
          }, { once: true });
        }
      });
    });

    const request = new Request('http://localhost/api/admin/import-joinhalal/dry-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 }),
    });

    const responsePromise = POST(request);

    // Fast-forward past the 90s route timeout
    await vi.advanceTimersByTimeAsync(91_000);

    const response = await responsePromise;
    const json = await response.json();

    expect(response.status).toBe(504);
    expect(json.error).toBe('Dry-run timed out');
    expect(json.detail).toContain('90s');
    expect(json.detail).toContain('CLI');
  });
});
