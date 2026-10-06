import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: vi.fn(),
}));
vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(),
}));
vi.mock('@/services/admin/providers', () => ({
  updateProviderReview: vi.fn(),
}));
vi.mock('@/services/admin/halal-gate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/admin/halal-gate')>();
  return {
    ...actual,
    checkHalalAttestation: vi.fn(),
    getHalalAttestationValues: vi.fn(),
  };
});
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

import { PATCH } from '@/app/api/admin/review-provider/route';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { updateProviderReview } from '@/services/admin/providers';
import { checkHalalAttestation, getHalalAttestationValues } from '@/services/admin/halal-gate';

const mockGetUser = getUserFromCookie as ReturnType<typeof vi.fn>;
const mockIsAdmin = isAdminOrModerator as ReturnType<typeof vi.fn>;
const mockReview = updateProviderReview as ReturnType<typeof vi.fn>;
const mockHalalCheck = checkHalalAttestation as ReturnType<typeof vi.fn>;
const mockStoredValues = getHalalAttestationValues as ReturnType<typeof vi.fn>;

const adminUser = { id: 'admin-id', email: 'admin@example.com' };
const validId = '123e4567-e89b-12d3-a456-426614174000';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/admin/review-provider', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// The 912-row shape verified on DEV: every stored answer clamped to false.
const STORED_ALL_FALSE = {
  sourceTable: 'food_providers' as const,
  values: { no_alcohol: false, no_pork: false, no_gambling: false },
};

const ALL_TRUE_HALAL = { noAlcohol: true, noPork: true, noGambling: true };

describe('PATCH /api/admin/review-provider — submitted halal payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(adminUser);
    mockIsAdmin.mockResolvedValue(true);
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'approved',
      review_feedback: null,
    });
    mockStoredValues.mockResolvedValue(STORED_ALL_FALSE);
    mockHalalCheck.mockResolvedValue({
      allAttested: true,
      missing: [],
      missingLabels: [],
      denied: [],
      deniedLabels: [],
      unanswered: [],
      unansweredLabels: [],
      sourceTable: 'food_providers',
    });
  });

  it('approves when the submitted answers are all true even though the stored row is all-false', async () => {
    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'approved', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(200);
    // The gate is evaluated on the merged answers; the review call carries them
    // and the reviewer id in one atomic request.
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'approved',
      null,
      undefined,
      'admin-id',
      ALL_TRUE_HALAL,
    );
  });

  it('returns 422 naming a submitted false answer as denied, and writes nothing', async () => {
    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'approved',
        halal: { noAlcohol: false, noPork: true, noGambling: true },
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('halal attestation incomplete');
    expect(json.denied).toEqual(['no_alcohol']);
    expect(json.unanswered).toEqual([]);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('returns 422 with a submitted null answer in unanswered, not denied', async () => {
    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'approved',
        halal: { noAlcohol: true, noPork: true, noGambling: null },
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.denied).toEqual([]);
    expect(json.unanswered).toEqual(['no_gambling']);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('overlays submitted answers on stored values key by key', async () => {
    // Stored all-false; the admin answered only noGambling — the two unanswered
    // fields keep their stored false and land in denied.
    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'approved',
        halal: { noGambling: true },
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.denied).toEqual(['no_alcohol', 'no_pork']);
    expect(json.unanswered).toEqual([]);
  });

  it('treats a missing extension row as all-unanswered when the payload is partial', async () => {
    mockStoredValues.mockResolvedValue({ sourceTable: 'food_providers', values: null });

    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'approved',
        halal: { noAlcohol: true },
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.unanswered).toEqual(['no_pork', 'no_gambling']);
  });

  it('falls back to stored values when halal is omitted (provider list path)', async () => {
    mockHalalCheck.mockResolvedValue({
      allAttested: false,
      missing: ['no_alcohol'],
      missingLabels: ['Kein Alkohol'],
      denied: ['no_alcohol'],
      deniedLabels: ['Kein Alkohol'],
      unanswered: [],
      unansweredLabels: [],
      sourceTable: 'food_providers',
    });

    const res = await PATCH(makeRequest({ providerId: validId, reviewStatus: 'approved' }));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.denied).toEqual(['no_alcohol']);
    expect(mockStoredValues).not.toHaveBeenCalled();
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('rejects with a reason plus halal answers: gate skipped, answers forwarded', async () => {
    mockReview.mockResolvedValue({
      provider_id: validId,
      provider_name: 'Test Provider',
      review_status: 'rejected',
      review_feedback: 'Not verifiable',
    });

    const res = await PATCH(
      makeRequest({
        providerId: validId,
        reviewStatus: 'rejected',
        reviewFeedback: 'Not verifiable',
        halal: { noAlcohol: false, noPork: null, noGambling: true },
      }),
    );

    expect(res.status).toBe(200);
    expect(mockHalalCheck).not.toHaveBeenCalled();
    expect(mockStoredValues).not.toHaveBeenCalled();
    expect(mockReview).toHaveBeenCalledWith(
      validId,
      'rejected',
      'Not verifiable',
      undefined,
      'admin-id',
      { noAlcohol: false, noPork: null, noGambling: true },
    );
  });

  it('rejects with no reason -> 400 and no write', async () => {
    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'rejected', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(400);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('maps an RPC CONFLICT error to 409', async () => {
    mockReview.mockRejectedValue(
      new Error(
        'CONFLICT: Provider was modified by another reviewer. Please refresh and try again.',
      ),
    );

    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'approved', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(409);
  });

  it('maps an RPC HALAL_GATE error to 422', async () => {
    mockReview.mockRejectedValue(new Error('HALAL_GATE: denied=[no_alcohol], unanswered=[]'));

    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'approved', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(422);
  });

  it('returns 401 without a session and never reaches the write', async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'approved', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(401);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-admin role and never reaches the write', async () => {
    mockIsAdmin.mockResolvedValue(false);

    const res = await PATCH(
      makeRequest({ providerId: validId, reviewStatus: 'approved', halal: ALL_TRUE_HALAL }),
    );

    expect(res.status).toBe(403);
    expect(mockReview).not.toHaveBeenCalled();
  });
});
