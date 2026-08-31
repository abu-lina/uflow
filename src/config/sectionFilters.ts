/**
 * Plan 089: Section filter configuration (M3)
 *
 * Declares per-section default and optional filters aligned with the
 * Data Model Authority (boolean columns = filter source of truth).
 *
 * Sections:
 *   FOOD     — halal dining, listing_type = 'food'
 *   UMMAH    — community services (community_services table)
 *   BUSINESS — Muslim-owned businesses, listing_type = 'business'
 */

/** Canonical section type. */
export type Section = 'food' | 'ummah' | 'store';

/** Section metadata for active/inactive state and i18n label keys. */
export interface SectionMeta {
  active: boolean;
  labelKey: string;
  badgeKey?: string;
}

/** Per-section metadata registry. Single source of truth for active state. */
export const SECTION_META: Record<Section, SectionMeta> = {
  food: { active: true, labelKey: 'sections.food' },
  ummah: { active: false, labelKey: 'sections.ummah', badgeKey: 'sections.soon' },
  store: { active: false, labelKey: 'sections.stores', badgeKey: 'sections.soon' },
};

/** Boolean filter attribute keys that exist as columns on providers. */
export type SectionFilter =
  | 'muslim_owned'
  | 'no_alcohol'
  | 'no_pork'
  | 'no_gambling'
  | 'has_prayer_space'
  | 'family_friendly'
  | 'women_friendly'
  | 'children_friendly'
  | 'makes_donations'
  | 'has_parking'
  | 'economic_solidarity';

export interface SectionFilterConfig {
  /** Filters ON by default when entering the section. User can toggle off. */
  defaults: Partial<Record<SectionFilter, boolean>>;
  /** Additional filters the user can opt-in to within this section. */
  optional: SectionFilter[];
}

/** Per-section filter configuration. */
export const SECTION_FILTER_CONFIG: Record<Section, SectionFilterConfig> = {
  food: {
    defaults: {
      muslim_owned: true,
    },
    optional: [
      'makes_donations',
      'has_parking',
      'economic_solidarity',
      'family_friendly',
      'children_friendly',
      'women_friendly',
      'has_prayer_space',
    ],
  },
  ummah: {
    defaults: {},
    optional: [],
  },
  store: {
    defaults: {
      muslim_owned: true,
    },
    optional: ['makes_donations', 'economic_solidarity'],
  },
};

/** Returns the default active filters for a section. */
export function getDefaultFilters(section: Section): Partial<Record<SectionFilter, boolean>> {
  return { ...SECTION_FILTER_CONFIG[section].defaults };
}

/** Returns all filter keys allowed (defaults + optional) for a section. */
export function getAllowedFilters(section: Section): SectionFilter[] {
  const config = SECTION_FILTER_CONFIG[section];
  const defaults = Object.keys(config.defaults) as SectionFilter[];
  return Array.from(new Set([...defaults, ...config.optional]));
}

// ─── Category → Section inference (M8: legacy URL backward compat) ──────────

/** Stable UUID for "Essen & Trinken" (SPEISEN_CATEGORY_ID). */
const ESSEN_TRINKEN_CATEGORY_ID = '20c10efe-404b-4a39-bb81-5089a0332d78';

/** Stable UUID for "Gemeinschaft & Spenden". */
const GEMEINSCHAFT_SPENDEN_CATEGORY_ID = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

/**
 * Infers the section from a category UUID.
 * Used for backward compat: legacy `/providers?category=...` URLs without
 * `?section=` are resolved by mapping the category to the correct section.
 *
 * D9: default section is FOOD — but this function returns BUSINESS for unknown
 * uuids to stay consistent with the listing_type backfill strategy.
 */
export function inferSectionFromCategory(categoryId: string | null | undefined): Section {
  if (!categoryId) return 'store';
  if (categoryId === ESSEN_TRINKEN_CATEGORY_ID) return 'food';
  if (categoryId === GEMEINSCHAFT_SPENDEN_CATEGORY_ID) return 'ummah';
  return 'store';
}

/** Maps a section to its canonical public results route. */
export function getResultsPathForSection(section: Section): '/food' | '/stores' | '/ummah' {
  if (section === 'food') return '/food';
  if (section === 'ummah') return '/ummah';
  return '/stores';
}

/** Resolves section from URL params with legacy category fallback (D9 default: food). */
export function resolveSectionFromSearchParams(params: URLSearchParams): Section {
  const sectionParam = params.get('section');
  if (sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store') {
    return sectionParam;
  }
  // Legacy backward compat: 'business' maps to 'store'
  if (sectionParam === 'business') {
    return 'store';
  }

  const categoryParam = params.get('category');
  if (categoryParam) {
    return inferSectionFromCategory(categoryParam);
  }

  return 'food';
}

/** Resolves section from route context (pathname first, then query param fallback). */
export function resolveSectionFromRoute(
  pathname: string | null | undefined,
  params: URLSearchParams,
): Section {
  const routePath = pathname || '';

  // Path-based resolution: /food/... -> food, /ummah/... -> ummah, /stores/... -> store
  if (routePath === '/food' || routePath.startsWith('/food/')) return 'food';
  if (routePath === '/ummah' || routePath.startsWith('/ummah/')) return 'ummah';
  if (routePath === '/stores' || routePath.startsWith('/stores/')) return 'store';

  // Fallback to query param for legacy/non-section routes
  const fromParams = resolveSectionFromSearchParams(params);
  return fromParams;
}
