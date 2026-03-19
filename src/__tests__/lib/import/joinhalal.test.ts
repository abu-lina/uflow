/**
 * Unit tests for the shared JoinHalal import core (src/lib/import/joinhalal.ts).
 * Tests are written FIRST (TDD Red → Green → Refactor).
 *
 * This module is imported by both the CLI script (dry-run path) and the
 * admin API route. These tests cover the pure helper functions that can be
 * exercised without network or database access.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCategoryId,
  makeProviderKey,
  buildCliWriteCommand,
  IMPORT_BOT_UUID,
  CATEGORY_SLUG_MAP,
  DEFAULT_SITEMAPS,
} from '@/lib/import/joinhalal';
import type { Category } from '@/lib/import/joinhalal';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  { category_id: 'cat-001', name_de: 'Restaurant' },
  { category_id: 'cat-002', name_de: 'Metzgerei' },
  { category_id: 'cat-003', name_de: 'Café' },
  { category_id: 'cat-004', name_de: 'Bäckerei' },
  { category_id: 'cat-005', name_de: 'Imbiss' },
  { category_id: 'cat-006', name_de: 'Supermarkt' },
  { category_id: 'cat-007', name_de: 'Moschee' },
];

// ---------------------------------------------------------------------------
// resolveCategoryId
// ---------------------------------------------------------------------------

describe('resolveCategoryId', () => {
  it('resolves "restaurant" slug to the correct category_id', () => {
    expect(resolveCategoryId('restaurant', CATEGORIES)).toBe('cat-001');
  });

  it('resolves "metzgerei" slug to the correct category_id', () => {
    expect(resolveCategoryId('metzgerei', CATEGORIES)).toBe('cat-002');
  });

  it('resolves "food-truck" slug to Imbiss category_id', () => {
    expect(resolveCategoryId('food-truck', CATEGORIES)).toBe('cat-005');
  });

  it('resolves "imbiss" slug to Imbiss category_id', () => {
    expect(resolveCategoryId('imbiss', CATEGORIES)).toBe('cat-005');
  });

  it('resolves "cafe" slug to Café category_id', () => {
    expect(resolveCategoryId('cafe', CATEGORIES)).toBe('cat-003');
  });

  it('resolves "baeckerei" slug to Bäckerei category_id', () => {
    expect(resolveCategoryId('baeckerei', CATEGORIES)).toBe('cat-004');
  });

  it('resolves "supermarkt" slug to Supermarkt category_id', () => {
    expect(resolveCategoryId('supermarkt', CATEGORIES)).toBe('cat-006');
  });

  it('resolves "moschee" slug to Moschee category_id', () => {
    expect(resolveCategoryId('moschee', CATEGORIES)).toBe('cat-007');
  });

  it('is case-insensitive for slug lookup', () => {
    expect(resolveCategoryId('RESTAURANT', CATEGORIES)).toBe('cat-001');
    expect(resolveCategoryId('Restaurant', CATEGORIES)).toBe('cat-001');
  });

  it('returns null for an unmapped slug', () => {
    expect(resolveCategoryId('unknown-category', CATEGORIES)).toBeNull();
  });

  it('returns null for null slug', () => {
    expect(resolveCategoryId(null, CATEGORIES)).toBeNull();
  });

  it('returns null for empty string slug', () => {
    expect(resolveCategoryId('', CATEGORIES)).toBeNull();
  });

  it('returns null when categories list is empty', () => {
    expect(resolveCategoryId('restaurant', [])).toBeNull();
  });

  it('returns null when no category matches the mapped name', () => {
    const missingCats: Category[] = [{ category_id: 'cat-x', name_de: 'Sonstiges' }];
    expect(resolveCategoryId('restaurant', missingCats)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// makeProviderKey
// ---------------------------------------------------------------------------

describe('makeProviderKey', () => {
  it('produces lowercase pipe-joined key', () => {
    expect(makeProviderKey('Etem Burger', 'München')).toBe('etem burger|münchen');
  });

  it('trims whitespace from name and city', () => {
    expect(makeProviderKey('  Bistro Nour  ', '  Berlin  ')).toBe('bistro nour|berlin');
  });

  it('handles null city with empty string in key', () => {
    expect(makeProviderKey('Al-Madina', null)).toBe('al-madina|');
  });

  it('produces identical keys for same name+city regardless of case', () => {
    const k1 = makeProviderKey('DÖNER HAUS', 'FRANKFURT');
    const k2 = makeProviderKey('döner haus', 'frankfurt');
    expect(k1).toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// buildCliWriteCommand
// ---------------------------------------------------------------------------

describe('buildCliWriteCommand', () => {
  it('returns base write command for "all" limit', () => {
    expect(buildCliWriteCommand('all')).toBe(
      'npx tsx scripts/import-joinhalal.ts --write'
    );
  });

  it('returns write command with --limit 10', () => {
    expect(buildCliWriteCommand(10)).toBe(
      'npx tsx scripts/import-joinhalal.ts --write --limit 10'
    );
  });

  it('returns write command with --limit 50', () => {
    expect(buildCliWriteCommand(50)).toBe(
      'npx tsx scripts/import-joinhalal.ts --write --limit 50'
    );
  });

  it('returns write command with --limit 100', () => {
    expect(buildCliWriteCommand(100)).toBe(
      'npx tsx scripts/import-joinhalal.ts --write --limit 100'
    );
  });

  it('does not include --limit flag when limit is "all"', () => {
    expect(buildCliWriteCommand('all')).not.toContain('--limit');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('IMPORT_BOT_UUID', () => {
  it('is a valid UUID (all hex chars and correct format)', () => {
    expect(IMPORT_BOT_UUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe('CATEGORY_SLUG_MAP', () => {
  it('maps "restaurant" to "Restaurant"', () => {
    expect(CATEGORY_SLUG_MAP['restaurant']).toBe('Restaurant');
  });

  it('maps all 8 expected slug keys', () => {
    const expected = [
      'restaurant',
      'food-truck',
      'metzgerei',
      'imbiss',
      'cafe',
      'baeckerei',
      'supermarkt',
      'moschee',
    ];
    expected.forEach((key) => expect(CATEGORY_SLUG_MAP).toHaveProperty(key));
  });
});

describe('DEFAULT_SITEMAPS', () => {
  it('contains 5 sitemap URLs', () => {
    expect(DEFAULT_SITEMAPS).toHaveLength(5);
  });

  it('all URLs start with https://joinhalal.com', () => {
    DEFAULT_SITEMAPS.forEach((url) =>
      expect(url).toMatch(/^https:\/\/joinhalal\.com\//)
    );
  });
});
