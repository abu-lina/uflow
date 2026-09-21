/**
 * Food city SEO machinery tests (request 244 — T1)
 *
 * `/food/[city]` and `/food/[city]/[category]` are indexable acquisition pages,
 * so they need the same metadata + ISR machinery as `/city/[cityName]`:
 * unique title, description, canonical, OpenGraph, revalidate = 300, and
 * pre-rendered params for every row in `cities`.
 *
 * Tests written BEFORE implementation (RED phase).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const CITY_ROWS = [{ city_name: 'Berlin' }, { city_name: 'München' }];

vi.mock('@/app/(public)/providers/renderProvidersPage', () => ({
  renderProvidersPage: vi.fn(),
}));

vi.mock('@/lib/supabase/static', () => ({
  createSupabaseStaticClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: CITY_ROWS, error: null }),
    }),
  }),
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

  it('exports revalidate = 300 (ISR, ADR-005)', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    expect(mod.revalidate).toBe(300);
  });

  it('pre-renders one slugified param per city row', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const params = await mod.generateStaticParams();
    expect(params).toEqual([{ city: 'berlin' }, { city: 'muenchen' }]);
  });

  it('emits a city-specific title and description', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin' }),
    });

    expect(meta.title).toContain('Berlin');
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
    expect(meta.openGraph?.title).toContain('München');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.openGraph as any)?.siteName).toBe('Ummah Flow');
  });

  it('keeps umlaut cities on the transliterated canonical (München → muenchen)', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'muenchen' }),
    });

    expect(meta.title).toContain('München');
    expect(meta.alternates?.canonical).toBe('https://ummahflow.com/food/muenchen');
  });

  it('does not emit an indexable canonical for an unknown city slug', async () => {
    const mod = await import('@/app/(public)/food/[city]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'atlantis' }),
    });

    expect(meta.alternates?.canonical).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.robots as any)?.index).toBe(false);
  });
});

describe('/food/[city]/[category] SEO metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports revalidate = 300 (ISR, ADR-005)', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    expect(mod.revalidate).toBe(300);
  });

  it('emits a category-aware title and description', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'kebab' }),
    });

    expect(meta.title).toContain('Kebab');
    expect(meta.title).toContain('Berlin');
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

    expect(categoryMeta.title).not.toBe(cityMeta.title);
    expect(categoryMeta.alternates?.canonical).not.toBe(cityMeta.alternates?.canonical);
  });

  it('does not emit an indexable canonical for an unknown category slug', async () => {
    const mod = await import('@/app/(public)/food/[city]/[category]/page');
    const meta = await mod.generateMetadata({
      params: Promise.resolve({ city: 'berlin', category: 'nope' }),
    });

    expect(meta.alternates?.canonical).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((meta.robots as any)?.index).toBe(false);
  });
});
