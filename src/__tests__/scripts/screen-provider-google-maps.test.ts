import { describe, expect, it, vi } from 'vitest';

import {
  buildActorInput,
  GOOGLE_MAPS_SETTINGS,
} from '@/lib/enrichment/google-maps/apify-google-maps-client';
import {
  exitCodeFor,
  resolveLimit,
  runScreening,
  type ApifyPlace,
  type ScreeningProvider,
  type ScreeningStore,
} from '../../../scripts/screen-provider-google-maps';

const provider = (over: Partial<ScreeningProvider> = {}): ScreeningProvider => ({
  provider_id: 'p1',
  provider_name: 'Bistro Salam',
  address_street: 'Hauptstr. 1',
  address_zip: '10115',
  address_city: 'Berlin',
  contact_phone: null,
  social_website: null,
  social_instagram: null,
  opening_hours: null,
  imageUrls: [],
  latitude: 52.52,
  longitude: 13.405,
  primaryLocationId: 'loc1',
  ...over,
});

const place = (over: Partial<ApifyPlace> = {}): ApifyPlace => ({
  title: 'Bistro Salam',
  url: 'https://maps.google.com/?cid=1',
  categoryName: 'Restaurant',
  postalCode: '10115',
  location: { lat: 52.5201, lng: 13.4051 },
  website: 'https://bistro-salam.example',
  phone: '+49 30 1234567',
  instagrams: ['https://www.instagram.com/bistrosalam'],
  openingHours: [{ day: 'Monday', hours: '11 AM to 10 PM' }],
  imageUrls: ['https://img/1.jpg', 'https://img/2.jpg'],
  reviews: [{ text: 'Great falafel', stars: 5 }],
  additionalInfo: {},
  ...over,
});

function makeStore(providers: ScreeningProvider[]) {
  const screenings: Array<Record<string, unknown>> = [];
  const fieldWrites: Array<{ providerId: string; payload: Record<string, unknown> }> = [];
  const imageRows: Array<Record<string, unknown>> = [];
  const store: ScreeningStore = {
    listProviders: vi.fn().mockResolvedValue(providers),
    insertScreening: vi.fn(async (row) => {
      screenings.push(row as unknown as Record<string, unknown>);
    }),
    applyFields: vi.fn(async (providerId, payload) => {
      fieldWrites.push({ providerId, payload });
    }),
    stageImages: vi.fn(async (row) => {
      imageRows.push(row);
      return 'staged' as const;
    }),
  };
  return { store, screenings, fieldWrites, imageRows };
}

const run = (
  providers: ScreeningProvider[],
  fetchPlaces: (p: ScreeningProvider) => Promise<ApifyPlace[]>,
  apply = true,
) => {
  const ctx = makeStore(providers);
  const logs: string[] = [];
  const summary = runScreening({
    store: ctx.store,
    fetchPlaces,
    log: (m) => logs.push(m),
    options: { apply, limit: 10 },
  });
  return { ...ctx, logs, summary };
};

describe('#763 criterion 1: actor input', () => {
  it('searches by name plus address with constants kept in one place', () => {
    const input = buildActorInput(provider());
    expect(input.searchStringsArray).toEqual(['Bistro Salam Hauptstr. 1 10115 Berlin']);
    expect(GOOGLE_MAPS_SETTINGS.maxReviews).toBe(50);
    expect(input.maxReviews).toBe(50);
    expect(input.scrapeContacts).toBe(true);
    expect(input.maxImages).toBe(GOOGLE_MAPS_SETTINGS.maxImages);
    expect(GOOGLE_MAPS_SETTINGS.maxImages).toBe(5);
  });
});

describe('#763 criterion 2: matching', () => {
  it('matches the place nearest to the provider coordinates', async () => {
    const far = place({ title: 'Other', location: { lat: 52.6, lng: 13.5 } });
    const near = place();
    const { summary, screenings } = run([provider()], async () => [far, near]);
    await summary;
    expect(screenings).toHaveLength(1);
    expect((screenings[0].raw as { title: string }).title).toBe('Bistro Salam');
    expect(screenings[0].flags).not.toContainEqual(
      expect.objectContaining({ code: 'no_maps_match' }),
    );
  });

  it('matches by normalised name plus postcode when the provider has no coordinates', async () => {
    const p = provider({ latitude: null, longitude: null });
    const m = place({ title: 'BISTRO  Salam!', location: undefined });
    const { summary, screenings } = run([p], async () => [m]);
    await summary;
    expect(screenings[0].flags).not.toContainEqual(
      expect.objectContaining({ code: 'no_maps_match' }),
    );
  });

  it('stores a review screening with no_maps_match instead of guessing', async () => {
    const wrong = place({
      title: 'Kebab King',
      postalCode: '80331',
      location: { lat: 48.1, lng: 11.5 },
    });
    const { summary, screenings } = run([provider()], async () => [wrong]);
    await summary;
    expect(screenings[0].status).toBe('review');
    expect(screenings[0].flags).toEqual([expect.objectContaining({ code: 'no_maps_match' })]);
  });

  it('treats an empty result as unmatched and reports it', async () => {
    const { summary, screenings, logs } = run([provider()], async () => []);
    const result = await summary;
    expect(screenings[0].status).toBe('review');
    expect(result.review).toBe(1);
    expect(logs.join('\n')).toContain('p1');
  });
});

describe('#763 criterion 3: scanning and stored row', () => {
  it('scans reviews, attributes, category and website into flags and status', async () => {
    const m = place({
      reviews: [{ text: 'Tolles Bier und Wein', stars: 5 }],
      additionalInfo: { Offerings: [{ 'Serves beer': true }, { 'Serves wine': false }] },
    });
    const { summary, screenings } = run([provider()], async () => [m]);
    await summary;
    const row = screenings[0];
    expect(row.provider_id).toBe('p1');
    expect(row.source).toBe('google_maps_apify');
    expect(row.status).toBe('flagged');
    const flags = row.flags as Array<{ code: string; source: string }>;
    expect(flags.some((f) => f.code === 'alcohol' && f.source === 'attribute')).toBe(true);
    expect(flags.some((f) => f.code === 'alcohol' && f.source === 'review')).toBe(true);
  });

  it('flags a place whose category names alcohol as review', async () => {
    const m = place({ categoryName: 'Weinbar', reviews: [], additionalInfo: {} });
    const { summary, screenings } = run([provider()], async () => [m]);
    await summary;
    expect(screenings[0].status).toBe('review');
  });

  it('stores a trimmed raw without images and with reviews capped at 50', async () => {
    const reviews = Array.from({ length: 80 }, (_, i) => ({ text: `ok ${i}`, stars: 4 }));
    const { summary, screenings } = run([provider()], async () => [place({ reviews })]);
    await summary;
    const raw = screenings[0].raw as Record<string, unknown>;
    expect(JSON.stringify(raw)).not.toContain('img/1.jpg');
    expect(raw).not.toHaveProperty('imageUrls');
    expect((raw.reviews as unknown[]).length).toBe(50);
  });
});

describe('#763 criterion 4: dry-run vs apply', () => {
  it('writes nothing in dry-run and prints what it would store', async () => {
    const { summary, store, logs } = run([provider()], async () => [place()], false);
    await summary;
    expect(store.insertScreening).not.toHaveBeenCalled();
    expect(store.applyFields).not.toHaveBeenCalled();
    expect(store.stageImages).not.toHaveBeenCalled();
    expect(logs.join('\n')).toMatch(/would store/i);
  });

  it('writes the screening in apply mode', async () => {
    const { summary, store } = run([provider()], async () => [place()], true);
    await summary;
    expect(store.insertScreening).toHaveBeenCalledTimes(1);
  });
});

describe('#763 criterion 5: limit', () => {
  it('accepts positive integers and caps at 100', () => {
    expect(resolveLimit('5')).toBe(5);
    expect(resolveLimit('500')).toBe(100);
    expect(resolveLimit(undefined)).toBe(10);
  });

  it.each(['0', '-1', '1.5', 'abc', '5; rm -rf /', ''])('rejects %j', (raw) => {
    if (raw === '') {
      expect(resolveLimit(raw)).toBe(10);
    } else {
      expect(() => resolveLimit(raw)).toThrow(/positive integer/);
    }
  });
});

describe('#763 criterion 6: failures do not abort the batch', () => {
  it('continues after an Apify failure and exits 0 when at least one provider succeeded', async () => {
    const ps = [provider({ provider_id: 'bad' }), provider({ provider_id: 'good' })];
    const fetchPlaces = vi.fn(async (p: ScreeningProvider) => {
      if (p.provider_id === 'bad') throw new Error('Apify timeout');
      return [place()];
    });
    const { summary, screenings, logs } = run(ps, fetchPlaces);
    const result = await summary;
    expect(screenings.map((s) => s.provider_id)).toEqual(['good']);
    expect(result.failed).toBe(1);
    expect(logs.join('\n')).toMatch(/bad.*Apify timeout/);
    expect(exitCodeFor(result)).toBe(0);
  });

  it('exits non-zero only when every provider failed', async () => {
    const ps = [provider({ provider_id: 'a' }), provider({ provider_id: 'b' })];
    const { summary } = run(ps, async () => {
      throw new Error('boom');
    });
    expect(exitCodeFor(await summary)).toBe(1);
  });
});

describe('#763 criterion 9 and 10: images', () => {
  it('leaves a provider that already has images untouched', async () => {
    const p = provider({ imageUrls: ['https://existing/1.jpg'] });
    const { summary, store } = run([p], async () => [place()]);
    await summary;
    expect(store.stageImages).not.toHaveBeenCalled();
  });

  it('stages the scraped images for a provider without images, capped at maxImages', async () => {
    const many = Array.from({ length: 9 }, (_, i) => `https://img/${i}.jpg`);
    const { summary, imageRows } = run([provider()], async () => [place({ imageUrls: many })]);
    await summary;
    expect(imageRows).toHaveLength(1);
    expect(imageRows[0]).toMatchObject({
      provider_id: 'p1',
      field_name: 'provider_images',
      enrichment_type: 'image',
      status: 'pending',
    });
    expect((imageRows[0].proposed_value as { urls: string[] }).urls).toEqual(many.slice(0, 5));
  });

  it('includes images in the cost estimate', async () => {
    const withImages = await run([provider()], async () => [place()]).summary;
    const without = await run([provider()], async () => [place({ imageUrls: [] })]).summary;
    expect(withImages.estimatedCostUsd).toBeGreaterThan(without.estimatedCostUsd);
    expect(without.estimatedCostUsd).toBeCloseTo(0.017, 5);
  });
});

describe('#763 criterion 11 and 12: empty fields only', () => {
  it('fills empty website, phone, opening hours and instagram', async () => {
    const { summary, fieldWrites } = run([provider()], async () => [place()]);
    await summary;
    expect(fieldWrites).toHaveLength(1);
    const payload = fieldWrites[0].payload as {
      providers: Record<string, unknown>;
      locations: Array<Record<string, unknown>>;
    };
    expect(payload.providers).toMatchObject({
      social_website: 'https://bistro-salam.example',
      contact_phone: '+49 30 1234567',
      social_instagram: 'https://www.instagram.com/bistrosalam',
      opening_hours: { monday: { open: '11:00', close: '22:00' } },
    });
    expect(payload.locations[0]).toMatchObject({ location_id: 'loc1', is_primary: true });
  });

  it('does not overwrite a field that is already set', async () => {
    const p = provider({
      social_website: 'https://mine.example',
      contact_phone: '+49 1',
      social_instagram: 'https://instagram.com/mine',
      opening_hours: { monday: { open: '09:00', close: '17:00' } },
    });
    const { summary, fieldWrites } = run([p], async () => [place()]);
    await summary;
    expect(fieldWrites).toHaveLength(0);
  });

  it('only writes the fields that are empty', async () => {
    const p = provider({ social_website: 'https://mine.example' });
    const { summary, fieldWrites } = run([p], async () => [place()]);
    await summary;
    const providers = (fieldWrites[0].payload as { providers: Record<string, unknown> }).providers;
    expect(providers).not.toHaveProperty('social_website');
    expect(providers).toHaveProperty('contact_phone');
  });

  it('does not enrich when the place was not matched', async () => {
    const wrong = place({
      title: 'Kebab King',
      postalCode: '80331',
      location: { lat: 48.1, lng: 11.5 },
    });
    const { summary, fieldWrites, store } = run([provider()], async () => [wrong]);
    await summary;
    expect(fieldWrites).toHaveLength(0);
    expect(store.stageImages).not.toHaveBeenCalled();
  });

  it('dry-run lists every image and field it would add', async () => {
    const { summary, logs } = run([provider()], async () => [place()], false);
    await summary;
    const out = logs.join('\n');
    for (const needle of [
      'social_website',
      'contact_phone',
      'social_instagram',
      'opening_hours',
      'https://img/1.jpg',
      'https://img/2.jpg',
    ]) {
      expect(out).toContain(needle);
    }
  });
});
