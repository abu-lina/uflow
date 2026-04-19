/**
 * Plan 090 M3: fetchCategoriesBySection service tests
 *
 * TDD Gate: written BEFORE creating fetchCategoriesBySection function.
 * Tests that the function returns categories filtered by section
 * based on how their associated providers/community_services are classified.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoriesBySection } from '@/services/categories';

// ─── Test data ────────────────────────────────────────────────────────────────

const FOOD_CATEGORY_UUID = 'food-cat-uuid-001';
const UMMAH_CATEGORY_UUID = 'ummah-cat-uuid-002';
const BUSINESS_CATEGORY_UUID = 'biz-cat-uuid-003';

const mockCategories = [
  { id: '1', category_id: FOOD_CATEGORY_UUID, name_de: 'Restaurant & Cafe', name_en: 'Restaurant & Cafe', created_at: '', updated_at: '' },
  { id: '2', category_id: UMMAH_CATEGORY_UUID, name_de: 'Moschee', name_en: 'Mosque', created_at: '', updated_at: '' },
  { id: '3', category_id: BUSINESS_CATEGORY_UUID, name_de: 'Handwerk', name_en: 'Crafts', created_at: '', updated_at: '' },
];

// ─── Mock Supabase client with per-test overrides ─────────────────────────────
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  get supabase() { return mockSupabase; },
}));

// Helper to build a mock chain resolving with { data, error }
function chainResolving(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve({ data, error });
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.returns = vi.fn().mockReturnValue(terminal);
  // Allow the chain itself to be awaited for the first query (no .returns call)
  chain.then = terminal.then.bind(terminal);
  chain.catch = terminal.catch.bind(terminal);
  return chain;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fetchCategoriesBySection (Plan 090 M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns food categories for food section', async () => {
    const providersChain = chainResolving([{ category_id: FOOD_CATEGORY_UUID }]);
    const categoriesChain = chainResolving([mockCategories[0]]);
    mockSupabase.from
      .mockReturnValueOnce(providersChain)   // providers query
      .mockReturnValueOnce(categoriesChain); // categories query

    const result = await fetchCategoriesBySection('food');
    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(FOOD_CATEGORY_UUID);
  });

  it('returns ummah categories for ummah section', async () => {
    const csChain = chainResolving([{ category_id: UMMAH_CATEGORY_UUID }]);
    const categoriesChain = chainResolving([mockCategories[1]]);
    mockSupabase.from
      .mockReturnValueOnce(csChain)          // community_services query
      .mockReturnValueOnce(categoriesChain); // categories query

    const result = await fetchCategoriesBySection('ummah');
    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(UMMAH_CATEGORY_UUID);
  });

  it('returns business categories for business section', async () => {
    const providersChain = chainResolving([{ category_id: BUSINESS_CATEGORY_UUID }]);
    const categoriesChain = chainResolving([mockCategories[2]]);
    mockSupabase.from
      .mockReturnValueOnce(providersChain)   // providers query
      .mockReturnValueOnce(categoriesChain); // categories query

    const result = await fetchCategoriesBySection('business');
    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(BUSINESS_CATEGORY_UUID);
  });

  it('returns empty array when no categories exist for a section', async () => {
    const emptyChain = chainResolving([]);
    mockSupabase.from.mockReturnValueOnce(emptyChain);

    const result = await fetchCategoriesBySection('food');
    expect(result).toHaveLength(0);
  });

  it('deduplicates category IDs before fetching categories', async () => {
    const providersChain = chainResolving([
      { category_id: FOOD_CATEGORY_UUID },
      { category_id: FOOD_CATEGORY_UUID }, // duplicate
    ]);
    const categoriesChain = chainResolving([mockCategories[0]]);
    mockSupabase.from
      .mockReturnValueOnce(providersChain)
      .mockReturnValueOnce(categoriesChain);

    const result = await fetchCategoriesBySection('food');
    expect(result).toHaveLength(1);
    // Verify categories query was called with deduplicated IDs
    const categoriesFromCall = mockSupabase.from.mock.calls[1][0];
    expect(categoriesFromCall).toBe('categories');
    const inCall = (categoriesChain.in as ReturnType<typeof vi.fn>).mock.calls[0][1] as string[];
    expect(inCall).toHaveLength(1);
    expect(inCall[0]).toBe(FOOD_CATEGORY_UUID);
  });
});
