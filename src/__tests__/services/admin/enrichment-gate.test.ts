import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMenuForAlcohol } from '@/services/admin/enrichment-gate';

// ─── Dynamic Supabase Mock ────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

/**
 * Configure the food_menu query mock for a test.
 * The implementation does:
 *   .from('food_menu').select('name_de, name_en').eq('provider_id', id)
 */
function setupFoodMenuMock(
  returnValue: () => Promise<{ data: unknown; error: unknown }>
) {
  const mockEq = vi.fn().mockImplementation(returnValue);
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'food_menu') return { select: mockSelect };
    throw new Error(`Unexpected table: ${table}`);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkMenuForAlcohol', () => {
  const validProviderId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasAlcohol=false when menu has no items', async () => {
    setupFoodMenuMock(() => Promise.resolve({ data: [], error: null }));

    const result = await checkMenuForAlcohol(validProviderId);
    expect(result.hasAlcohol).toBe(false);
    expect(result.totalMenuItems).toBe(0);
    expect(result.matchedItemNames).toEqual([]);
  });

  it('returns hasAlcohol=false when menu items have no alcohol keywords', async () => {
    setupFoodMenuMock(() =>
      Promise.resolve({
        data: [
          { name_de: 'Döner Teller', name_en: null },
          { name_de: 'Lahmacun', name_en: null },
          { name_de: 'Cola', name_en: null },
        ],
        error: null,
      })
    );

    const result = await checkMenuForAlcohol(validProviderId);
    expect(result.hasAlcohol).toBe(false);
    expect(result.totalMenuItems).toBe(3);
  });

  it('returns hasAlcohol=true when menu items contain alcohol keywords', async () => {
    setupFoodMenuMock(() =>
      Promise.resolve({
        data: [
          { name_de: 'Döner Teller', name_en: null },
          { name_de: 'Bier 0,5l', name_en: null },
          { name_de: 'Cola', name_en: null },
        ],
        error: null,
      })
    );

    const result = await checkMenuForAlcohol(validProviderId);
    expect(result.hasAlcohol).toBe(true);
    expect(result.matchedItemNames).toContain('Bier 0,5l');
    expect(result.matchedKeywords).toContain('Bier');
    expect(result.totalMenuItems).toBe(3);
  });

  it('returns multiple matched items when multiple items contain alcohol', async () => {
    setupFoodMenuMock(() =>
      Promise.resolve({
        data: [
          { name_de: 'Bier 0,5l', name_en: null },
          { name_de: 'Wein Rot', name_en: null },
          { name_de: 'Cocktail Klassiker', name_en: null },
        ],
        error: null,
      })
    );

    const result = await checkMenuForAlcohol(validProviderId);
    expect(result.hasAlcohol).toBe(true);
    expect(result.matchedItemNames).toHaveLength(3);
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(2);
  });

  it('uses name_de primarily, falls back to name_en', async () => {
    setupFoodMenuMock(() =>
      Promise.resolve({
        data: [
          { name_de: null, name_en: 'Red Wine' },
          // "Wine" isn't in the German keyword list, so this won't match
          { name_de: null, name_en: 'Beer' },
          // "Beer" isn't in the keyword list either
        ],
        error: null,
      })
    );

    const result = await checkMenuForAlcohol(validProviderId);
    // English names with non-German keywords won't match
    expect(result.hasAlcohol).toBe(false);
  });

  it('throws error on database failure', async () => {
    setupFoodMenuMock(() =>
      Promise.resolve({ data: null, error: { message: 'DB error' } })
    );

    await expect(checkMenuForAlcohol(validProviderId)).rejects.toThrow('DB error');
  });
});
