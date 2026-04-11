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
export type Section = 'food' | 'ummah' | 'business';

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
  | 'accepts_donations'
  | 'has_parking'
  | 'solidarity_pricing';

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
      'accepts_donations',
      'has_parking',
      'solidarity_pricing',
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
  business: {
    defaults: {
      muslim_owned: true,
    },
    optional: ['accepts_donations', 'solidarity_pricing'],
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
  if (!categoryId) return 'business';
  if (categoryId === ESSEN_TRINKEN_CATEGORY_ID) return 'food';
  if (categoryId === GEMEINSCHAFT_SPENDEN_CATEGORY_ID) return 'ummah';
  return 'business';
}
