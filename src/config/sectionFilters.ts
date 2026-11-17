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

export const DEFAULT_SECTION: Section = 'food';

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
