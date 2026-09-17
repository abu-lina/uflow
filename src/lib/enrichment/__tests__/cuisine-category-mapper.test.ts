/**
 * TDD tests for mapCuisineToCategory — maps a JoinHalal servesCuisine
 * string to the closest categories table entry.
 *
 * The mapper does case-insensitive fuzzy matching against category
 * name_de and name_en fields.
 */

import { describe, it, expect } from 'vitest';
import { mapCuisineToCategory, type CategoryRow } from '../cuisine-category-mapper';

// Representative subset of categories from the database
const CATEGORIES: CategoryRow[] = [
  { category_id: 'cat-turkish', name_de: 'Türkisch', name_en: 'Turkish' },
  { category_id: 'cat-arabic', name_de: 'Arabisch', name_en: 'Arabic' },
  { category_id: 'cat-italian', name_de: 'Italienisch', name_en: 'Italian' },
  { category_id: 'cat-indian', name_de: 'Indisch', name_en: 'Indian' },
  { category_id: 'cat-burger', name_de: 'Burger', name_en: 'Burger' },
  { category_id: 'cat-pizza', name_de: 'Pizza', name_en: 'Pizza' },
  { category_id: 'cat-kebab', name_de: 'Kebab / Döner', name_en: 'Kebab / Döner' },
  { category_id: 'cat-mediterranean', name_de: 'Mediterran', name_en: 'Mediterranean' },
  { category_id: 'cat-pakistani', name_de: 'Pakistanisch', name_en: 'Pakistani' },
  { category_id: 'cat-afghan', name_de: 'Afghanisch', name_en: 'Afghan' },
  { category_id: 'cat-chinese', name_de: 'Chinesisch', name_en: 'Chinese' },
  { category_id: 'cat-japanese', name_de: 'Japanisch', name_en: 'Japanese' },
  { category_id: 'cat-thai', name_de: 'Thailändisch', name_en: 'Thai' },
  { category_id: 'cat-greek', name_de: 'Griechisch', name_en: 'Greek' },
  { category_id: 'cat-french', name_de: 'Französisch', name_en: 'French' },
  { category_id: 'cat-balkan', name_de: 'Balkan', name_en: 'Balkan' },
  { category_id: 'cat-american', name_de: 'Amerikanisch', name_en: 'American' },
  { category_id: 'cat-syrisch', name_de: 'Syrisch', name_en: 'Syrian' },
  { category_id: 'cat-fried-chicken', name_de: 'Fried Chicken', name_en: 'Fried Chicken' },
  { category_id: 'cat-bakery', name_de: 'Bäckerei', name_en: 'Bakery' },
];

describe('mapCuisineToCategory', () => {
  it('matches exact German cuisine name', () => {
    expect(mapCuisineToCategory('Türkisch', CATEGORIES)).toBe('cat-turkish');
  });

  it('matches exact English cuisine name', () => {
    expect(mapCuisineToCategory('Turkish', CATEGORIES)).toBe('cat-turkish');
  });

  it('matches case-insensitively', () => {
    expect(mapCuisineToCategory('türkisch', CATEGORIES)).toBe('cat-turkish');
    expect(mapCuisineToCategory('ITALIAN', CATEGORIES)).toBe('cat-italian');
  });

  it('matches comma-separated cuisine list (picks first match)', () => {
    expect(mapCuisineToCategory('Burger, Pizza, Türkisch', CATEGORIES)).toBe('cat-burger');
  });

  it('matches when first token has no match but second does', () => {
    expect(mapCuisineToCategory('Halal, Indisch', CATEGORIES)).toBe('cat-indian');
  });

  it('matches "Döner" to Kebab / Döner category', () => {
    expect(mapCuisineToCategory('Döner', CATEGORIES)).toBe('cat-kebab');
  });

  it('matches "Kebab" to Kebab / Döner category', () => {
    expect(mapCuisineToCategory('Kebab', CATEGORIES)).toBe('cat-kebab');
  });

  it('returns null for unknown cuisine', () => {
    expect(mapCuisineToCategory('Martian food', CATEGORIES)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(mapCuisineToCategory(null, CATEGORIES)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(mapCuisineToCategory('', CATEGORIES)).toBeNull();
  });

  it('returns null for empty categories list', () => {
    expect(mapCuisineToCategory('Turkish', [])).toBeNull();
  });

  it('trims whitespace from cuisine terms', () => {
    expect(mapCuisineToCategory('  Italienisch  ', CATEGORIES)).toBe('cat-italian');
  });

  it('handles "Arabische Küche" (adjective form)', () => {
    expect(mapCuisineToCategory('Arabische Küche', CATEGORIES)).toBe('cat-arabic');
  });

  it('handles "Türkische Küche" (adjective form)', () => {
    expect(mapCuisineToCategory('Türkische Küche', CATEGORIES)).toBe('cat-turkish');
  });

  it('handles mixed German cuisine phrases', () => {
    expect(mapCuisineToCategory('Griechische Küche', CATEGORIES)).toBe('cat-greek');
    expect(mapCuisineToCategory('Französische Küche', CATEGORIES)).toBe('cat-french');
  });

  it('skips generic terms like "Halal" or "Restaurant"', () => {
    expect(mapCuisineToCategory('Halal, Restaurant', CATEGORIES)).toBeNull();
    expect(mapCuisineToCategory('Halal', CATEGORIES)).toBeNull();
  });

  it('matches "Chicken" to Fried Chicken', () => {
    expect(mapCuisineToCategory('Chicken', CATEGORIES)).toBe('cat-fried-chicken');
  });
});
