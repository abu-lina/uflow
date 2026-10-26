import { describe, expect, it } from 'vitest';

import { summarizeScreenings } from '@/features/admin/utils/provider-screenings';

const flag = (code: string) => ({
  code,
  term: 'x',
  snippet: 'x',
  url: 'https://example.com/e',
  source: 'google_maps_apify',
});

const maps = (status: string, flags: Record<string, unknown>[] = []) => ({
  source: 'google_maps_apify',
  status,
  flags,
  created_at: '2026-10-03T00:00:00Z',
});

describe('#792 admin no-alcohol suggestion', () => {
  it('is suggested when the Google Maps screening matched a place and has no alcohol flag', () => {
    expect(summarizeScreenings([maps('clear')])).toMatchObject({ suggestNoAlcohol: true });
  });

  it('is not suggested when the screening has an alcohol flag', () => {
    const result = summarizeScreenings([maps('flagged', [flag('alcohol')])]);
    expect(result).toMatchObject({ suggestNoAlcohol: false });
  });

  it('is not suggested when the status is review for a non-alcohol flag', () => {
    const result = summarizeScreenings([maps('review', [flag('not_halal')])]);
    expect(result).toMatchObject({ status: 'review', suggestNoAlcohol: false });
  });

  it('is not suggested when the provider is flagged for pork', () => {
    const result = summarizeScreenings([maps('flagged', [flag('pork')])]);
    expect(result).toMatchObject({ status: 'flagged', suggestNoAlcohol: false });
  });

  it('is not suggested when another source made the overall status review', () => {
    const website = { ...maps('review', [flag('not_halal')]), source: 'website' };
    expect(summarizeScreenings([maps('clear'), website])).toMatchObject({
      suggestNoAlcohol: false,
    });
  });

  it('is not suggested when no Google Maps place matched', () => {
    const result = summarizeScreenings([maps('review', [flag('no_maps_match')])]);
    expect(result).toMatchObject({ suggestNoAlcohol: false });
  });

  it('is not suggested when there is no Google Maps screening at all', () => {
    const result = summarizeScreenings([{ ...maps('clear'), source: 'website' }]);
    expect(result).toMatchObject({ suggestNoAlcohol: false });
  });
});
