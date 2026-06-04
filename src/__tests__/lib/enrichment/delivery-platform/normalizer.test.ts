import { describe, expect, it } from 'vitest';
import {
  normalizeWoltOpeningHours,
  normalizeWoltVenue,
} from '@/lib/enrichment/delivery-platform/normalizer';

describe('normalizeWoltOpeningHours', () => {
  it('normalizes standard Wolt hours', () => {
    const hours = [
      { day: 0, opens: '09:00', closes: '22:00' },
      { day: 1, opens: '09:00', closes: '22:00' },
      { day: 2, opens: '09:00', closes: '22:00' },
      { day: 3, opens: '09:00', closes: '22:00' },
      { day: 4, opens: '09:00', closes: '23:00' },
      { day: 5, opens: '10:00', closes: '23:00' },
    ];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '09:00', close: '22:00' });
    expect(result!.tuesday).toEqual({ open: '09:00', close: '22:00' });
    expect(result!.friday).toEqual({ open: '09:00', close: '23:00' });
    expect(result!.saturday).toEqual({ open: '10:00', close: '23:00' });
  });

  it('returns null for null input', () => {
    expect(normalizeWoltOpeningHours(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeWoltOpeningHours(undefined)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(normalizeWoltOpeningHours([])).toBeNull();
  });

  it('handles missing days gracefully', () => {
    const hours = [
      { day: 0, opens: '09:00', closes: '22:00' },
      { day: 2, opens: '09:00', closes: '22:00' },
      { day: 4, opens: '10:00', closes: '20:00' },
    ];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '09:00', close: '22:00' });
    expect(result!.tuesday).toBeUndefined();
    expect(result!.wednesday).toEqual({ open: '09:00', close: '22:00' });
    expect(result!.friday).toEqual({ open: '10:00', close: '20:00' });
  });

  it('handles sunday (day 6)', () => {
    const hours = [{ day: 6, opens: '10:00', closes: '18:00' }];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.sunday).toEqual({ open: '10:00', close: '18:00' });
  });

  it('handles midnight crossover', () => {
    const hours = [{ day: 0, opens: '22:00', closes: '02:00' }];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '22:00', close: '02:00' });
  });

  it('skips invalid time strings', () => {
    const hours = [
      { day: 0, opens: '09:00', closes: '22:00' },
      { day: 1, opens: 'invalid', closes: '22:00' },
    ];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '09:00', close: '22:00' });
    expect(result!.tuesday).toBeUndefined();
  });

  it('skips out of range day values', () => {
    const hours = [
      { day: 0, opens: '09:00', closes: '22:00' },
      { day: 7, opens: '10:00', closes: '18:00' },
      { day: -1, opens: '10:00', closes: '18:00' },
    ];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '09:00', close: '22:00' });
    expect(Object.keys(result!).length).toBe(1);
  });

  it('returns null if all entries have invalid times', () => {
    const hours = [
      { day: 0, opens: 'abc', closes: 'def' },
      { day: 1, opens: '', closes: '' },
    ];
    expect(normalizeWoltOpeningHours(hours)).toBeNull();
  });

  it('handles 24h format', () => {
    const hours = [
      { day: 0, opens: '00:00', closes: '24:00' },
    ];
    const result = normalizeWoltOpeningHours(hours);
    expect(result).not.toBeNull();
    expect(result!.monday).toEqual({ open: '00:00', close: '24:00' });
  });
});

describe('normalizeWoltVenue', () => {
  it('converts a Wolt venue to normalized form', () => {
    const venue = {
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      opening_hours: [{ day: 0, opens: '09:00', closes: '22:00' }],
      city: 'Berlin',
    };
    const result = normalizeWoltVenue(venue);
    expect(result.name).toBe('Test Restaurant');
    expect(result.slug).toBe('test-restaurant');
    expect(result.url).toBe('https://wolt.com/de/deu/venue/test-restaurant');
    expect(result.openingHours).not.toBeNull();
    expect(result.openingHours!.monday).toEqual({ open: '09:00', close: '22:00' });
  });

  it('handles venue without opening hours', () => {
    const venue = { name: 'No Hours', slug: 'no-hours' };
    const result = normalizeWoltVenue(venue);
    expect(result.name).toBe('No Hours');
    expect(result.openingHours).toBeNull();
  });

  it('initializes menuItemNames as empty array', () => {
    const venue = { name: 'Test', slug: 'test' };
    const result = normalizeWoltVenue(venue);
    expect(result.menuItemNames).toEqual([]);
  });
});
