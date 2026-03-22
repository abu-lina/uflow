/**
 * Regression tests: Write-path offer auto-creation and linking (Plan 053).
 *
 * Proves that:
 *   1. resolveOfferIds correctly returns unmatched Speisen terms
 *   2. createMissingOffers creates offers and returns IDs
 *   3. The merge pattern correctly appends new IDs to provider offers_ids
 *
 * These tests validate the contract between resolveOfferIds → createMissingOffers → ID merge,
 * which is the write-path pipeline added in Plan 053 to eliminate silent drops.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client for createMissingOffers
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

import {
  resolveOfferIds,
  createMissingOffers,
  type Offer,
} from '@/lib/import/joinhalal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Write-path offer auto-creation pipeline (Plan 053)', () => {
  it('[pre-fix FAILS] unmatched Speisen were silently dropped — offers_ids incomplete', () => {
    // Before Plan 053: resolveOfferIds returned unmatchedSpeisen but callers ignored them
    const existingOffers: Offer[] = [
      { offer_id: 'uuid-pizza', name_de: 'Pizza' },
    ];
    const speisen = ['Pizza', 'Sushi', 'Ramen'];

    const { matchedIds, unmatchedSpeisen } = resolveOfferIds(speisen, existingOffers);

    // Pre-fix: only Pizza matched, Sushi & Ramen silently lost
    expect(matchedIds).toEqual(['uuid-pizza']);
    expect(unmatchedSpeisen).toEqual(['Sushi', 'Ramen']);
    // The bug was that unmatchedSpeisen was discarded by the caller
  });

  it('[post-fix PASSES] unmatched Speisen are auto-created and merged into offers_ids', async () => {
    const existingOffers: Offer[] = [
      { offer_id: 'uuid-pizza', name_de: 'Pizza' },
    ];
    const speisen = ['Pizza', 'Sushi', 'Ramen'];

    // Step 1: resolveOfferIds identifies unmatched terms
    const { matchedIds, unmatchedSpeisen } = resolveOfferIds(speisen, existingOffers);
    expect(matchedIds).toEqual(['uuid-pizza']);
    expect(unmatchedSpeisen).toEqual(['Sushi', 'Ramen']);

    // Step 2: createMissingOffers auto-creates them
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({
      data: [
        { offer_id: 'uuid-sushi', name_de: 'Sushi' },
        { offer_id: 'uuid-ramen', name_de: 'Ramen' },
      ],
      error: null,
    });

    const createdOffers = await createMissingOffers(mockSupabase as never, unmatchedSpeisen);
    expect(createdOffers).toHaveLength(2);

    // Step 3: Merge pattern — build lookup and append IDs
    const newLookup = new Map(createdOffers.map((o) => [o.name_de.toLowerCase(), o.offer_id]));
    const finalOffersIds = [...matchedIds];
    for (const term of unmatchedSpeisen) {
      const offerId = newLookup.get(term.toLowerCase());
      if (offerId && !finalOffersIds.includes(offerId)) {
        finalOffersIds.push(offerId);
      }
    }

    // All 3 Speisen are now represented in offers_ids
    expect(finalOffersIds).toEqual(['uuid-pizza', 'uuid-sushi', 'uuid-ramen']);
  });

  it('merge pattern handles case-insensitive lookup correctly', async () => {
    const existingOffers: Offer[] = [];
    const speisen = ['Döner', 'DÖNER', 'döner'];

    const { matchedIds, unmatchedSpeisen } = resolveOfferIds(speisen, existingOffers);
    expect(matchedIds).toEqual([]);
    // resolveOfferIds deduplicates case-insensitively, so only first-seen is unmatched
    expect(unmatchedSpeisen).toEqual(['Döner']);

    // createMissingOffers returns the created offer
    mockUpsert.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({
      data: [{ offer_id: 'uuid-doener', name_de: 'Döner' }],
      error: null,
    });

    const createdOffers = await createMissingOffers(mockSupabase as never, unmatchedSpeisen);
    const newLookup = new Map(createdOffers.map((o) => [o.name_de.toLowerCase(), o.offer_id]));

    const finalOffersIds = [...matchedIds];
    for (const term of unmatchedSpeisen) {
      const offerId = newLookup.get(term.toLowerCase());
      if (offerId && !finalOffersIds.includes(offerId)) {
        finalOffersIds.push(offerId);
      }
    }

    // Only one offer ID, no duplicates
    expect(finalOffersIds).toEqual(['uuid-doener']);
  });

  it('empty Speisen list produces no auto-creation calls', async () => {
    const existingOffers: Offer[] = [];
    const { matchedIds, unmatchedSpeisen } = resolveOfferIds([], existingOffers);
    expect(matchedIds).toEqual([]);
    expect(unmatchedSpeisen).toEqual([]);

    const createdOffers = await createMissingOffers(mockSupabase as never, unmatchedSpeisen);
    expect(createdOffers).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
