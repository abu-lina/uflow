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

type Platform = string;

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
  it('is Wolt, then UberEats (Lieferando is not in the cascade)', () => {
    expect(MENU_CASCADE_ORDER).toEqual(['wolt', 'ubereats']);
  });
});

describe('menu cascade', () => {
  it('stops at Wolt when Wolt returns items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 3, ubereats: 7 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).toEqual(['wolt']);
    expect(result.winner?.link.platform).toBe('wolt');
    expect(result.attempts).toEqual([{ platform: 'wolt', itemCount: 3 }]);
    expect(result.cascadeSkipped).toEqual(['ubereats']);
  });

  it('falls through to UberEats when Wolt returns zero items', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, ubereats: 7 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).toEqual(['wolt', 'ubereats']);
    expect(result.winner?.link.platform).toBe('ubereats');
    expect(result.attempts).toEqual([
      { platform: 'wolt', itemCount: 0 },
      { platform: 'ubereats', itemCount: 7 },
    ]);
    expect(result.cascadeSkipped).toEqual([]);
  });

  it('has no winner when every platform returns zero items', async () => {
    const fetchMenu = fetcherReturning({});
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(result.winner).toBeNull();
    expect(result.attempts).toHaveLength(2);
  });

  it('never calls Lieferando and reports its link as unsupported', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, ubereats: 0, lieferando: 9 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(triedPlatforms(fetchMenu)).not.toContain('lieferando');
    expect(result.unsupported).toEqual(['lieferando']);
  });

  it('calls no platform for a provider that only has a Lieferando link', async () => {
    const fetchMenu = fetcherReturning({ lieferando: 9 });
    const result = await runMenuCascade({ links: [link('lieferando')], fetchMenu });

    expect(fetchMenu).not.toHaveBeenCalled();
    expect(result.winner).toBeNull();
    expect(result.attempts).toEqual([]);
    expect(result.unsupported).toEqual(['lieferando']);
  });

  it('continues to the next platform when a platform throws, and records the error', async () => {
    const fetchMenu = vi.fn(async (l: DeliveryLinkRow) => {
      if (l.platform === 'wolt') throw new Error('actor down');
      return menu(2);
    });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(result.winner?.link.platform).toBe('ubereats');
    expect(result.attempts[0]).toEqual({ platform: 'wolt', itemCount: 0, error: 'actor down' });
  });

  it('only tries platforms the provider has a link for', async () => {
    const fetchMenu = fetcherReturning({ ubereats: 4 });
    const result = await runMenuCascade({
      links: [link('ubereats'), link('lieferando')],
      fetchMenu,
    });

    expect(triedPlatforms(fetchMenu)).toEqual(['ubereats']);
    expect(result.cascadeSkipped).toEqual([]);
  });
});

describe('--platform flag', () => {
  it('parses only wolt and ubereats', () => {
    expect(parsePlatformFlag('ubereats')).toEqual({ platform: 'ubereats' });
    expect(parsePlatformFlag('wolt')).toEqual({ platform: 'wolt' });
    expect(parsePlatformFlag(undefined)).toEqual({});
    expect(() => parsePlatformFlag('doordash')).toThrow(/wolt\|ubereats/);
  });

  it('warns and skips when lieferando is passed', () => {
    const parsed = parsePlatformFlag('lieferando');
    expect(parsed.platform).toBeUndefined();
    expect(parsed.warning).toMatch(/lieferando/i);
    expect(parsed.warning).toMatch(/Cloudflare/);
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
    const fetchMenu = fetcherReturning({ wolt: 3, ubereats: 5 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    const line = formatCascadeLogLine('Doner House', result);
    expect(line).toContain('Doner House');
    expect(line).toContain('tried: wolt (3 items)');
    expect(line).toContain('skipped (cascade): ubereats');
  });

  it('states items per tried platform when the cascade falls through', async () => {
    const fetchMenu = fetcherReturning({ wolt: 0, ubereats: 5 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(formatCascadeLogLine('Doner House', result)).toContain(
      'tried: wolt (0 items), ubereats (5 items)',
    );
  });

  it('includes platforms skipped by the pre-check and errors', async () => {
    const fetchMenu = vi.fn(async (): Promise<FetchedMenu> => {
      throw new Error('blocked');
    });
    const result = await runMenuCascade({ links: [link('ubereats')], fetchMenu });

    const line = formatCascadeLogLine('Doner House', result, ['wolt']);
    expect(line).toContain('ubereats (error: blocked)');
    expect(line).toContain('skipped (already checked): wolt');
  });

  it('explains why Lieferando links are skipped', async () => {
    const fetchMenu = fetcherReturning({ wolt: 3 });
    const result = await runMenuCascade({ links: allLinks(), fetchMenu });

    expect(formatCascadeLogLine('Doner House', result)).toContain(
      'skipped (lieferando: blocked by Cloudflare)',
    );
  });
});
