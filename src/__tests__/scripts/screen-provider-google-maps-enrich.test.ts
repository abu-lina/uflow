import { describe, expect, it, vi } from 'vitest';

import { GOOGLE_MAPS_SETTINGS } from '@/lib/enrichment/google-maps/apify-google-maps-client';
import {
  runScreening,
  type ApifyPlace,
  type ScreeningProvider,
  type ScreeningStore,
} from '../../../scripts/screen-provider-google-maps';

const provider = (over: Partial<ScreeningProvider> = {}): ScreeningProvider =>
  ({
    provider_id: 'p1',
    provider_name: 'Bistro Salam',
    address_street: 'Hauptstr. 1',
    address_zip: '10115',
    address_city: 'Berlin',
    contact_phone: null,
    social_website: null,
    social_instagram: null,
    opening_hours: null,
    provider_description: null,
    has_parking: false,
    family_friendly: false,
    children_friendly: false,
    imageUrls: [],
    latitude: 52.52,
    longitude: 13.405,
    primaryLocationId: 'loc1',
    ...over,
  }) as ScreeningProvider;

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
  imageUrls: ['https://img/1.jpg'],
  reviews: [{ text: 'Great falafel', stars: 5 }],
  additionalInfo: {},
  ...over,
});

const unmatched = (): ApifyPlace =>
  place({ title: 'Kebab King', postalCode: '80331', location: { lat: 48.1, lng: 11.5 } });

async function run(p: ScreeningProvider, places: ApifyPlace[]) {
  const screenings: Array<Record<string, unknown>> = [];
  const writes: Array<Record<string, unknown>> = [];
  const store: ScreeningStore = {
    listProviders: vi.fn().mockResolvedValue([p]),
    insertScreening: vi.fn(async (row) => {
      screenings.push(row as unknown as Record<string, unknown>);
    }),
    applyFields: vi.fn(async (_id, payload) => {
      writes.push(payload);
    }),
    stageImages: vi.fn(async () => ({ outcome: 'staged' as const })),
  };
  await runScreening({
    store,
    fetchPlaces: async () => places,
    options: { apply: true, limit: 10 },
  });
  const providers = (writes[0]?.providers ?? {}) as Record<string, unknown>;
  const locations = (writes[0]?.locations ?? []) as Array<Record<string, unknown>>;
  return { store, screenings, writes, providers, locations };
}

const alcoholPlace = () => place({ additionalInfo: { Offerings: [{ 'Serves beer': true }] } }); // flagged
const reviewPlace = () => place({ categoryName: 'Weinbar' }); // review

describe('#792 public fields are written only when the screening status is clear', () => {
  it('writes fields and stages images for a clear provider', async () => {
    const r = await run(provider(), [place()]);
    expect(r.screenings[0].status).toBe('clear');
    expect(r.providers).toMatchObject({ contact_phone: '+49 30 1234567' });
    expect(r.store.stageImages).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['review', () => [reviewPlace()]],
    ['flagged', () => [alcoholPlace()]],
    ['no_maps_match', () => [unmatched()]],
  ])('%s provider gets a screening row only', async (_name, places) => {
    const r = await run(provider(), places());
    expect(r.screenings).toHaveLength(1);
    expect(r.store.applyFields).not.toHaveBeenCalled();
    expect(r.store.stageImages).not.toHaveBeenCalled();
  });
});

describe('#792 provider_screenings.raw stores the full Apify place item', () => {
  it.each([
    ['clear', () => [place()]],
    ['review', () => [reviewPlace()]],
    ['flagged', () => [alcoholPlace()]],
  ])('keeps every field of the item for a %s provider', async (_name, places) => {
    const item = {
      ...places()[0],
      rating: 4.6,
      placeId: 'ChIJ1',
      imageUrls: ['https://img/1.jpg'],
    };
    const r = await run(provider(), [item as ApifyPlace]);
    expect(r.screenings[0].raw).toMatchObject({
      rating: 4.6,
      placeId: 'ChIJ1',
      imageUrls: ['https://img/1.jpg'],
      openingHours: item.openingHours,
      additionalInfo: item.additionalInfo,
    });
  });

  it('keeps the returned items when nothing matched', async () => {
    const r = await run(provider(), [unmatched()]);
    expect(JSON.stringify(r.screenings[0].raw)).toContain('Kebab King');
  });

  it.each([
    ['clear', (over: Partial<ApifyPlace>) => place(over)],
    ['review', (over: Partial<ApifyPlace>) => place({ ...over, categoryName: 'Weinbar' })],
    [
      'flagged',
      (over: Partial<ApifyPlace>) =>
        place({ ...over, additionalInfo: { Offerings: [{ 'Serves beer': true }] } }),
    ],
    ['no_maps_match', (over: Partial<ApifyPlace>) => ({ ...unmatched(), ...over })],
  ])(
    'caps reviews at maxReviews without trimming their text for a %s provider',
    async (name, make) => {
      const long = 'x'.repeat(900);
      const reviews = Array.from({ length: 80 }, () => ({ text: long, stars: 4 }));
      const r = await run(provider(), [make({ reviews })]);
      const raw = r.screenings[0].raw as Record<string, unknown>;
      const stored = (
        name === 'no_maps_match'
          ? (raw.places as Array<{ reviews: Array<{ text: string }> }>)[0].reviews
          : (raw.reviews as Array<{ text: string }>)
      ) as Array<{ text: string }>;
      expect(r.screenings[0].status).toBe(name === 'no_maps_match' ? 'review' : name);
      expect(stored).toHaveLength(GOOGLE_MAPS_SETTINGS.maxReviews);
      expect(stored[0].text).toBe(long);
    },
  );
});

describe('#792 reviewer identity is not stored in raw', () => {
  const reviewWithReviewer = {
    text: 'Great falafel',
    stars: 5,
    publishedAtDate: '2026-09-01T10:00:00.000Z',
    likesCount: 2,
    reviewerName: 'Jane Doe',
    reviewerUrl: 'https://www.google.com/maps/contrib/1',
    reviewerId: '1',
  };

  it.each([
    ['clear', () => place({ reviews: [reviewWithReviewer] })],
    ['review', () => place({ categoryName: 'Weinbar', reviews: [reviewWithReviewer] })],
    ['no_maps_match', () => ({ ...unmatched(), reviews: [reviewWithReviewer] })],
  ])('strips reviewerName, reviewerUrl and reviewerId for a %s provider', async (name, make) => {
    const r = await run(provider(), [make()]);
    const raw = r.screenings[0].raw as Record<string, unknown>;
    const stored = (
      name === 'no_maps_match'
        ? (raw.places as Array<{ reviews: Array<Record<string, unknown>> }>)[0].reviews
        : raw.reviews
    ) as Array<Record<string, unknown>>;
    expect(stored[0]).toEqual({
      text: 'Great falafel',
      stars: 5,
      publishedAtDate: '2026-09-01T10:00:00.000Z',
      likesCount: 2,
    });
    const serialised = JSON.stringify(r.screenings[0]);
    for (const needle of ['Jane Doe', 'contrib/1', 'reviewerName', 'reviewerUrl', 'reviewerId']) {
      expect(serialised).not.toContain(needle);
    }
  });
});

describe('#792 provider_description', () => {
  it('is filled from description when empty', async () => {
    const r = await run(provider(), [place({ description: 'Syrian family kitchen.' })]);
    expect(r.providers.provider_description).toBe('Syrian family kitchen.');
  });

  it('keeps an existing description', async () => {
    const r = await run(provider({ provider_description: 'Mine' }), [
      place({ description: 'Syrian family kitchen.' }),
    ]);
    expect(r.providers).not.toHaveProperty('provider_description');
  });
});

describe('#792 description is screened and capped before it is published', () => {
  it('does not give clear to a description that mentions alcohol, and writes nothing', async () => {
    const r = await run(provider(), [place({ description: 'Cozy bar with beer and wine.' })]);
    expect(r.screenings[0].status).not.toBe('clear');
    expect(r.screenings[0].flags).toContainEqual(
      expect.objectContaining({ code: 'alcohol', source: 'website' }),
    );
    expect(r.store.applyFields).not.toHaveBeenCalled();
  });

  it('caps the published description at 2000 characters', async () => {
    const r = await run(provider(), [place({ description: `  ${'a'.repeat(2500)}  ` })]);
    expect(r.providers.provider_description).toBe('a'.repeat(2000));
  });
});

describe('#792 has_parking, family_friendly and children_friendly', () => {
  it('sets has_parking true when additionalInfo explicitly lists parking', async () => {
    const r = await run(provider(), [
      place({ additionalInfo: { Parking: [{ 'Free parking lot': true }] } }),
    ]);
    expect(r.providers.has_parking).toBe(true);
  });

  it('sets only family_friendly from an explicit family-friendly entry', async () => {
    const r = await run(provider(), [
      place({ additionalInfo: { Crowd: [{ 'Family-friendly': true }] } }),
    ]);
    expect(r.providers.family_friendly).toBe(true);
    expect(r.providers).not.toHaveProperty('children_friendly');
  });

  it('sets only children_friendly from an explicit good-for-kids entry', async () => {
    const r = await run(provider(), [
      place({ additionalInfo: { Children: [{ 'Good for kids': true }] } }),
    ]);
    expect(r.providers.children_friendly).toBe(true);
    expect(r.providers).not.toHaveProperty('family_friendly');
  });

  it('never sets a flag from an entry that is false or absent', async () => {
    const r = await run(provider(), [
      place({
        additionalInfo: {
          Parking: [{ 'Free parking lot': false }],
          Children: [{ 'Good for kids': false }],
          Crowd: [{ 'Family-friendly': false }],
        },
      }),
    ]);
    for (const key of ['has_parking', 'family_friendly', 'children_friendly']) {
      expect(r.providers).not.toHaveProperty(key);
    }
  });
});

describe('#792 missing data never sets a flag to false and never overwrites', () => {
  it('writes no boolean at all when the place has no additionalInfo', async () => {
    const r = await run(provider(), [place({ additionalInfo: undefined })]);
    for (const key of ['has_parking', 'family_friendly', 'children_friendly']) {
      expect(r.providers).not.toHaveProperty(key);
    }
    expect(Object.values(r.providers)).not.toContain(false);
  });

  it('does not write a flag that is already true', async () => {
    const p = provider({ has_parking: true, family_friendly: true, children_friendly: true });
    const r = await run(p, [
      place({
        website: null,
        phone: null,
        instagrams: [],
        openingHours: [],
        additionalInfo: {
          Parking: [{ 'Free parking lot': true }],
          Crowd: [{ 'Family-friendly': true }],
          Children: [{ 'Good for kids': true }],
        },
      }),
    ]);
    expect(r.store.applyFields).not.toHaveBeenCalled();
  });

  it('does not overwrite non-empty text, address or coordinate fields', async () => {
    const p = provider({
      provider_description: 'Mine',
      contact_phone: '+49 1',
      address_street: 'Alt 2',
      address_zip: '20095',
      address_city: 'Hamburg',
      latitude: 52.5204,
      longitude: 13.405,
    });
    const r = await run(p, [
      place({
        description: 'Theirs',
        address: 'Hauptstr. 1, 10115 Berlin, Germany',
        postalCode: '20095',
        location: { lat: 52.5201, lng: 13.4051 },
        website: null,
        instagrams: [],
        openingHours: [],
      }),
    ]);
    expect(r.store.applyFields).not.toHaveBeenCalled();
  });
});

describe('#792 empty address and coordinate fields are filled', () => {
  const full = () =>
    place({
      address: 'Hauptstr. 1, 10115 Berlin, Germany',
      location: { lat: 52.5201, lng: 13.4051 },
      postalCode: '10115',
    });

  it('fills street, zip and city from address when the provider matched by coordinates', async () => {
    const p = provider({ address_street: null, address_zip: null, address_city: null });
    const r = await run(p, [full()]);
    const expected = {
      address_street: 'Hauptstr. 1',
      address_zip: '10115',
      address_city: 'Berlin',
    };
    expect(r.providers).toMatchObject(expected);
    expect(r.locations[0]).toMatchObject({ location_id: 'loc1', ...expected });
  });

  it('fills latitude and longitude from location when the provider matched by name and postcode', async () => {
    const p = provider({ latitude: null, longitude: null });
    const r = await run(p, [full()]);
    const expected = { location_latitude: 52.5201, location_longitude: 13.4051 };
    expect(r.providers).toMatchObject(expected);
    expect(r.locations[0]).toMatchObject({ location_id: 'loc1', ...expected });
  });
});

describe('#792 no_alcohol and halal fields are never written', () => {
  it('writes no no_alcohol, even when no alcohol was found', async () => {
    const r = await run(provider(), [
      place({ additionalInfo: { Parking: [{ 'Free parking lot': true }] } }),
    ]);
    expect(JSON.stringify(r.writes)).not.toContain('no_alcohol');
    expect(r.writes[0]).not.toHaveProperty('food_providers');
  });

  it('writes none of halal_level, muslim_owned, no_pork, has_prayer_space, women_friendly', async () => {
    const r = await run(provider(), [
      place({
        description: 'Halal, women friendly, prayer room, Muslim owned, no pork',
        additionalInfo: {
          Parking: [{ 'Free parking lot': true }],
          Crowd: [{ 'Family-friendly': true }],
          Children: [{ 'Good for kids': true }],
        },
      }),
    ]);
    const written = JSON.stringify(r.writes);
    for (const key of [
      'halal_level',
      'muslim_owned',
      'no_pork',
      'has_prayer_space',
      'women_friendly',
    ]) {
      expect(written).not.toContain(key);
    }
  });
});
