import { describe, it, expect } from 'vitest';
import {
  buildAutoApplyPayload,
  type AutoApplyInput,
  type DeliveryLinkInput,
} from '../auto-apply-payload';

function makeCandidate(field_name: string, current_value: unknown, proposed_value: unknown) {
  return {
    provider_id: 'prov-123',
    source: 'wolt',
    source_url: 'https://wolt.com/venue/test-slug',
    field_name,
    proposed_value,
    current_value,
  };
}

describe('buildAutoApplyPayload', () => {
  it('includes additive change (current=null, proposed=value)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: null },
      proposed: [makeCandidate('contact_phone', null, '+4912345')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['contact_phone']);
    expect(output.rpcPayload).toEqual({
      providers: { contact_phone: '+4912345' },
    });
  });

  it('excludes no-change (current=same value, proposed=same value)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: '+4912345' },
      proposed: [makeCandidate('contact_phone', '+4912345', '+4912345')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
    expect(output.rpcPayload).toEqual({});
  });

  it('excludes conflict (current=value_A, proposed=value_B)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: '+491111' },
      proposed: [makeCandidate('contact_phone', '+491111', '+492222')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
    expect(output.rpcPayload).toEqual({});
  });

  it('includes additive when current is empty string and proposed is value (MEDIUM-1)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: '' },
      proposed: [makeCandidate('contact_phone', '', '+4912345')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['contact_phone']);
    expect((output.rpcPayload.providers as Record<string, unknown>)?.contact_phone).toBe(
      '+4912345',
    );
  });

  it('excludes additive when proposed is empty string (MEDIUM-1)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: null },
      proposed: [makeCandidate('contact_phone', null, '')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
    expect(output.rpcPayload).toEqual({});
  });

  it('excludes when both current and proposed are empty strings (MEDIUM-1)', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: '' },
      proposed: [makeCandidate('contact_phone', '', '')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
    expect(output.rpcPayload).toEqual({});
  });

  it('maps no_alcohol to food_providers sub-object', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { no_alcohol: null },
      proposed: [makeCandidate('no_alcohol', null, true)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['no_alcohol']);
    expect(output.rpcPayload).toEqual({
      food_providers: { no_alcohol: true },
    });
    expect(output.rpcPayload.providers).toBeUndefined();
  });

  it('maps opening_hours to providers sub-object', () => {
    const hours = { monday: { open: '09:00', close: '18:00' } };
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { opening_hours: null },
      proposed: [makeCandidate('opening_hours', null, hours)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['opening_hours']);
    expect((output.rpcPayload.providers as Record<string, unknown>)?.opening_hours).toEqual(hours);
  });

  it('extracts delivery_links to separate array', () => {
    const links: DeliveryLinkInput[] = [
      { platform: 'wolt', platform_url: 'https://wolt.com/venue/x', is_active: true },
    ];
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { delivery_links: null },
      proposed: [makeCandidate('delivery_links', null, links)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['delivery_links']);
    expect(output.deliveryLinks).toEqual(links);
    expect(output.rpcPayload).toEqual({});
  });

  it('extracts menu_items to separate array', () => {
    const items = [{ name_de: 'Döner', price_cents: 850 }];
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { menu_items: null },
      proposed: [makeCandidate('menu_items', null, items)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['menu_items']);
    expect(output.menuItems).toEqual(items);
    expect(output.rpcPayload).toEqual({});
  });

  it('handles mixed candidates: additive + conflict + no-change', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: {
        contact_phone: null,
        social_website: 'https://existing.com',
        no_alcohol: null,
      },
      proposed: [
        makeCandidate('contact_phone', null, '+4912345'),
        makeCandidate('social_website', 'https://existing.com', 'https://new.com'),
        makeCandidate('no_alcohol', null, true),
      ],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['contact_phone', 'no_alcohol']);
    expect(output.rpcPayload).toEqual({
      providers: { contact_phone: '+4912345' },
      food_providers: { no_alcohol: true },
    });
  });

  it('returns empty payload for empty proposed array', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: {},
      proposed: [],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
    expect(output.rpcPayload).toEqual({});
    expect(output.deliveryLinks).toBeNull();
    expect(output.menuItems).toBeNull();
  });

  it('excludes null proposed_value even when additive', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: null },
      proposed: [makeCandidate('contact_phone', null, null)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual([]);
  });

  it('handles no_pork and no_gambling as food_providers fields', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { no_pork: null, no_gambling: null },
      proposed: [makeCandidate('no_pork', null, true), makeCandidate('no_gambling', null, false)],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toEqual(['no_pork', 'no_gambling']);
    expect(output.rpcPayload).toEqual({
      food_providers: { no_pork: true, no_gambling: false },
    });
  });

  it('returns valid rpcPayload structure with both providers and food_providers', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: null, social_website: null, no_alcohol: null },
      proposed: [
        makeCandidate('contact_phone', null, '+4912345'),
        makeCandidate('social_website', null, 'https://example.com'),
        makeCandidate('no_alcohol', null, true),
      ],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.rpcPayload).toHaveProperty('providers');
    expect(output.rpcPayload).toHaveProperty('food_providers');
    expect(Object.keys(output.rpcPayload)).toHaveLength(2);
  });

  // --- Location fields (Root Cause 2 fix) ---

  it('maps address and coordinate fields to locations sub-object', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: {
        address_street: null,
        address_zip: null,
        address_city: null,
        address_country: null,
        location_latitude: null,
        location_longitude: null,
      },
      proposed: [
        makeCandidate('address_street', null, 'Hauptstr. 1'),
        makeCandidate('address_zip', null, '10115'),
        makeCandidate('address_city', null, 'Berlin'),
        makeCandidate('address_country', null, 'DE'),
        makeCandidate('location_latitude', null, 52.52),
        makeCandidate('location_longitude', null, 13.405),
      ],
    };

    const output = buildAutoApplyPayload(input);

    // Location fields should go into both providers (legacy) and locations
    expect(output.rpcPayload.providers).toBeDefined();
    const providers = output.rpcPayload.providers as Record<string, unknown>;
    expect(providers.address_street).toBe('Hauptstr. 1');

    // Must also produce a locations array for the RPC
    expect(output.rpcPayload.locations).toBeDefined();
    const locations = output.rpcPayload.locations as Record<string, unknown>[];
    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      address_street: 'Hauptstr. 1',
      address_zip: '10115',
      address_city: 'Berlin',
      address_country: 'DE',
      location_latitude: 52.52,
      location_longitude: 13.405,
      is_primary: true,
    });
  });

  it('includes opening_hours in locations sub-object when present', () => {
    const hours = { monday: { open: '09:00', close: '18:00' } };
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { opening_hours: null, address_city: null },
      proposed: [
        makeCandidate('opening_hours', null, hours),
        makeCandidate('address_city', null, 'Munich'),
      ],
    };

    const output = buildAutoApplyPayload(input);

    const locations = output.rpcPayload.locations as Record<string, unknown>[];
    expect(locations).toBeDefined();
    expect(locations[0]).toMatchObject({
      opening_hours: hours,
      address_city: 'Munich',
      is_primary: true,
    });
  });

  it('does not produce locations when no location-related fields are present', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { contact_phone: null },
      proposed: [makeCandidate('contact_phone', null, '+4912345')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.rpcPayload.locations).toBeUndefined();
  });

  it('maps category_id to providers sub-object', () => {
    const input: AutoApplyInput = {
      providerId: 'prov-123',
      current: { category_id: null },
      proposed: [makeCandidate('category_id', null, 'some-uuid-value')],
    };

    const output = buildAutoApplyPayload(input);

    expect(output.appliedFields).toContain('category_id');
    const providers = output.rpcPayload.providers as Record<string, unknown>;
    expect(providers.category_id).toBe('some-uuid-value');
  });
});
