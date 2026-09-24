/**
 * Food city SEO metadata tests (request 244 — T1)
 *
 * `/food/[city]` and `/food/[city]/[category]` are dynamic SSR acquisition
 * pages (each page awaits `searchParams`, so no ISR/SSG machinery applies).
 * The tests cover unique title, description, canonical, and OpenGraph output,
 * plus non-indexable metadata for invalid city/category slugs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const CITY_ROWS = [{ city_name: 'Berlin' }, { city_name: 'München' }];

vi.mock('@/app/(public)/providers/renderProvidersPage', () => ({
  renderProvidersPage: vi.fn(),
}));

vi.mock('@/lib/city-slug', () => ({
  findCityBySlug: vi.fn(async (slug: string) => {
    const match = CITY_ROWS.find(
      (row) => row.city_name.toLowerCase().replace('ü', 'ue') === slug,
    );
    return match ? match.city_name : null;
  }),
}));

vi.mock('@/services/categories', () => ({
  getCategoryBySlug: vi.fn(async (slug: string) =>
    slug === 'kebab'
      ? { id: '1', category_id: 'kebab', slug: 'kebab', name_de: 'Kebab', name_en: 'Kebab' }
      : null,
  ),
}));

describe('/food/[city] SEO metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not claim ISR or static params while server filters use searchParams', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    expect(mod).not.toHaveProperty('revalidate');
    expect(mod).not.toHaveProperty('generateStaticParams');
  });

  it('emits a city-specific title and description', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin' }),
    });

    expect(meta.title).toEqual({ absolute: 'Halal Food in Berlin | Ummah Flow' });
    expect(typeof meta.description).toBe('string');
    expect(meta.description).toContain('Berlin');
    expect((meta.description as string).length).toBeGreaterThan(50);
  });

  it('emits a canonical pointing at /food/<city-slug>', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin' }),
    });

    expect(meta.alternates?.canonical).toBe('https://ummahflow.com/food/berlin');
  });

  it('emits an OpenGraph block whose url matches the canonical', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'muenchen' }),
    });

    expect(meta.openGraph?.url).toBe('https://ummahflow.com/food/muenchen');
    expect(meta.openGraph?.title).toBe('Halal Food in München | Ummah Flow');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.openGraph as any)?.siteName).toBe('Ummah Flow');
  });

  it('keeps umlaut cities on the transliterated canonical (München → muenchen)', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'muenchen' }),
    });

    expect(meta.title).toEqual({ absolute: 'Halal Food in München | Ummah Flow' });
    expect(meta.alternates?.canonical).toBe('https://ummahflow.com/food/muenchen');
  });

  it('does not emit an indexable canonical for an unknown city slug', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'atlantis' }),
    });

    expect(meta.title).toEqual({ absolute: 'City not found | Ummah Flow' });
    expect(meta.alternates?.canonical).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.robots as any)?.index).toBe(false);
  });
});

describe('/food/[city]/[category] SEO metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not claim ISR while server filters use searchParams', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    expect(mod).not.toHaveProperty('revalidate');
  });

  it('emits a category-aware title and description', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'kebab' }),
    });

    expect(meta.title).toEqual({ absolute: 'Kebab in Berlin | Halal Food | Ummah Flow' });
    expect(meta.description).toContain('Kebab');
    expect(meta.description).toContain('Berlin');
  });

  it('emits its own canonical at /food/<city>/<category>', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'kebab' }),
    });

    expect(meta.alternates?.canonical).toBe('https://ummahflow.com/food/berlin/kebab');
    expect(meta.openGraph?.url).toBe('https://ummahflow.com/food/berlin/kebab');
  });

  it('differs from the city-level title (no duplicate titles)', async () => {
    const cityMod = await import('@/app/(public)/food/[city]/page');
    const categoryMod = await import('@/app/(public)/food/[city]/[category]/page');

    const cityMeta = await cityMod.generateMetadata({
      params: Promise.resolve({ city: 'berlin' }),
    });
    const categoryMeta = await categoryMod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'kebab' }),
    });

    expect(categoryMeta.title).not.toEqual(cityMeta.title);
    expect(categoryMeta.alternates?.canonical).not.toBe(cityMeta.alternates?.canonical);
  });

  it('does not emit an indexable canonical for an unknown category slug', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'nope' }),
    });

    expect(meta.title).toEqual({ absolute: 'Page not found | Ummah Flow' });
    expect(meta.alternates?.canonical).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.robots as any)?.index).toBe(false);
  });
});
