/**
 * Translated "all categories" labels — the `search.all` value of every
 * locale catalogue in src/translations/. These reach the category filter
 * as an explicit user choice meaning "no category filter", not a broken
 * filter value, so the invalid-category guards must never reject them.
 *
 * Single source of truth shared by services/providers/search.ts and
 * services/communityServices.ts (previously two hand-maintained copies
 * that drifted — Urdu and Pashto were missing, #254 post-QA).
 *
 * Sync is enforced by test, not by hand:
 * src/__tests__/translations/all-categories-labels-parity.test.ts derives
 * the expected set from `search.all` across every entry in LANGUAGES and
 * fails if a locale is added or a label changes without updating this
 * list. The constant is not derived by statically importing the
 * catalogues because ar/tr/ur/ps are deliberately lazy-loaded (see
 * src/translations/index.ts); importing them here would pull all six
 * translation files into the client bundle.
 */
export const ALL_CATEGORIES_LABELS: readonly string[] = [
  'All', // en
  'Alle', // de
  'الكل', // ar
  'Tümü', // tr
  'سب', // ur
  'ټول', // ps
];
