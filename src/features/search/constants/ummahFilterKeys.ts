export const UMMAH_FILTER_KEY_TO_PARAM = {
  kostenlos: 'kostenlos',
  online: 'online',
  sprache: 'sprache',
  zertifiziert: 'zertifiziert',
  geschlechtergetrennt: 'geschlechtergetrennt',
} as const;

export type UmmahFilterKey = keyof typeof UMMAH_FILTER_KEY_TO_PARAM;

export const UMMAH_FILTER_KEYS = Object.keys(
  UMMAH_FILTER_KEY_TO_PARAM,
) as UmmahFilterKey[];

export const UMMAH_FILTER_KEY_SET: ReadonlySet<string> = new Set(UMMAH_FILTER_KEYS);
