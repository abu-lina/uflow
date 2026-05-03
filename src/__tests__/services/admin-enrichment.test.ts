/**
 * Tests for src/services/admin/enrichment.ts — ownership guard
 *
 * TDD: Tests written BEFORE implementation of the provider_owner_id IS NULL guard.
 * Plan 065 — Scope revision: approved providers with provider_owner_id IS NULL only.
 *
 * These tests verify that approveCandidate() and bulkApproveByProvider() fail
 * closed when the target provider has a non-NULL provider_owner_id — i.e., the
 * provider was claimed after candidate generation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase admin mock ─────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import {
  approveCandidate,
  bulkApproveByProvider,
} from '@/services/admin/enrichment';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CANDIDATE_ID = 'cand-001';
const PROVIDER_ID = 'prov-001';
const REVIEWER_ID = 'admin-001';

function makePendingCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: CANDIDATE_ID,
    provider_id: PROVIDER_ID,
    field_name: 'offers_ids',
    proposed_value: ['offer-new'],
    current_value: ['offer-old'],
    status: 'pending',
    source: 'joinhalal',
    source_url: 'https://joinhalal.com/page',
    ...overrides,
  };
}

// ─── approveCandidate: ownership guard ────────────────────────────────────────

describe('approveCandidate — ownership guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects approval when provider has a non-NULL provider_owner_id', async () => {
    // candidate fetch: .select('*').eq().eq().single()
    const candidateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: makePendingCandidate(),
        error: null,
      }),
    };

    // ownership check: .select('provider_owner_id').eq().single()
    const ownershipChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { provider_owner_id: 'owner-uuid-123' },
        error: null,
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'enrichment_candidates') return candidateChain;
      if (table === 'providers') return ownershipChain;
      return candidateChain;
    });

    const result = await approveCandidate(CANDIDATE_ID, REVIEWER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('owner');
  });

  it('proceeds with approval when provider has NULL provider_owner_id', async () => {
    // candidate fetch: .select('*').eq().eq().single()
    const candidateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: makePendingCandidate(),
        error: null,
      }),
    };

    // ownership check: .select('provider_owner_id').eq().single()
    const ownershipChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { provider_owner_id: null },
        error: null,
      }),
    };

    // provider update: .update({}).eq()
    const providerUpdateChain = {
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    // candidate status update: .update({}).eq()
    const candidateUpdateChain = {
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    let providersCalls = 0;
    let candidatesCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'enrichment_candidates') {
        candidatesCalls++;
        if (candidatesCalls === 1) return candidateChain;
        return candidateUpdateChain;
      }
      if (table === 'providers') {
        providersCalls++;
        if (providersCalls === 1) return ownershipChain;
        return providerUpdateChain;
      }
      return candidateChain;
    });

    const result = await approveCandidate(CANDIDATE_ID, REVIEWER_ID);

    expect(result.success).toBe(true);
  });

  it('applies image enrichment candidates for provider_images with append-only semantics', async () => {
    const candidateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: makePendingCandidate({
          field_name: 'provider_images',
          enrichment_type: 'image',
          source_service: 'unsplash',
          source_category: 'Turkish',
          image_url: 'https://cdn.example.com/new-image.webp',
          proposed_value: { urls: ['https://cdn.example.com/new-image.webp'] },
          current_value: { urls: ['https://cdn.example.com/old-image.webp'] },
        }),
        error: null,
      }),
    };

    const ownershipChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { provider_owner_id: null },
        error: null,
      }),
    };

    const providerUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const providerUpdateChain = {
      update: vi.fn(() => ({
        eq: providerUpdateEq,
      })),
    };

    const candidateUpdateChain = {
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };

    let providersCalls = 0;
    let candidatesCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'enrichment_candidates') {
        candidatesCalls++;
        if (candidatesCalls === 1) return candidateChain;
        return candidateUpdateChain;
      }
      if (table === 'providers') {
        providersCalls++;
        if (providersCalls === 1) return ownershipChain;
        return providerUpdateChain;
      }
      return candidateChain;
    });

    const result = await approveCandidate(CANDIDATE_ID, REVIEWER_ID);

    expect(result.success).toBe(true);
    expect(providerUpdateChain.update).toHaveBeenCalledTimes(1);
    expect(providerUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_images: {
          urls: [
            'https://cdn.example.com/old-image.webp',
            'https://cdn.example.com/new-image.webp',
          ],
        },
      })
    );
  });
});

// ─── bulkApproveByProvider: ownership guard ───────────────────────────────────

describe('bulkApproveByProvider — ownership guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects all approvals when provider has a non-NULL provider_owner_id', async () => {
    // ownership check: .select('provider_owner_id').eq().single()
    const ownershipChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { provider_owner_id: 'owner-uuid-123' },
        error: null,
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'providers') return ownershipChain;
      return ownershipChain;
    });

    const result = await bulkApproveByProvider(PROVIDER_ID, REVIEWER_ID);

    expect(result.approved).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('owner');
  });
});
