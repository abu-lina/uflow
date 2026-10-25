export type ScreeningSource = 'google_maps_apify' | 'delivery_menu' | 'website';

export type ScreeningStatus = 'clear' | 'review' | 'flagged';

export type ScreeningFlagCode =
  'alcohol' | 'pork' | 'not_halal' | 'halal_positive' | 'no_maps_match';

export interface ScreeningFlag {
  code: ScreeningFlagCode;
  term: string;
  snippet: string;
  url: string;
  source: ScreeningSource;
}

export interface ProviderScreening {
  screening_id: string;
  provider_id: string;
  source: ScreeningSource;
  status: ScreeningStatus;
  flags: ScreeningFlag[];
  raw: Record<string, unknown> | null;
  created_at: string;
}
