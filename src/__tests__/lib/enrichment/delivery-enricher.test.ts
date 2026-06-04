import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  enrichFromWolt,
  buildDeliveryCandidates,
  type DeliveryPlatformSnapshot,
} from '@/lib/enrichment/delivery-enricher';
import type { WoltClient } from '@/lib/enrichment/delivery-platform/wolt-client';

function createMockWoltClient(overrides?: Partial<WoltClient>): WoltClient {
  return {
    geocodeCity: vi.fn().mockResolvedValue({ lat: 52.52, lon: 13.405 }),
    searchVenuesByLocation: vi.fn().mockResolvedValue({
      venues: [
        {
          name: 'Döner Haus',
          slug: 'doner-haus',
          city: 'Berlin',
          venue_preview_items: [
            { name: 'Pizza Margherita', price: 850 },
            { name: 'Döner Teller', price: 1200 },
            { name: 'Bier 0.5L', price: 400 },
          ],
        },
      ],
      lat: 52.52,
      lon: 13.405,
    }),
fetchMenuData: vi.fn().mockResolvedValue({ items: [], categories: [] }),
    // Note: menu extraction uses venue_preview_items from discovery API
    ...overrides,
  };
}

describe('enrichFromWolt', () => {
  it('returns candidates for a fully matched provider', async () => {
    const provider: DeliveryPlatformSnapshot = {
      provider_id: 'prov-001',
      provider_name: 'Döner Haus',
      address_city: 'Berlin',
      listing_type: 'food',
      opening_hours: null,
      no_alcohol: null,
    };

    const mockClient = createMockWoltClient();
    const result = await enrichFromWolt(provider, mockClient);

    expect(result.providerId).toBe('prov-001');
    expect(result.venueSlug).toBe('doner-haus');
    expect(result.matchConfidence).toBeGreaterThan(0);
    expect(result.error).toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('returns error when provider has no city', async () => {
    const provider: DeliveryPlatformSnapshot = {
      provider_id: 'prov-002',
      provider_name: 'Test',
      address_city: null,
      listing_type: 'food',
      opening_hours: null,
      no_alcohol: null,
    };

    const mockClient = createMockWoltClient();
    const result = await enrichFromWolt(provider, mockClient);

    expect(result.venueSlug).toBeNull();
    expect(result.error).toBe('Provider has no city set');
    expect(result.candidates).toHaveLength(0);
  });

  it('returns error when geocoder cannot find city', async () => {
    const provider: DeliveryPlatformSnapshot = {
      provider_id: 'prov-003',
      provider_name: 'Test',
      address_city: 'SmallVillage',
      listing_type: 'food',
      opening_hours: null,
      no_alcohol: null,
    };

    const mockClient = createMockWoltClient({
      geocodeCity: vi.fn().mockResolvedValue(null),
    });
    const result = await enrichFromWolt(provider, mockClient);

    expect(result.error).toContain('City not found');
    expect(result.candidates).toHaveLength(0);
  });

  it('returns error when no Wolt venues found', async () => {
    const provider: DeliveryPlatformSnapshot = {
      provider_id: 'prov-004',
      provider_name: 'Test',
      address_city: 'Berlin',
      listing_type: 'food',
      opening_hours: null,
      no_alcohol: null,
    };

    const mockClient = createMockWoltClient({
      searchVenuesByLocation: vi.fn().mockResolvedValue({ venues: [], lat: 52.52, lon: 13.405 }),
    });
    const result = await enrichFromWolt(provider, mockClient);

    expect(result.error).toBe('No Wolt venues found for location');
    expect(result.candidates).toHaveLength(0);
  });

  it('returns error when no match found', async () => {
    const provider: DeliveryPlatformSnapshot = {
      provider_id: 'prov-005',
      provider_name: 'Unique Unmatched Name',
      address_city: 'Berlin',
      listing_type: 'food',
      opening_hours: null,
      no_alcohol: null,
    };

    const mockClient = createMockWoltClient();
    const result = await enrichFromWolt(provider, mockClient);

    expect(result.error).toBe('No Wolt venue matched');
    expect(result.candidates).toHaveLength(0);
  });
});

describe('buildDeliveryCandidates', () => {
  it('creates opening_hours candidate when hours change', () => {
    const currentHours = { monday: { open: '09:00', close: '22:00' } };
    const proposedHours = { monday: { open: '10:00', close: '23:00' } };

    const candidates = buildDeliveryCandidates(
      'prov-001',
      'https://wolt.com/de/deu/venue/test',
      currentHours,
      null,
      proposedHours,
      false,
    );

    expect(candidates.length).toBeGreaterThan(0);
    const hoursCandidate = candidates.find((c) => c.field_name === 'opening_hours');
    expect(hoursCandidate).toBeDefined();
    expect(hoursCandidate!.source).toBe('wolt');
    expect(hoursCandidate!.proposed_value).toEqual(proposedHours);
    expect(hoursCandidate!.current_value).toEqual(currentHours);
  });

  it('creates no_alcohol candidate when alcohol value changes', () => {
    const candidates = buildDeliveryCandidates(
      'prov-001',
      'https://wolt.com/de/deu/venue/test',
      null,
      null,
      null,
      true,
    );

    expect(candidates.length).toBeGreaterThan(0);
    const alcoholCandidate = candidates.find((c) => c.field_name === 'no_alcohol');
    expect(alcoholCandidate).toBeDefined();
    expect(alcoholCandidate!.source).toBe('wolt');
    expect(alcoholCandidate!.proposed_value).toBe(true);
    expect(alcoholCandidate!.current_value).toBeNull();
  });

  it('returns empty candidates when values are identical', () => {
    const currentHours = { monday: { open: '09:00', close: '22:00' } };
    const candidates = buildDeliveryCandidates(
      'prov-001',
      'https://wolt.com/de/deu/venue/test',
      currentHours,
      null,
      currentHours,
      null,
    );

    expect(candidates).toHaveLength(0);
  });

  it('creates both candidates when both fields change', () => {
    const currentHours = { monday: { open: '09:00', close: '22:00' } };
    const proposedHours = { monday: { open: '10:00', close: '23:00' } };

    const candidates = buildDeliveryCandidates(
      'prov-001',
      'https://wolt.com/de/deu/venue/test',
      currentHours,
      null,
      proposedHours,
      true,
    );

    expect(candidates).toHaveLength(2);
    const fieldNames = candidates.map((c) => c.field_name);
    expect(fieldNames).toContain('opening_hours');
    expect(fieldNames).toContain('no_alcohol');
  });

  it('handles additive opening_hours (current is null)', () => {
    const proposedHours = { monday: { open: '09:00', close: '22:00' } };
    const candidates = buildDeliveryCandidates(
      'prov-001',
      'https://wolt.com/de/deu/venue/test',
      null,
      null,
      proposedHours,
      null,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].field_name).toBe('opening_hours');
    expect(candidates[0].proposed_value).toEqual(proposedHours);
  });
});
