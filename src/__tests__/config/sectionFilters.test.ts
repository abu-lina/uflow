/**
 * Plan 089: Section filter configuration tests (M3)
 * TDD Gate: written BEFORE implementation of sectionFilters.ts
 */
import { describe, it, expect } from 'vitest';
import {
  SECTION_FILTER_CONFIG,
  getDefaultFilters,
  getAllowedFilters,
  type SectionFilter,
} from '@/config/sectionFilters';

describe('SECTION_FILTER_CONFIG', () => {
  it('exports config for food, ummah, and business sections', () => {
    expect(SECTION_FILTER_CONFIG).toHaveProperty('food');
    expect(SECTION_FILTER_CONFIG).toHaveProperty('ummah');
    expect(SECTION_FILTER_CONFIG).toHaveProperty('store');
  });

  it('food section has muslim_owned as a default filter', () => {
    const food = SECTION_FILTER_CONFIG['food'];
    expect(food.defaults).toHaveProperty('muslim_owned', true);
  });

  it('business section has muslim_owned as a default filter', () => {
    const business = SECTION_FILTER_CONFIG['store'];
    expect(business.defaults).toHaveProperty('muslim_owned', true);
  });

  it('ummah section has no boolean defaults', () => {
    const ummah = SECTION_FILTER_CONFIG['ummah'];
    expect(Object.keys(ummah.defaults)).toHaveLength(0);
  });

  it('food section has prayer space as an optional filter', () => {
    const food = SECTION_FILTER_CONFIG['food'];
    expect(food.optional).toContain('has_prayer_space');
  });

  it('business section does NOT have prayer space as optional filter', () => {
    const business = SECTION_FILTER_CONFIG['store'];
    expect(business.optional).not.toContain('has_prayer_space');
  });

  it('food section has all seven optional filters', () => {
    const food = SECTION_FILTER_CONFIG['food'];
    const expected: SectionFilter[] = [
      'makes_donations',
      'has_parking',
      'economic_solidarity',
      'family_friendly',
      'children_friendly',
      'women_friendly',
      'has_prayer_space',
    ];
    expected.forEach((f) => expect(food.optional).toContain(f));
  });

  it('business section has only two optional filters', () => {
    const business = SECTION_FILTER_CONFIG['store'];
    expect(business.optional).toContain('makes_donations');
    expect(business.optional).toContain('economic_solidarity');
    expect(business.optional).toHaveLength(2);
  });
});

describe('getDefaultFilters', () => {
  it('returns muslim_owned=true for food section', () => {
    const filters = getDefaultFilters('food');
    expect(filters).toEqual({ muslim_owned: true });
  });

  it('returns muslim_owned=true for business section', () => {
    const filters = getDefaultFilters('store');
    expect(filters).toEqual({ muslim_owned: true });
  });

  it('returns empty object for ummah section', () => {
    const filters = getDefaultFilters('ummah');
    expect(filters).toEqual({});
  });
});

describe('getAllowedFilters', () => {
  it('food section allows has_prayer_space', () => {
    expect(getAllowedFilters('food')).toContain('has_prayer_space');
  });

  it('business section does not allow has_prayer_space', () => {
    expect(getAllowedFilters('store')).not.toContain('has_prayer_space');
  });

  it('includes defaults + optional filters', () => {
    const food = getAllowedFilters('food');
    // defaults
    expect(food).toContain('muslim_owned');
    // optional
    expect(food).toContain('makes_donations');
  });
});
