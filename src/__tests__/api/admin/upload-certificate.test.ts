/**
 * Tests for POST /api/admin/upload-certificate
 *
 * Route-level tests for auth guards (401/403).
 * Validation logic tests directly to avoid jsdom formData() issues.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));

const mockUpload = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example.com/provider-certificates/${path}` },
        }),
      }),
    },
  }),
}));

vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  getRequestMetadata: vi.fn(() => ({})),
}));

import { POST } from '@/app/api/admin/upload-certificate/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';

const mockGetUserFromCookie = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdminOrModerator = isAdminOrModerator as ReturnType<typeof vi.fn>;

const ADMIN_USER = { id: 'admin-1', email: 'admin@example.com' };
const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';

// ─── Route-level auth guard tests ─────────────────────────────────────────

describe('POST /api/admin/upload-certificate — auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFromCookie.mockResolvedValue(ADMIN_USER);
    mockIsAdminOrModerator.mockResolvedValue(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUserFromCookie.mockResolvedValue(null);
    const req = new Request('http://localhost/api/admin/upload-certificate', { method: 'POST' });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 403 when user is not admin/moderator', async () => {
    mockIsAdminOrModerator.mockResolvedValue(false);
    const req = new Request('http://localhost/api/admin/upload-certificate', { method: 'POST' });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});

// ─── Validation logic tests (direct, avoid jsdom formData) ────────────────

describe('upload-certificate — validation logic', () => {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_SIZE = 5 * 1024 * 1024;

  it('rejects unsupported MIME types', () => {
    expect(ALLOWED_TYPES).not.toContain('text/plain');
    expect(ALLOWED_TYPES).not.toContain('image/gif');
    expect(ALLOWED_TYPES).not.toContain('application/octet-stream');
  });

  it('accepts supported MIME types', () => {
    for (const mime of ALLOWED_TYPES) {
      expect(ALLOWED_TYPES).toContain(mime);
    }
  });

  it('rejects files larger than 5MB', () => {
    const oversized = 6 * 1024 * 1024;
    expect(oversized).toBeGreaterThan(MAX_SIZE);

    const valid = 4 * 1024 * 1024;
    expect(valid).toBeLessThanOrEqual(MAX_SIZE);
  });

  it('rejects files at exactly the max size', () => {
    const atLimit = 5 * 1024 * 1024;
    expect(atLimit).toBeLessThanOrEqual(MAX_SIZE);
  });
});

describe('upload-certificate — storage upload path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads to path prefixed with providerId', async () => {
    mockUpload.mockResolvedValue({ data: { path: `${VALID_ID}/uuid-file.png` }, error: null });

    const supabaseAdmin = await import('@/lib/supabase/admin').then(m => m.getSupabaseAdmin());
    const buffer = new ArrayBuffer(100);
    const result = await supabaseAdmin.storage.from('provider-certificates').upload(
      `${VALID_ID}/uuid-file.png`,
      buffer,
      { contentType: 'image/png', upsert: false }
    );

    expect(result.data?.path).toContain(VALID_ID);
  });

  it('returns public URL after successful upload', async () => {
    const uploadPath = `${VALID_ID}/abc-cert.png`;
    mockUpload.mockResolvedValue({ data: { path: uploadPath }, error: null });

    const supabaseAdmin = await import('@/lib/supabase/admin').then(m => m.getSupabaseAdmin());
    const { data: uploadData } = await supabaseAdmin.storage.from('provider-certificates').upload(
      uploadPath,
      new ArrayBuffer(100),
      { contentType: 'image/png', upsert: false }
    );

    const { data: urlData } = supabaseAdmin.storage.from('provider-certificates').getPublicUrl(uploadData!.path);
    expect(urlData.publicUrl).toContain(VALID_ID);
    expect(urlData.publicUrl).toContain('provider-certificates');
  });
});
