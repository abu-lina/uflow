// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase server client ────────────────────────────────────────────
const mockSupabase = { from: vi.fn() };

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => mockSupabase,
}));

// ─── Mock data ──────────────────────────────────────────────────────────────
const SITE_URL = 'https://ummahflow.com';

function chainResolving(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve({ data, error });
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.returns = vi.fn().mockReturnValue(terminal);
  chain.then = terminal.then.bind(terminal);
  chain.catch = terminal.catch.bind(terminal);
  return chain;
}

// ─── Sitemap tests ──────────────────────────────────────────────────────────

describe('sitemap.xml — #950', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  });

  it('lists /food as a sitemap entry', async () => {
    // No cities with providers
    const providersChain = chainResolving([]);
    mockSupabase.from.mockReturnValue(providersChain);

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    const urls = entries.map((e: { url: string }) => e.url);
    expect(urls).toContain(`${SITE_URL}/food`);
  });

  it('lists /food/<city-slug> when city has approved food providers', async () => {
    // providers query returns München and Berlin
    const providersChain = chainResolving([
      { address_city: 'München', category_id: 'cat-1' },
      { address_city: 'Berlin', category_id: 'cat-2' },
    ]);
    const categoriesChain = chainResolving([
      { category_id: 'cat-1', slug: 'restaurant', applicable_section: 'food' },
      { category_id: 'cat-2', slug: 'baeckerei', applicable_section: 'food' },
    ]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'providers') return providersChain;
      if (table === 'categories') return categoriesChain;
      return chainResolving([]);
    });

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    const urls = entries.map((e: { url: string }) => e.url);
    // München → muenchen (slugified)
    expect(urls).toContain(`${SITE_URL}/food/muenchen`);
    expect(urls).toContain(`${SITE_URL}/food/berlin`);
  });

  it('lists /food/<city-slug>/<category-slug> when pair has approved food provider', async () => {
    const providersChain = chainResolving([{ address_city: 'Berlin', category_id: 'cat-rest' }]);
    const categoriesChain = chainResolving([
      { category_id: 'cat-rest', slug: 'restaurant', applicable_section: 'food' },
    ]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'providers') return providersChain;
      if (table === 'categories') return categoriesChain;
      return chainResolving([]);
    });

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    const urls = entries.map((e: { url: string }) => e.url);
    expect(urls).toContain(`${SITE_URL}/food/berlin/restaurant`);
  });

  it('omits cities and pairs with no approved providers', async () => {
    // No approved food providers at all
    const providersChain = chainResolving([]);
    mockSupabase.from.mockReturnValue(providersChain);

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    const urls = entries.map((e: { url: string }) => e.url);
    // /food is always present, but no city or category URLs
    const cityOrCategoryUrls = urls.filter(
      (u: string) => u !== `${SITE_URL}/food` && u.startsWith(`${SITE_URL}/food/`),
    );
    expect(cityOrCategoryUrls).toHaveLength(0);
  });

  it('every sitemap URL matches the canonical that page sets for itself', async () => {
    // Use the same canonical URL generators to verify consistency
    const { generateFoodCityCanonicalUrl, generateFoodCategoryCanonicalUrl } =
      await import('@/utils/canonicalUrl');

    const providersChain = chainResolving([{ address_city: 'München', category_id: 'cat-doener' }]);
    const categoriesChain = chainResolving([
      { category_id: 'cat-doener', slug: 'doener', applicable_section: 'food' },
    ]);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'providers') return providersChain;
      if (table === 'categories') return categoriesChain;
      return chainResolving([]);
    });

    const { default: sitemap } = await import('@/app/sitemap');
    const entries = await sitemap();

    const urls = entries.map((e: { url: string }) => e.url);

    // City canonical must match
    const expectedCityUrl = generateFoodCityCanonicalUrl('München', SITE_URL);
    expect(urls).toContain(expectedCityUrl);

    // Category canonical must match
    const expectedCategoryUrl = generateFoodCategoryCanonicalUrl('München', 'doener', SITE_URL);
    expect(urls).toContain(expectedCategoryUrl);
  });
});

// ─── robots.txt tests ───────────────────────────────────────────────────────

describe('robots.txt — #950', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('contains Sitemap line with absolute URL on production', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);

    const { default: robots } = await import('@/app/robots');
    const result = await robots();

    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('disallows all crawling on UAT and omits sitemap', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://uat.ummahflow.com');

    const { default: robots } = await import('@/app/robots');
    const result = await robots();

    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallowAll = rules.some(
      (r) =>
        (r.userAgent === '*' || Array.isArray(r.userAgent)) &&
        (r.disallow === '/' || (Array.isArray(r.disallow) && r.disallow.includes('/'))),
    );
    expect(disallowAll).toBe(true);
    expect(result.sitemap).toBeUndefined();
  });
});
