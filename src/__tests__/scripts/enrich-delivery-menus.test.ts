import { describe, expect, it, vi } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));

import {
  MENU_CASCADE_ORDER,
  formatCascadeLogLine,
  parsePlatformFlag,
  runMenuCascade,
  type DeliveryLinkRow,
  type FetchedMenu,
} from '../../../scripts/enrich-delivery-menus';

type Platform = DeliveryLinkRow['platform'];

const link = (platform: Platform): DeliveryLinkRow => ({
  provider_id: 'p1',
  provider_name: 'Doner House',
  platform,
  platform_url: `https://${platform}.example/venue`,
  platform_slug: null,
  apify_checked_at: null,
});

const allLinks = (): DeliveryLinkRow[] => [link('ubereats'), link('lieferando'), link('wolt')];

const menu = (n: number): FetchedMenu => ({
  menuItems: Array.from({ length: n }, (_, i) => ({
    name_de: `Item ${i}`,
    description_de: null,
    category: null,
    price_cents: null,
    is_available: true,
    sort_order: i,
  })),
});

function fetcherReturning(counts: Partial<Record<Platform, number>>) {
  return vi.fn(async (l: DeliveryLinkRow) => menu(counts[l.platform] ?? 0));
}

const triedPlatforms = (fetchMenu: ReturnType<typeof fetcherReturning>) =>
  fetchMenu.mock.calls.map(([l]) => l.platform);

describe('cascade order constant', () => {
  it('is Wolt, then Lieferando, then UberEats', () => {
    expect(MENU_CASCADE_ORDER).toEqual(['wolt', 'lieferando', 'ubereats']);
  });
});

describe('menu cascade', () => {
  it('stops at Wolt when Wolt returns items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 3, lieferando: 5, ubereats: 7 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).toEqual(['wolt']);
    expect(result.winner?.link.platform).toBe('wolt');
    expect(result.attempts).toEqual([{ platform: 'wolt', itemCount: 3 }]);
    expect(result.cascadeSkipped).toEqual(['lieferando', 'ubereats']);
  });

  it('falls through to Lieferando when Wolt returns zero items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, lieferando: 5, ubereats: 7 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).toEqual(['wolt', 'lieferando']);
    expect(result.winner?.link.platform).toBe('lieferando');
    expect(result.attempts).toEqual([
      { platform: 'wolt', itemCount: 0 },
      { platform: 'lieferando', itemCount: 5 },
    ]);
    expect(result.cascadeSkipped).toEqual(['ubereats']);
  });

  it('falls through to UberEats when Wolt and Lieferando both return zero items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, lieferando: 0, ubereats: 7 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).toEqual(['wolt', 'lieferando', 'ubereats']);
    expect(result.winner?.link.platform).toBe('ubereats');
    expect(result.cascadeSkipped).toEqual([]);
  });

  it('has no winner when every platform returns zero items', async () => {
    const fetchMenu = fetcherReturning({});
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(result.winner).toBeNull();
    expect(result.attempts).toHaveLength(3);
  });

  it('continues to the next platform when a platform throws, and records the error', async () => {
    const fetchMenu = vi.fn(async (l: DeliveryLinkRow) => {
      if (l.platform === 'wolt') throw new Error('actor down');
      return menu(2);
    });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(result.winner?.link.platform).toBe('lieferando');
    expect(result.attempts[0]).toEqual({ platform: 'wolt', itemCount: 0, error: 'actor down' });
  });

  it('only tries platforms the provider has a link for', async () => {
    const fetchMenu = fetcherReturning({ lieferando: 4 });
    const result = await runMenuCascade({
      links: [link('ubereats'), link('lieferando')],
      fetchMenu,
    });

    expect(triedPlatforms(fetchMenu)).toEqual(['lieferando']);
    expect(result.cascadeSkipped).toEqual(['ubereats']);
  });
});

describe('--platform flag', () => {
  it('parses only known platforms', () => {
    expect(parsePlatformFlag('ubereats')).toBe('ubereats');
    expect(parsePlatformFlag(undefined)).toBeUndefined();
    expect(() => parsePlatformFlag('doordash')).toThrow(/wolt\|lieferando\|ubereats/);
  });

  it('bypasses the cascade and calls only the forced platform', async () => {
    const fetchMenu = fetcherReturning({ wolt: 3, lieferando: 5, ubereats: 7 });
    const result = await runMenuCascade({
      links: allLinks(),
      fetchMenu,
      forcedPlatform: 'ubereats',
    });

    expect(triedPlatforms(fetchMenu)).toEqual(['ubereats']);
    expect(result.winner?.link.platform).toBe('ubereats');
  });

  it('does not fall through to other platforms when the forced platform returns zero items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 3, lieferando: 5, ubereats: 0 });
    const result = await runMenuCascade({
      links: allLinks(),
      fetchMenu,
      forcedPlatform: 'ubereats',
    });

    expect(triedPlatforms(fetchMenu)).toEqual(['ubereats']);
    expect(result.winner).toBeNull();
  });
});

describe('per-provider log line', () => {
  it('states tried platforms with item counts and cascade-skipped platforms', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, lieferando: 5 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    const line = formatCascadeLogLine('Doner House', result);
    expect(line).toContain('Doner House');
    expect(line).toContain('tried: wolt (0 items), lieferando (5 items)');
    expect(line).toContain('skipped (cascade): ubereats');
  });

  it('includes platforms skipped by the pre-check and errors', async () => {
    const fetchMenu = vi.fn(async (): Promise<FetchedMenu> => {
      throw new Error('blocked');
    });
    const result = await runMenuCascade({ links: [link('lieferando')], fetchMenu });

    const line = formatCascadeLogLine('Doner House', result, ['wolt']);
    expect(line).toContain('lieferando (error: blocked)');
    expect(line).toContain('skipped (already checked): wolt');
  });
});
