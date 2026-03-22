/**
 * Unit tests for resolveOfferIds — Plan 051 (Speisen → offers_ids mapping).
 *
 * TDD Red → Green: tests written BEFORE implementation.
 * These test the pure resolution function in joinhalal.ts.
 */

import { describe, it, expect } from 'vitest';
import { resolveOfferIds, type Offer } from '@/lib/import/joinhalal';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OFFERS_CATALOG: Offer[] = [
  { offer_id: 'offer-001', name_de: 'Burger' },
  { offer_id: 'offer-002', name_de: 'Döner' },
  { offer_id: 'offer-003', name_de: 'Pommes' },
  { offer_id: 'offer-004', name_de: 'Falafel' },
  { offer_id: 'offer-005', name_de: 'Steak' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveOfferIds', () => {
  it('resolves matching Speisen values to offer_id UUIDs', () => {
    const result = resolveOfferIds(['Burger', 'Döner'], OFFERS_CATALOG);
    expect(result.matchedIds).toEqual(['offer-001', 'offer-002']);
    expect(result.unmatchedSpeisen).toEqual([]);
  });

  it('reports unmatched Speisen values that have no catalog entry', () => {
    const result = resolveOfferIds(['Burger', 'Sushi', 'Tacos'], OFFERS_CATALOG);
    expect(result.matchedIds).toEqual(['offer-001']);
    expect(result.unmatchedSpeisen).toEqual(['Sushi', 'Tacos']);
  });

  it('performs case-insensitive matching', () => {
    const result = resolveOfferIds(['burger', 'DÖNER', 'fAlAfEl'], OFFERS_CATALOG);
    expect(result.matchedIds).toEqual(['offer-001', 'offer-002', 'offer-004']);
    expect(result.unmatchedSpeisen).toEqual([]);
  });

  it('returns empty arrays for empty input', () => {
    const result = resolveOfferIds([], OFFERS_CATALOG);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedSpeisen).toEqual([]);
  });

  it('returns all unmatched when catalog is empty', () => {
    const result = resolveOfferIds(['Burger', 'Döner'], []);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedSpeisen).toEqual(['Burger', 'Döner']);
  });

  it('does not emit duplicate offer IDs for repeated input values', () => {
    const result = resolveOfferIds(['Burger', 'Burger', 'Döner'], OFFERS_CATALOG);
    expect(result.matchedIds).toEqual(['offer-001', 'offer-002']);
    expect(result.unmatchedSpeisen).toEqual([]);
  });

  it('handles a mix of matched and unmatched values', () => {
    const result = resolveOfferIds(
      ['Burger', 'Sushi', 'Pommes', 'Ramen', 'Steak'],
      OFFERS_CATALOG
    );
    expect(result.matchedIds).toEqual(['offer-001', 'offer-003', 'offer-005']);
    expect(result.unmatchedSpeisen).toEqual(['Sushi', 'Ramen']);
  });

  it('resolves all catalog values when all Speisen match', () => {
    const result = resolveOfferIds(
      ['Burger', 'Döner', 'Pommes', 'Falafel', 'Steak'],
      OFFERS_CATALOG
    );
    expect(result.matchedIds).toEqual([
      'offer-001', 'offer-002', 'offer-003', 'offer-004', 'offer-005',
    ]);
    expect(result.unmatchedSpeisen).toEqual([]);
  });
});
