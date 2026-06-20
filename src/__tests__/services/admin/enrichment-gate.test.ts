import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkEnrichmentAlcoholConflict } from '@/services/admin/enrichment-gate';

// ─── Dynamic Supabase Mock ────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

/**
 * Configure query chain mocks for a test.
 * The implementation does:
 *   .from('food_providers').select('no_alcohol').eq('provider_id', id).maybeSingle()
 *   .from('enrichment_candidates').select(...).eq('provider_id', id).eq('field_name', 'no_alcohol').eq('status', 'pending').eq('proposed_value', false)
 */
function setupMocks(options: {
  foodProviderResult: () => Promise<{ data: unknown; error: unknown }>;
  enrichmentResult: () => Promise<{ data: unknown; error: unknown }>;
}) {
  // enrichment chain: select → eq1 → eq2 → eq3 → eq4
  const enrichmentEq4 = vi.fn().mockImplementation(options.enrichmentResult);
  const enrichmentEq3 = vi.fn().mockReturnValue({ eq: enrichmentEq4 });
  const enrichmentEq2 = vi.fn().mockReturnValue({ eq: enrichmentEq3 });
  const enrichmentEq1 = vi.fn().mockReturnValue({ eq: enrichmentEq2 });
  const enrichmentSelect = vi.fn().mockReturnValue({ eq: enrichmentEq1 });

  // food_providers chain: select → eq → maybeSingle
  const foodMaybeSingle = vi.fn().mockImplementation(options.foodProviderResult);
  const foodEq = vi.fn().mockReturnValue({ maybeSingle: foodMaybeSingle });
  const foodSelect = vi.fn().mockReturnValue({ eq: foodEq });

  // Route calls based on table name
  mockFrom.mockImplementation((table: string) => {
    if (table === 'food_providers') return { select: foodSelect };
    if (table === 'enrichment_candidates') return { select: enrichmentSelect };
    throw new Error(`Unexpected table: ${table}`);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkEnrichmentAlcoholConflict', () => {
  const validProviderId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasConflict=false when no enrichment candidates exist', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: { no_alcohol: true }, error: null }),
      enrichmentResult: () => Promise.resolve({ data: [], error: null }),
    });

    const result = await checkEnrichmentAlcoholConflict(validProviderId);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('returns hasConflict=false when food_providers.no_alcohol is false', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: { no_alcohol: false }, error: null }),
      enrichmentResult: () => Promise.resolve({ data: [], error: null }),
    });

    const result = await checkEnrichmentAlcoholConflict(validProviderId);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('returns hasConflict=false when food_providers row does not exist', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: null, error: null }),
      enrichmentResult: () => Promise.resolve({ data: [], error: null }),
    });

    const result = await checkEnrichmentAlcoholConflict(validProviderId);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('returns hasConflict=true when enrichment proposes no_alcohol=false for no_alcohol=true provider', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: { no_alcohol: true }, error: null }),
      enrichmentResult: () => Promise.resolve({
        data: [
          {
            id: 'candidate-1',
            source: 'wolt',
            source_url: 'https://wolt.com/venue/test',
            enriched_at: '2026-06-20T10:00:00Z',
            proposed_value: false,
            current_value: true,
          },
        ],
        error: null,
      }),
    });

    const result = await checkEnrichmentAlcoholConflict(validProviderId);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual({
      candidateId: 'candidate-1',
      source: 'wolt',
      sourceUrl: 'https://wolt.com/venue/test',
      enrichedAt: '2026-06-20T10:00:00Z',
    });
  });

  it('returns multiple conflicts when multiple enrichment sources detect alcohol', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: { no_alcohol: true }, error: null }),
      enrichmentResult: () => Promise.resolve({
        data: [
          {
            id: 'candidate-1',
            source: 'wolt',
            source_url: 'https://wolt.com/venue/test',
            enriched_at: '2026-06-20T10:00:00Z',
            proposed_value: false,
            current_value: true,
          },
          {
            id: 'candidate-2',
            source: 'lieferando',
            source_url: 'https://lieferando.de/restaurant/test',
            enriched_at: '2026-06-20T11:00:00Z',
            proposed_value: false,
            current_value: true,
          },
        ],
        error: null,
      }),
    });

    const result = await checkEnrichmentAlcoholConflict(validProviderId);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts[0].source).toBe('wolt');
    expect(result.conflicts[1].source).toBe('lieferando');
  });

  it('throws error on database failure for food_providers', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({
        data: null,
        error: { message: 'DB error fetching food_providers' },
      }),
      enrichmentResult: () => Promise.resolve({ data: [], error: null }),
    });

    await expect(checkEnrichmentAlcoholConflict(validProviderId)).rejects.toThrow(
      'DB error fetching food_providers'
    );
  });

  it('throws error on database failure for enrichment_candidates', async () => {
    setupMocks({
      foodProviderResult: () => Promise.resolve({ data: { no_alcohol: true }, error: null }),
      enrichmentResult: () => Promise.resolve({
        data: null,
        error: { message: 'DB error fetching candidates' },
      }),
    });

    await expect(checkEnrichmentAlcoholConflict(validProviderId)).rejects.toThrow(
      'DB error fetching candidates'
    );
  });
});
