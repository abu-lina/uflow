export const SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN = {
  muslim: 'muslim_owned',
  spenden: 'accepts_donations',
  solidaritaet: 'solidarity_pricing',
  parken: 'has_parking',
  gebet: 'has_prayer_space',
} as const;

export type SearchFilterKey = keyof typeof SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN;

export const SEARCH_FILTER_KEYS = Object.keys(
  SEARCH_FILTER_KEY_TO_PROVIDER_COLUMN,
) as SearchFilterKey[];

export const SEARCH_FILTER_KEY_SET: ReadonlySet<string> = new Set(SEARCH_FILTER_KEYS);
