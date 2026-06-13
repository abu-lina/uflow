/**
 * Unit tests for provider-related Zod schemas in adminSchemas.ts
 *
 * Covers: providerEditUpdateSchema — new fields for Plan 145
 */

import { describe, it, expect, vi } from 'vitest';

vi.unmock('zod');

import { providerEditUpdateSchema } from '@/lib/validations/adminSchemas';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('providerEditUpdateSchema — Plan 145 new fields', () => {
  const base = { providerId: VALID_UUID };

  it('accepts a payload with all new optional fields', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      openingHours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: null,
      },
      verificationMethod: 'online',
      hasCertificate: false,
      certificateUrl: null,
      noAlcohol: true,
      noPork: false,
      noGambling: false,
      muslimOwned: true,
      hasPrayerSpace: false,
      familyFriendly: true,
      womenFriendly: false,
      childrenFriendly: true,
      makesDonations: false,
      hasParking: true,
      economicSolidarity: false,
      menuItems: [
        {
          name_de: 'Döner Teller',
          price_cents: 850,
          category: 'Hauptgerichte',
          sort_order: 1,
          is_available: true,
        },
      ],
      deliveryLinks: [
        {
          platform: 'wolt',
          platform_url: 'https://wolt.com/venue/test',
          is_active: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a minimal payload (providerId only)', () => {
    const result = providerEditUpdateSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('accepts openingHours as arbitrary JSONB', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      openingHours: { custom: 'value' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for nullable fields', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      verificationMethod: null,
      certificateUrl: null,
      openingHours: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid verificationMethod', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      verificationMethod: 'gold',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid deliveryLink platform', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      deliveryLinks: [
        { platform: 'deliveroo', platform_url: 'https://x.com', is_active: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects deliveryLink with invalid URL', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      deliveryLinks: [
        { platform: 'wolt', platform_url: 'not-a-url', is_active: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects menuItem with empty name_de', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      menuItems: [
        { name_de: '', price_cents: 500, sort_order: 0, is_available: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects menuItem with negative price_cents', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      menuItems: [
        { name_de: 'Item', price_cents: -1, sort_order: 0, is_available: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects certificateUrl exceeding 2000 characters', () => {
    const result = providerEditUpdateSchema.safeParse({
      ...base,
      certificateUrl: 'https://x.com/' + 'a'.repeat(2000),
    });
    expect(result.success).toBe(false);
  });

  it('restricts listingType to food, store, or null', () => {
    const food = providerEditUpdateSchema.safeParse({ ...base, listingType: 'food' });
    expect(food.success).toBe(true);

    const store = providerEditUpdateSchema.safeParse({ ...base, listingType: 'store' });
    expect(store.success).toBe(true);

    const nullType = providerEditUpdateSchema.safeParse({ ...base, listingType: null });
    expect(nullType.success).toBe(true);

    const invalid = providerEditUpdateSchema.safeParse({ ...base, listingType: 'invalid_type' });
    expect(invalid.success).toBe(false);
  });
});
