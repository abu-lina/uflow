/**
 * TDD tests for backfill-enrichment utility functions.
 *
 * These pure functions detect broken data and transform it for the
 * backfill-enrichment script (scripts/backfill-enrichment.ts).
 */

import { describe, it, expect } from 'vitest';
import {
  isOpeningHoursBroken,
  normalizeUberEatsHours,
  needsLocationBackfill,
  isMenuNamesOnly,
} from '@/utils/backfill-helpers';
import type { OpeningHours } from '@/types/openingHours';

// ---------------------------------------------------------------------------
// isOpeningHoursBroken
// ---------------------------------------------------------------------------

describe('isOpeningHoursBroken', () => {
  it('returns true for JoinHalal wrapped format { source, hours }', () => {
    const broken = {
      source: 'joinhalal',
      hours: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday'],
          opens: '10:00',
          closes: '22:00',
        },
      ],
    };
    expect(isOpeningHoursBroken(broken)).toBe(true);
  });

  it('returns true for UberEats raw storeData.hours format', () => {
    // UberEats stores hours as { regularHours: [...], ... } or similar proprietary shapes
    const uberRaw = {
      regularHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '22:00' }],
    };
    expect(isOpeningHoursBroken(uberRaw)).toBe(true);
  });

  it('returns true for object with daysBitArray (UberEats variant)', () => {
    const uberVariant = {
      daysBitArray: [1, 1, 1, 1, 1, 0, 0],
      startTime: '10:00',
      endTime: '22:00',
    };
    expect(isOpeningHoursBroken(uberVariant)).toBe(true);
  });

  it('returns false for valid OpeningHours format', () => {
    const valid: OpeningHours = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
    };
    expect(isOpeningHoursBroken(valid)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOpeningHoursBroken(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOpeningHoursBroken(undefined)).toBe(false);
  });

  it('returns true for raw Schema.org array stored as-is', () => {
    // Sometimes the raw spec array ends up stored directly
    const rawSchemaOrg = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday'],
        opens: '10:00',
        closes: '22:00',
      },
    ];
    expect(isOpeningHoursBroken(rawSchemaOrg)).toBe(true);
  });

  it('returns false for valid OpeningHours with null days', () => {
    const valid: OpeningHours = {
      monday: { open: '09:00', close: '18:00' },
      sunday: null,
    };
    expect(isOpeningHoursBroken(valid)).toBe(false);
  });

  it('returns true for object with source key but no day keys', () => {
    const broken = { source: 'wolt', data: {} };
    expect(isOpeningHoursBroken(broken)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeUberEatsHours
// ---------------------------------------------------------------------------

describe('normalizeUberEatsHours', () => {
  it('converts regularHours array to OpeningHours', () => {
    const uberHours = {
      regularHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '22:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '22:00' },
        { dayOfWeek: 6, startTime: '10:00', endTime: '23:00' },
      ],
    };

    const result = normalizeUberEatsHours(uberHours);

    expect(result).toEqual({
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      saturday: { open: '10:00', close: '23:00' },
    });
  });

  it('returns null for null input', () => {
    expect(normalizeUberEatsHours(null)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(normalizeUberEatsHours({})).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeUberEatsHours(undefined)).toBeNull();
  });

  it('handles regularHours with string day names', () => {
    const uberHours = {
      regularHours: [
        { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '22:00' },
        { dayOfWeek: 'SATURDAY', startTime: '10:00', endTime: '23:00' },
      ],
    };

    const result = normalizeUberEatsHours(uberHours);

    expect(result).toEqual({
      monday: { open: '09:00', close: '22:00' },
      saturday: { open: '10:00', close: '23:00' },
    });
  });

  it('handles regularHours with zero-based day numbers', () => {
    // Some UberEats data uses 0-based (0=Monday)
    const uberHours = {
      regularHours: [
        { dayOfWeek: 0, startTime: '09:00', endTime: '22:00' },
        { dayOfWeek: 6, startTime: '10:00', endTime: '23:00' },
      ],
    };

    const result = normalizeUberEatsHours(uberHours);

    // Should produce something (exact day mapping tested by integration)
    expect(result).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(Object.keys(result!).length).toBeGreaterThan(0);
  });

  it('returns null for regularHours with no valid entries', () => {
    const uberHours = {
      regularHours: [{ dayOfWeek: 99, startTime: 'invalid', endTime: 'invalid' }],
    };

    expect(normalizeUberEatsHours(uberHours)).toBeNull();
  });

  it('delegates to normalizeOpeningHours for already-valid format', () => {
    // If somehow the data is already in valid format, pass through
    const alreadyValid = {
      monday: { open: '09:00', close: '18:00' },
    };
    const result = normalizeUberEatsHours(alreadyValid);
    expect(result).toEqual(alreadyValid);
  });
});

// ---------------------------------------------------------------------------
// needsLocationBackfill
// ---------------------------------------------------------------------------

describe('needsLocationBackfill', () => {
  it('returns true when provider has lat/lng but no primary location', () => {
    const provider = {
      location_latitude: 48.137,
      location_longitude: 11.575,
      address_street: 'Marienplatz 1',
      address_city: 'Munich',
    };
    const hasLocation = false;

    expect(needsLocationBackfill(provider, hasLocation)).toBe(true);
  });

  it('returns true when provider has address fields but no primary location', () => {
    const provider = {
      location_latitude: null,
      location_longitude: null,
      address_street: 'Marienplatz 1',
      address_city: 'Munich',
    };
    const hasLocation = false;

    expect(needsLocationBackfill(provider, hasLocation)).toBe(true);
  });

  it('returns false when provider already has a primary location', () => {
    const provider = {
      location_latitude: 48.137,
      location_longitude: 11.575,
      address_street: 'Marienplatz 1',
      address_city: 'Munich',
    };
    const hasLocation = true;

    expect(needsLocationBackfill(provider, hasLocation)).toBe(false);
  });

  it('returns false when provider has no address/coordinates data at all', () => {
    const provider = {
      location_latitude: null,
      location_longitude: null,
      address_street: null,
      address_city: null,
    };
    const hasLocation = false;

    expect(needsLocationBackfill(provider, hasLocation)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isMenuNamesOnly
// ---------------------------------------------------------------------------

describe('isMenuNamesOnly', () => {
  it('returns true when all menu items have name but no price/description/category', () => {
    const items = [
      { name_de: 'Döner', price_cents: null, description_de: null, category: null },
      { name_de: 'Falafel', price_cents: null, description_de: null, category: null },
    ];
    expect(isMenuNamesOnly(items)).toBe(true);
  });

  it('returns false when menu items have prices', () => {
    const items = [
      { name_de: 'Döner', price_cents: 650, description_de: null, category: null },
      { name_de: 'Falafel', price_cents: 500, description_de: null, category: null },
    ];
    expect(isMenuNamesOnly(items)).toBe(false);
  });

  it('returns false when menu items have descriptions', () => {
    const items = [
      { name_de: 'Döner', price_cents: null, description_de: 'Lecker Döner', category: null },
    ];
    expect(isMenuNamesOnly(items)).toBe(false);
  });

  it('returns false when menu items have categories', () => {
    const items = [
      { name_de: 'Döner', price_cents: null, description_de: null, category: 'Hauptgerichte' },
    ];
    expect(isMenuNamesOnly(items)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isMenuNamesOnly([])).toBe(false);
  });

  it('returns true even if some items have some rich data (majority rule: >80% names-only)', () => {
    const items = [
      { name_de: 'Döner', price_cents: null, description_de: null, category: null },
      { name_de: 'Falafel', price_cents: null, description_de: null, category: null },
      { name_de: 'Cola', price_cents: null, description_de: null, category: null },
      { name_de: 'Wasser', price_cents: null, description_de: null, category: null },
      { name_de: 'Salat', price_cents: 350, description_de: null, category: null },
    ];
    // 4/5 = 80% names-only, so this should still be considered names-only
    expect(isMenuNamesOnly(items)).toBe(true);
  });

  it('returns false when most items have rich data', () => {
    const items = [
      { name_de: 'Döner', price_cents: 650, description_de: null, category: 'Hauptgerichte' },
      {
        name_de: 'Falafel',
        price_cents: 500,
        description_de: 'Kichererbsen',
        category: 'Hauptgerichte',
      },
      { name_de: 'Cola', price_cents: null, description_de: null, category: null },
    ];
    // 1/3 = 33% names-only, not enough
    expect(isMenuNamesOnly(items)).toBe(false);
  });
});
