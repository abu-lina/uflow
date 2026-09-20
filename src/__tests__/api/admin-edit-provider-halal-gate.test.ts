import { describe, it, expect, vi, beforeEach } from 'vitest';

// Global setup mocks zod — restore the real implementation for this test suite
vi.unmock('zod');

// Mock dependencies before imports
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/providerEdit', () => ({
  updateProviderFields: vi.fn(),
}));
vi.mock('@/services/admin/halal-gate', () => ({
  checkHalalAttestation: vi.fn(),
}));
vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
}));
vi.mock('@/lib/audit/adminAudit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  getUserAgent: vi.fn(() => 'test-agent'),
}));
vi.mock('@/lib/logging/structuredLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  getRequestMetadata: vi.fn(() => ({})),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    adminReview: { perHour: vi.fn(() => true), perMinute: vi.fn(() => true) },
  },
  getClientIdentifier: vi.fn(() => 'user:admin'),
}));

import { PATCH } from '@/app/api/admin/edit-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderFields } from '@/services/admin/providerEdit';
import { checkHalalAttestation } from '@/services/admin/halal-gate';
import { updateProviderReview } from '@/services/admin/providers';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockUpdateFields = updateProviderFields as ReturnType<typeof vi.fn>;
const mockHalalCheck = checkHalalAttestation as ReturnType<typeof vi.fn>;
const mockReview = updateProviderReview as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/edit-provider', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/edit-provider — halal attestation gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockUpdateFields.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'pending',
      updated_at: '2025-01-01T00:00:00Z',
    });
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'approved',
      review_feedback: null,
    });
    // Default: all attested
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      sourceTable: null,
    });
  });

  it('auto-rejects when halal attestation becomes incomplete', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol', 'no_pork'],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, noAlcohol: false, noPork: false }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      expect.stringContaining('no_alcohol'),
    );
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      expect.stringContaining('no_pork'),
    );

    const json = await res.json();
    expect(json.data.review_status).toBe('rejected');
  });

  it('auto-approves when all halal attestations are set', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(
      makeRequest({ providerId: validId, noAlcohol: true, noPork: true, noGambling: true }),
    );

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalledWith(validId, 'approved');

    const json = await res.json();
    expect(json.data.review_status).toBe('approved');
  });

  it('does not check halal gate when no halal fields are edited', async () => {
    const res = await PATCH(makeRequest({ providerId: validId, providerName: 'New Name' }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).not.toHaveBeenCalled();
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('auto-approves non-food provider when halal fields are edited', async () => {
    // checkHalalAttestation returns allAttested: true for non-food/store providers
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      sourceTable: null,
    });

    const res = await PATCH(makeRequest({ providerId: validId, noAlcohol: true }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalledWith(validId, 'approved');

    const json = await res.json();
    expect(json.data.review_status).toBe('approved');
  });

  it('checks halal gate when only noGambling is edited', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol', 'no_pork'],
      sourceTable: 'store_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, noGambling: true }));

    expect(res.status).toBe(200);
    expect(mockHalalCheck).toHaveBeenCalledWith(validId);
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      expect.stringContaining('Halal attestation incomplete'),
    );
  });

  it('includes all missing attestations in rejection feedback', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol', 'no_pork', 'no_gambling'],
      sourceTable: 'food_providers',
    });

    await PATCH(makeRequest({ providerId: validId, noAlcohol: false }));

    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      'Halal attestation incomplete — missing: no_alcohol, no_pork, no_gambling',
    );
  });
});
