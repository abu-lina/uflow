/**
 * TDD tests for normalizeOpeningHours — converts Schema.org
 * openingHoursSpecification to the OpeningHours type used by the UI.
 *
 * Schema.org format (from JoinHalal / Rank Math):
 *   [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday"], "opens": "09:00", "closes": "22:00" }]
 *
 * UI format (src/types/openingHours.ts):
 *   { monday: { open: "09:00", close: "22:00" }, tuesday: null, ... }
 */

import { describe, it, expect } from 'vitest';
import { normalizeOpeningHours } from '@/utils/normalize-opening-hours';
import type { OpeningHours } from '@/types/openingHours';

describe('normalizeOpeningHours', () => {
  it('converts a single-day openingHoursSpecification to OpeningHours format', () => {
    const input = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday'],
        opens: '09:00',
        closes: '22:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '09:00', close: '22:00' },
    });
  });

  it('converts multi-day specification (one spec covering multiple days)', () => {
    const input = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday'],
        opens: '10:00',
        closes: '20:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' },
    });
  });

  it('converts multiple separate specifications for different days', () => {
    const input = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday'],
        opens: '11:00',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '12:00',
        closes: '23:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '11:00', close: '22:00' },
      tuesday: { open: '11:00', close: '22:00' },
      saturday: { open: '12:00', close: '23:00' },
    });
  });

  it('handles dayOfWeek as a single string instead of array', () => {
    const input = [
      {
        dayOfWeek: 'Friday',
        opens: '17:00',
        closes: '02:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      friday: { open: '17:00', close: '02:00' },
    });
  });

  it('handles full URL day-of-week values (Schema.org URLs)', () => {
    const input = [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['https://schema.org/Monday', 'https://schema.org/Tuesday'],
        opens: '08:00',
        closes: '16:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '08:00', close: '16:00' },
      tuesday: { open: '08:00', close: '16:00' },
    });
  });

  it('handles all 7 days of the week', () => {
    const input = [
      {
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '09:00',
        closes: '21:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '21:00' },
      sunday: { open: '09:00', close: '21:00' },
    });
  });

  it('returns null for null input', () => {
    expect(normalizeOpeningHours(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeOpeningHours(undefined)).toBeNull();
  });

  it('returns null for non-array input', () => {
    expect(normalizeOpeningHours('not an array')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(normalizeOpeningHours([])).toBeNull();
  });

  it('skips specs missing opens/closes', () => {
    const input = [
      { dayOfWeek: ['Monday'] },
      { dayOfWeek: ['Tuesday'], opens: '10:00', closes: '20:00' },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      tuesday: { open: '10:00', close: '20:00' },
    });
  });

  it('skips specs with missing dayOfWeek', () => {
    const input = [{ opens: '10:00', closes: '20:00' }];

    const result = normalizeOpeningHours(input);

    expect(result).toBeNull();
  });

  it('handles case-insensitive day names', () => {
    const input = [
      {
        dayOfWeek: ['MONDAY', 'tuesday'],
        opens: '09:00',
        closes: '18:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
    });
  });

  it('ignores unknown day names', () => {
    const input = [
      {
        dayOfWeek: ['Monday', 'Foobar'],
        opens: '09:00',
        closes: '18:00',
      },
    ];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '09:00', close: '18:00' },
    });
  });

  it('handles the wrapped { source, hours } format from extractEnrichmentData', () => {
    // The current code wraps as { source: 'joinhalal', hours: <raw> }
    // The normalizer should handle this wrapper transparently
    const wrapped = {
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

    const result = normalizeOpeningHours(wrapped);

    expect(result).toEqual({
      monday: { open: '10:00', close: '22:00' },
    });
  });

  it('passes through data already in OpeningHours format', () => {
    const alreadyNormalized: OpeningHours = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
    };

    const result = normalizeOpeningHours(alreadyNormalized);

    expect(result).toEqual(alreadyNormalized);
  });

  it('handles Schema.org openingHours string format (e.g. "Mo-Fr 09:00-18:00")', () => {
    // Some Schema.org data uses the shorthand string format
    const input = ['Mo-Fr 09:00-18:00', 'Sa 10:00-16:00'];

    const result = normalizeOpeningHours(input);

    expect(result).toEqual({
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
    });
  });

  it('handles single shorthand string (not array)', () => {
    const result = normalizeOpeningHours('Mo-Su 10:00-22:00');

    expect(result).toEqual({
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '22:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '10:00', close: '22:00' },
    });
  });
});
