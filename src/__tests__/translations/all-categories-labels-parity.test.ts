import { describe, it, expect } from 'vitest';

import { ALL_CATEGORIES_LABELS } from '@/constants/allCategoriesLabels';
import { LANGUAGES, getTranslations, loadTranslations } from '@/translations';

/**
 * #254 post-QA: the "all categories" sentinel list used by the provider and
 * community-service category guards must cover the `search.all` value of
 * every supported locale. Urdu ('سب') and Pashto ('ټول') were missing, so
 * their users' "all categories" choice was treated as an invalid filter and
 * failed closed to an empty result set.
 *
 * This test derives the expected set from the locale catalogues themselves,
 * iterating LANGUAGES: adding a locale without updating the constant fails
 * here, so the list cannot silently drift from the translations again.
 */
describe('ALL_CATEGORIES_LABELS locale parity', () => {
  it('matches the search.all sentinel of every catalogue in LANGUAGES', async () => {
    const expected = new Map<string, string>();
    for (const lang of LANGUAGES) {
      await loadTranslations(lang);
      const catalog = getTranslations(lang) as { search: { all: string } };
      expected.set(lang, catalog.search.all);
    }

    // No locale missing, no stale entry: exact set equality.
    expect(new Set(ALL_CATEGORIES_LABELS)).toEqual(new Set(expected.values()));
  });

  it('explicitly covers the Urdu and Pashto sentinels (the regression)', () => {
    expect(ALL_CATEGORIES_LABELS).toContain('سب'); // ur
    expect(ALL_CATEGORIES_LABELS).toContain('ټول'); // ps
  });
});
