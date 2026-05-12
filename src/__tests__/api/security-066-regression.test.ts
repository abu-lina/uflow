/**
 * Security Regression Tests for Plan 060 (Audit 066 Findings)
 *
 * Covers P0/P1 findings:
 * - H-1: Upload-image file extension allowlist
 * - H-2: Needs/Offers error message sanitization
 * - M-1: providerImages JSON structure validation
 * - M-3: UUID validation on array fields in adminSchemas
 *
 * NOTE: The global test setup (setup.ts) mocks 'zod' with a minimal stub.
 * Tests that need the real Zod (M-3, M-1) use vi.resetModules() + vi.doUnmock('zod').
 * Tests that need fresh route imports (H-1, H-2) use vi.resetModules() + vi.doMock().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Shared mock references ─────────────────────────────────────────────────

const mockGetUserFromCookie = vi.fn();
const mockIsAdminOrModerator = vi.fn();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockRequest(options: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  const { method = 'POST', body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/admin/test', init);
}

function setupAuthenticatedAdmin() {
  mockGetUserFromCookie.mockResolvedValue({ id: 'admin-user-id', email: 'admin@test.com' });
  mockIsAdminOrModerator.mockResolvedValue(true);
}

// ─── H-1: Upload-Image Extension Allowlist ───────────────────────────────────
// Tests the extension validation logic directly to avoid jsdom formData() issues.
// Imports the production ALLOWED_IMAGE_EXTENSIONS constant to avoid stale divergence.

describe('H-1: Upload-image file extension allowlist', () => {
  // Import lazily to avoid Vitest hoisting issues with the module mock in setup.ts
  let ALLOWED_IMAGE_EXTENSIONS: string[];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('@/app/api/admin/upload-image/constants');
    ALLOWED_IMAGE_EXTENSIONS = mod.ALLOWED_IMAGE_EXTENSIONS;
  });

  function isExtensionAllowed(fileName: string): boolean {
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    return !!fileExt && ALLOWED_IMAGE_EXTENSIONS.includes(fileExt);
  }

  it('should reject SVG files (XSS vector)', () => {
    expect(isExtensionAllowed('malicious.svg')).toBe(false);
  });

  it('should reject files with disallowed extensions (.html)', () => {
    expect(isExtensionAllowed('exploit.html')).toBe(false);
  });

  it('should reject files with disallowed extensions (.exe)', () => {
    expect(isExtensionAllowed('virus.exe')).toBe(false);
  });

  it('should allow double-extension (image.svg.jpg) — jpg wins; known edge case per Critic F-2', () => {
    // The last extension wins. image.svg.jpg is treated as .jpg (allowed).
    // Documented in Plan 060 Critic F-2 as an informational edge case.
    expect(isExtensionAllowed('image.svg.jpg')).toBe(true);
  });

  it('should reject files with no extension', () => {
    expect(isExtensionAllowed('noextension')).toBe(false);
  });

  it('should accept valid PNG files', () => {
    expect(isExtensionAllowed('photo.png')).toBe(true);
  });

  it('should accept valid JPEG files', () => {
    expect(isExtensionAllowed('photo.jpg')).toBe(true);
    expect(isExtensionAllowed('photo.jpeg')).toBe(true);
  });

  it('should accept valid WebP files', () => {
    expect(isExtensionAllowed('photo.webp')).toBe(true);
  });

  it('should accept valid GIF files', () => {
    expect(isExtensionAllowed('animation.gif')).toBe(true);
  });

  it('should be case-insensitive (uppercase extensions)', () => {
    expect(isExtensionAllowed('photo.PNG')).toBe(true);
    expect(isExtensionAllowed('photo.JPG')).toBe(true);
    expect(isExtensionAllowed('photo.SVG')).toBe(false);
  });
});

// ─── H-2: Error Message Sanitization ─────────────────────────────────────────

describe('H-2: Needs/Offers error message sanitization in production', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedAdmin();
  });

  it('[needs] should not leak internal error messages in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      vi.resetModules();
      vi.doMock('@/lib/supabase/getUserFromCookie', () => ({
        getUserFromCookie: () => mockGetUserFromCookie(),
      }));
      vi.doMock('@/lib/auth/roles', () => ({
        isAdminOrModerator: () => mockIsAdminOrModerator(),
      }));
      vi.doMock('@/lib/logging/structuredLogger', () => ({
        logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
        getRequestMetadata: vi.fn(() => ({})),
      }));
      vi.doMock('@/lib/rate-limit', () => ({
        rateLimiters: { adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) } },
        getClientIdentifier: vi.fn(() => 'user:test-admin'),
      }));
      vi.doMock('@/lib/supabase/admin', () => ({
        getSupabaseAdmin: () => ({
          from: () => ({
            select: () => ({
              data: null,
              error: { message: 'relation "needs" does not exist (INTERNAL SQL DETAIL)' },
            }),
          }),
        }),
      }));
      vi.doMock('@/utils/sanitizeInput', () => ({
        sanitizeTextInput: vi.fn((s: string) => s),
        validateAndSanitizeName: vi.fn((s: string) => s.trim() || ''),
      }));
      vi.doMock('@/utils/contentValidation', () => ({
        validateOfferOrNeedName: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
      }));

      const mod = await import('@/app/api/admin/needs/route');
      const request = createMockRequest({ body: { name: 'Test Need' } });
      const response = await mod.POST(request);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).not.toMatch(/relation|SQL|INTERNAL/i);
      expect(data.error).toBe('Failed to create need');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('[offers] should not leak internal error messages in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      vi.resetModules();
      vi.doMock('@/lib/supabase/getUserFromCookie', () => ({
        getUserFromCookie: () => mockGetUserFromCookie(),
      }));
      vi.doMock('@/lib/auth/roles', () => ({
        isAdminOrModerator: () => mockIsAdminOrModerator(),
      }));
      vi.doMock('@/lib/logging/structuredLogger', () => ({
        logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
        getRequestMetadata: vi.fn(() => ({})),
      }));
      vi.doMock('@/lib/rate-limit', () => ({
        rateLimiters: { adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) } },
        getClientIdentifier: vi.fn(() => 'user:test-admin'),
      }));
      vi.doMock('@/lib/supabase/admin', () => ({
        getSupabaseAdmin: () => ({
          from: () => ({
            select: () => ({
              data: null,
              error: { message: 'relation "offers" does not exist (INTERNAL SQL DETAIL)' },
            }),
          }),
        }),
      }));
      vi.doMock('@/utils/sanitizeInput', () => ({
        sanitizeTextInput: vi.fn((s: string) => s),
        validateAndSanitizeName: vi.fn((s: string) => s.trim() || ''),
      }));
      vi.doMock('@/utils/contentValidation', () => ({
        validateOfferOrNeedName: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
      }));

      const mod = await import('@/app/api/admin/offers/route');
      const request = createMockRequest({ body: { name: 'Test Offer' } });
      const response = await mod.POST(request);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).not.toMatch(/relation|SQL|INTERNAL/i);
      expect(data.error).toBe('Failed to create offer');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

// ─── M-3: UUID Validation on Array Fields ────────────────────────────────────
// These tests need real Zod (not the global mock from setup.ts)

describe('M-3: UUID validation on array fields in adminSchemas', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('zod');
  });

  it('should reject non-UUID strings in offersIds', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      offersIds: ['not-a-uuid', 'also-invalid'],
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID strings in needsIds', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      needsIds: ['arbitrary-string'],
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID strings in communityServiceIds', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      communityServiceIds: ['not-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid UUID arrays', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      offersIds: ['550e8400-e29b-41d4-a716-446655440001'],
      needsIds: ['550e8400-e29b-41d4-a716-446655440002'],
      communityServiceIds: ['550e8400-e29b-41d4-a716-446655440003'],
    });
    expect(result.success).toBe(true);
  });
});

describe('Plan 128 listingType enum regression in providerEditUpdateSchema', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('zod');
  });

  it('[pre-fix FAILS] should accept listingType store after enum rename migration', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      listingType: 'store',
    });
    expect(result.success).toBe(true);
  });

  it('should still accept listingType food and null', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');

    const foodResult = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      listingType: 'food',
    });
    expect(foodResult.success).toBe(true);

    const nullResult = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      listingType: null,
    });
    expect(nullResult.success).toBe(true);
  });

  it('should reject invalid listingType values', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      listingType: 'unknown',
    });
    expect(result.success).toBe(false);
  });
});

// ─── M-1: providerImages JSON Validation ─────────────────────────────────────
// These tests need real Zod (not the global mock from setup.ts)

describe('M-1: providerImages JSON structure validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('zod');
  });

  it('should reject malformed JSON in providerImages', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      providerImages: 'not-valid-json{{{',
    });
    expect(result.success).toBe(false);
  });

  it('should reject providerImages with wrong JSON structure', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      providerImages: JSON.stringify({ images: ['url1'] }), // wrong key
    });
    expect(result.success).toBe(false);
  });

  it('should accept providerImages with arbitrary string urls (sanitization happens at service layer)', async () => {
    // Schema validates JSON structure { urls: string[] }, not url content.
    // XSS sanitization is applied by sanitizeTextInput() in the service layer.
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      providerImages: JSON.stringify({ urls: ['<script>alert(1)</script>'] }),
    });
    // Schema accepts any string[] in urls — service layer sanitizes content
    expect(result.success).toBe(true);
  });

  it('should accept valid providerImages JSON structure', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      providerImages: JSON.stringify({ urls: ['https://example.com/image.jpg'] }),
    });
    expect(result.success).toBe(true);
  });

  it('should accept null providerImages', async () => {
    const { providerEditUpdateSchema } = await import('@/lib/validations/adminSchemas');
    const result = providerEditUpdateSchema.safeParse({
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      providerImages: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── M-2: Dashboard Auth Guard ───────────────────────────────────────────────

describe('M-2: dashboard layout auth guard', () => {
  it('redirects unauthenticated users to /login', async () => {
    vi.resetModules();

    const redirectMock = vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });

    vi.doMock('next/navigation', () => ({
      redirect: redirectMock,
    }));
    vi.doMock('@/lib/supabase/getUserFromCookie', () => ({
      getUserFromCookie: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('@/lib/auth/roles', () => ({
      isAdminOrModerator: vi.fn(),
    }));

    const mod = await import('@/app/(dashboard)/layout');

    await expect(mod.default({ children: 'secret' })).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('redirects authenticated non-admin users to /providers', async () => {
    vi.resetModules();

    const redirectMock = vi.fn((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });

    vi.doMock('next/navigation', () => ({
      redirect: redirectMock,
    }));
    vi.doMock('@/lib/supabase/getUserFromCookie', () => ({
      getUserFromCookie: vi.fn().mockResolvedValue({ id: 'user-1' }),
    }));
    vi.doMock('@/lib/auth/roles', () => ({
      isAdminOrModerator: vi.fn().mockResolvedValue(false),
    }));

    const mod = await import('@/app/(dashboard)/layout');

    await expect(mod.default({ children: 'secret' })).rejects.toThrow('NEXT_REDIRECT:/providers');
    expect(redirectMock).toHaveBeenCalledWith('/providers');
  });

  it('allows admin users through without redirect', async () => {
    vi.resetModules();

    const redirectMock = vi.fn();

    vi.doMock('next/navigation', () => ({
      redirect: redirectMock,
    }));
    vi.doMock('@/lib/supabase/getUserFromCookie', () => ({
      getUserFromCookie: vi.fn().mockResolvedValue({ id: 'admin-1' }),
    }));
    vi.doMock('@/lib/auth/roles', () => ({
      isAdminOrModerator: vi.fn().mockResolvedValue(true),
    }));

    const mod = await import('@/app/(dashboard)/layout');
    const result = await mod.default({ children: 'secret' });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
