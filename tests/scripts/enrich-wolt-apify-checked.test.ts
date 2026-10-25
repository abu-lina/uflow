import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const fetchWoltRestaurant = vi.fn();

vi.mock('../../src/lib/enrichment/delivery-platform/apify-wolt-client', () => ({
  fetchWoltRestaurant: (...a: unknown[]) => fetchWoltRestaurant(...a),
}));
vi.mock('../../src/lib/enrichment/delivery-platform/lieferando-client', () => ({
  createLieferandoClient: vi.fn(),
}));
vi.mock('../../src/lib/enrichment/delivery-platform/ubereats-client', () => ({
  createUberEatsClient: vi.fn(),
}));

interface Update {
  table: string;
  values: Record<string, unknown>;
  filters: Record<string, unknown>;
}

let updates: Update[] = [];
let linkRows: Record<string, unknown>[] = [];
let rpcError: { message: string } | null = null;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => ({ error: rpcError }),
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      let current: Update | null = null;
      for (const m of ['select', 'in', 'limit', 'order', 'insert']) b[m] = () => b;
      b.eq = (col: string, val: unknown) => {
        if (current) current.filters[col] = val;
        return b;
      };
      b.update = (values: Record<string, unknown>) => {
        current = { table, values, filters: {} };
        updates.push(current);
        return b;
      };
      b.single = async () => ({
        data: {
          contact_phone: 'x',
          social_website: 'y',
          location_id: 1,
          address_street: 'a',
          address_zip: 'b',
          address_city: 'c',
        },
        error: null,
      });
      b.then = (res: (v: unknown) => unknown) => {
        const data =
          table === 'provider_delivery_links'
            ? linkRows
            : table === 'providers'
              ? [{ provider_id: 'p1', opening_hours: null }]
              : [];
        return Promise.resolve({ data, count: 0, error: null }).then(res);
      };
      return b;
    },
  }),
}));

const woltRow = (checked: string | null) => ({
  provider_id: 'p1',
  platform: 'wolt',
  platform_url: 'https://wolt.com/de/deu/berlin/venue/x',
  platform_slug: 'x',
  apify_checked_at: checked,
  providers: { provider_name: 'X', listing_type: 'food' },
});

const result = { menuItems: [], openingHours: null };

async function runMenus(flags: string[] = []): Promise<void> {
  process.argv = ['node', 'enrich-delivery-menus.ts', ...flags];
  const logs: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
  vi.resetModules();
  await import('../../scripts/enrich-delivery-menus');
  await vi.waitFor(() => expect(logs.some((l) => l.includes('Summary'))).toBe(true));
}

const checkedUpdates = () => updates.filter((u) => 'apify_checked_at' in u.values);

beforeEach(() => {
  updates = [];
  rpcError = null;
  fetchWoltRestaurant.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.APIFY_API_TOKEN = 'token';
});

afterEach(() => vi.restoreAllMocks());

describe('enrich-delivery-menus apify_checked_at (#754)', () => {
  it('skips a Wolt link with apify_checked_at set (no Apify call)', async () => {
    linkRows = [woltRow('2026-01-01T00:00:00Z')];
    await runMenus();
    expect(fetchWoltRestaurant).not.toHaveBeenCalled();
  });

  it('fetches a Wolt link with apify_checked_at null', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockResolvedValue(result);
    await runMenus();
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
  });

  it('sets apify_checked_at after the Apify call', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockResolvedValue(result);
    await runMenus();
    expect(checkedUpdates()).toHaveLength(1);
    expect(checkedUpdates()[0].filters).toEqual({ provider_id: 'p1', platform: 'wolt' });
  });

  it('sets apify_checked_at only after the menu write, and not when the write fails', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockResolvedValue({ menuItems: [{ name_de: 'a' }], openingHours: null });
    rpcError = { message: 'rpc down' };
    await runMenus();
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
    expect(checkedUpdates()).toHaveLength(0);
  });

  it('sets apify_checked_at when the restaurant is not found on Wolt', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockResolvedValue(null);
    await runMenus();
    expect(checkedUpdates()).toHaveLength(1);
  });

  it('leaves apify_checked_at null when the Apify call throws', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockRejectedValue(new Error('boom'));
    await runMenus();
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
    expect(checkedUpdates()).toHaveLength(0);
  });

  it('--force fetches regardless of apify_checked_at', async () => {
    linkRows = [woltRow('2026-01-01T00:00:00Z')];
    fetchWoltRestaurant.mockResolvedValue(result);
    await runMenus(['--force']);
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
  });

  it('--provider-id fetches regardless of apify_checked_at', async () => {
    linkRows = [woltRow('2026-01-01T00:00:00Z')];
    fetchWoltRestaurant.mockResolvedValue(result);
    await runMenus(['--provider-id', 'p1']);
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
  });

  it('--dry-run does not set apify_checked_at', async () => {
    linkRows = [woltRow(null)];
    fetchWoltRestaurant.mockResolvedValue(result);
    await runMenus(['--dry-run']);
    expect(fetchWoltRestaurant).toHaveBeenCalledTimes(1);
    expect(checkedUpdates()).toHaveLength(0);
  });
});

describe('enrich-one-wolt apify_checked_at (#754)', () => {
  it('sets apify_checked_at on success', async () => {
    fetchWoltRestaurant.mockResolvedValue({ menuItems: [{ name_de: 'a' }], openingHours: null });
    process.argv = ['node', 'enrich-one-wolt.ts', 'p1', 'https://wolt.com/x'];
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...a) => void logs.push(a.join(' ')));
    vi.resetModules();
    await import('../../scripts/enrich-one-wolt');
    await vi.waitFor(() => expect(logs.some((l) => l.includes('Done'))).toBe(true));
    expect(checkedUpdates()).toHaveLength(1);
  });
});

describe('migration for apify_checked_at (#754)', () => {
  const dir = path.resolve(__dirname, '../../supabase/migrations');
  const file = readdirSync(dir).find((f) => f.startsWith('143_'));

  it('adds the column with IF NOT EXISTS and backfills Wolt links with priced menus', () => {
    expect(file).toBeDefined();
    const sql = readFileSync(path.join(dir, file!), 'utf8').toLowerCase();
    expect(sql).toMatch(/add column if not exists apify_checked_at timestamptz/);
    expect(sql).toMatch(/update\s+(public\.)?provider_delivery_links/);
    expect(sql).toContain("platform = 'wolt'");
    expect(sql).toContain('food_menu');
    expect(sql).toContain('price_cents is not null');
  });
});
