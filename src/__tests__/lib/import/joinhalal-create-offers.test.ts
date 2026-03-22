/**
 * Unit tests for createMissingOffers — Plan 053 (auto-create unmatched Speisen).
 *
 * TDD Red → Green: tests written BEFORE implementation.
 * Tests the offer auto-creation function that inserts missing Speisen
 * into the offers table and returns fresh offer IDs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: mockUpsert.mockResolvedValue({ data: null, error: null }),
    select: mockSelect.mockReturnValue({
      in: mockIn,
    }),
  })),
};

// Must import AFTER mock setup
import { createMissingOffers, SPEISEN_CATEGORY_ID } from '@/lib/import/joinhalal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createMissingOffers', () => {
  it('returns empty array when unmatchedSpeisen is empty', async () => {
    const result = await createMissingOffers(mockSupabase as never, []);
    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('inserts missing offers with correct category_id and created_by=null', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({
      data: [
        { offer_id: 'new-uuid-1', name_de: 'Sushi' },
        { offer_id: 'new-uuid-2', name_de: 'Ramen' },
      ],
      error: null,
    });

    const result = await createMissingOffers(mockSupabase as never, ['Sushi', 'Ramen']);

    // Verify upsert call with correct schema fields
    expect(mockSupabase.from).toHaveBeenCalledWith('offers');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name_de: 'Sushi',
          category_id: SPEISEN_CATEGORY_ID,
          created_by: null,
        }),
        expect.objectContaining({
          name_de: 'Ramen',
          category_id: SPEISEN_CATEGORY_ID,
          created_by: null,
        }),
      ]),
      { onConflict: 'name_de', ignoreDuplicates: true }
    );

    // Returns newly created offer records
    expect(result).toEqual([
      { offer_id: 'new-uuid-1', name_de: 'Sushi' },
      { offer_id: 'new-uuid-2', name_de: 'Ramen' },
    ]);
  });

  it('uses ON CONFLICT (name_de) DO NOTHING for idempotency', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({
      data: [{ offer_id: 'existing-uuid', name_de: 'Döner' }],
      error: null,
    });

    await createMissingOffers(mockSupabase as never, ['Döner']);

    // Verify upsert was called with ignoreDuplicates
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: 'name_de', ignoreDuplicates: true }
    );
  });

  it('deduplicates input Speisen before inserting (case-insensitive)', async () => {
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({
      data: [{ offer_id: 'uuid-1', name_de: 'Sushi' }],
      error: null,
    });

    await createMissingOffers(mockSupabase as never, ['Sushi', 'sushi', 'SUSHI']);

    // Should only insert one row despite 3 input variants
    const upsertArgs = mockUpsert.mock.calls[0][0];
    expect(upsertArgs).toHaveLength(1);
    expect(upsertArgs[0].name_de).toBe('Sushi'); // Preserves first-seen casing
  });

  it('exports SPEISEN_CATEGORY_ID constant matching Essen & Trinken UUID', () => {
    expect(SPEISEN_CATEGORY_ID).toBe('20c10efe-404b-4a39-bb81-5089a0332d78');
  });
});
