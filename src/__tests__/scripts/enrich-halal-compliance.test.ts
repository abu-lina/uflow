import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseStore,
  parseCliArgs,
  runHalalCompliance,
  type ApifyPlace,
  type ComplianceProvider,
  type ComplianceStore,
  type DeliveryLinkRow,
} from '../../../scripts/enrich-halal-compliance';

const provider = (over: Partial<ComplianceProvider> = {}): ComplianceProvider => ({
  provider_id: 'p1',
  provider_name: 'Tevhid Restaurant',
  no_alcohol: null,
  no_pork: null,
  ...over,
});

const woltLink: DeliveryLinkRow = {
  provider_id: 'p1',
  provider_name: 'Tevhid Restaurant',
  platform: 'wolt',
  platform_url: 'https://wolt.com/de/deu/stuttgart/restaurant/tevhid',
  platform_slug: 'tevhid',
  apify_checked_at: null,
};

const menu = (...names: string[]) => ({
  menuItems: names.map((name_de, i) => ({
    name_de,
    description_de: null,
    category: null,
    price_cents: null,
    is_available: true,
    sort_order: i,
  })),
});

const place = (over: Partial<ApifyPlace> = {}): ApifyPlace => ({
  title: 'Tevhid Restaurant',
  categoryName: 'Restaurant',
  additionalInfo: {},
  ...over,
});

interface Harness {
  providers?: ComplianceProvider[];
  links?: DeliveryLinkRow[][];
  storedMenuNames?: string[];
  place?: ApifyPlace | null;
  menus?: Record<string, ReturnType<typeof menu>>;
  apply?: boolean;
}

async function run(h: Harness = {}) {
  const linkResponses = [...(h.links ?? [[woltLink]])];
  const store: ComplianceStore = {
    listProviders: vi.fn(async () => h.providers ?? [provider()]),
    loadDeliveryLinks: vi.fn(async () =>
      linkResponses.length > 1 ? (linkResponses.shift() as DeliveryLinkRow[]) : linkResponses[0],
    ),
    loadMenuItemNames: vi.fn(async () => h.storedMenuNames ?? []),
    stageCandidate: vi.fn(async () => ({ outcome: 'staged' as const })),
  };
  const screenProvider = vi.fn(async () => (h.place === undefined ? place() : h.place));
  const fetchMenu = vi.fn(async (link: DeliveryLinkRow) => h.menus?.[link.platform] ?? menu());
  const logs: string[] = [];
  const summary = await runHalalCompliance({
    store,
    screenProvider,
    fetchMenu,
    log: (m) => logs.push(m),
    options: { apply: h.apply ?? true, limit: 10 },
  });
  return { store, screenProvider, fetchMenu, logs, summary };
}

const stagedRows = (store: ComplianceStore) =>
  (store.stageCandidate as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => c[0] as Record<string, unknown>,
  );

describe('AC1: CLI flags and provider selection', () => {
  it('defaults to dry-run', () => {
    expect(parseCliArgs([]).apply).toBe(false);
    expect(parseCliArgs(['--dry-run']).apply).toBe(false);
  });

  it('--apply turns writing on', () => {
    expect(parseCliArgs(['--apply']).apply).toBe(true);
  });

  it('rejects --apply together with --dry-run', () => {
    expect(() => parseCliArgs(['--apply', '--dry-run'])).toThrow();
  });

  it('accepts --provider-id <uuid> and rejects anything else', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseCliArgs(['--provider-id', id]).providerId).toBe(id);
    expect(() => parseCliArgs(['--provider-id', 'nope'])).toThrow();
  });

  it('accepts --limit <n> and rejects non-positive integers', () => {
    expect(parseCliArgs(['--limit', '5']).limit).toBe(5);
    expect(() => parseCliArgs(['--limit', '0'])).toThrow();
    expect(() => parseCliArgs(['--limit', 'abc'])).toThrow();
  });

  it('the Supabase store lists approved food providers only', async () => {
    const calls: Array<[string, ...unknown[]]> = [];
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'gt']) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;

    await createSupabaseStore(client).listProviders({ limit: 3 });

    expect(calls).toContainEqual(['eq', 'review_status', 'approved']);
    expect(calls).toContainEqual(['eq', 'listing_type', 'food']);
  });
});

describe('AC2: Google Maps screening runs only when delivery links are missing', () => {
  it('calls the screening function when the provider has no delivery links', async () => {
    const r = await run({ links: [[]] });
    expect(r.screenProvider).toHaveBeenCalledTimes(1);
  });

  it('skips the Google Maps call when delivery links already exist', async () => {
    const r = await run({ links: [[woltLink]] });
    expect(r.screenProvider).not.toHaveBeenCalled();
  });

  it('reloads links after screening and uses them for the menu fetch', async () => {
    const r = await run({ links: [[], [woltLink]], menus: { wolt: menu('Falafel Teller') } });
    expect(r.fetchMenu).toHaveBeenCalledWith(woltLink);
  });
});

describe('AC3: menu names come from the stored delivery links', () => {
  it('fetches the menu through the platform client for the provider link', async () => {
    const r = await run({ menus: { wolt: menu('Falafel Teller') } });
    expect(r.fetchMenu).toHaveBeenCalledWith(woltLink);
  });

  it('uses food_menu rows already written and does not fetch again', async () => {
    const r = await run({ storedMenuNames: ['Falafel Teller'] });
    expect(r.fetchMenu).not.toHaveBeenCalled();
  });
});

describe('AC4: early exit on a definite Google Maps alcohol indicator', () => {
  it('stages no_alcohol=false and skips the menu fetch for "Serves alcohol"', async () => {
    const r = await run({
      links: [[]],
      place: place({ additionalInfo: { Offerings: [{ 'Serves alcohol': true }] } }),
    });
    expect(r.fetchMenu).not.toHaveBeenCalled();
    expect(r.store.loadMenuItemNames).not.toHaveBeenCalled();
    expect(stagedRows(r.store)).toEqual([
      expect.objectContaining({
        provider_id: 'p1',
        field_name: 'no_alcohol',
        proposed_value: false,
        status: 'pending',
      }),
    ]);
  });

  it.each(['Bar', 'Pub', 'Cocktail bar'])(
    'stages no_alcohol=false for category "%s"',
    async (c) => {
      const r = await run({ links: [[]], place: place({ categoryName: c }) });
      expect(r.fetchMenu).not.toHaveBeenCalled();
      expect(stagedRows(r.store).map((row) => row.field_name)).toEqual(['no_alcohol']);
      expect(stagedRows(r.store)[0].proposed_value).toBe(false);
    },
  );

  it('does not exit early for an explicit "Serves alcohol: false"', async () => {
    const r = await run({
      links: [[], [woltLink]],
      place: place({ additionalInfo: { Offerings: [{ 'Serves alcohol': false }] } }),
    });
    expect(r.fetchMenu).toHaveBeenCalled();
  });
});

describe('AC5 and AC6: full path detects on menu text and stages candidates', () => {
  it('runs screening, menu fetch, then alcohol and pork detection', async () => {
    const r = await run({
      links: [[], [woltLink]],
      menus: { wolt: menu('Bier', 'Schweinebraten', 'Falafel') },
    });
    expect(r.screenProvider).toHaveBeenCalledTimes(1);
    expect(r.fetchMenu).toHaveBeenCalledTimes(1);
    const rows = stagedRows(r.store);
    expect(rows).toContainEqual(
      expect.objectContaining({ field_name: 'no_alcohol', proposed_value: false }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({ field_name: 'no_pork', proposed_value: false }),
    );
  });

  it('stages pending candidates only and never applies a provider field', async () => {
    const r = await run({ menus: { wolt: menu('Bier', 'Speck') } });
    for (const row of stagedRows(r.store)) {
      expect(row.status).toBe('pending');
      expect(row.enrichment_type).toBe('data');
    }
    expect(Object.keys(r.store)).not.toContain('applyFields');
  });

  it('stages nothing when the menu has no signal', async () => {
    const r = await run({ menus: { wolt: menu('Falafel Teller', 'Hummus') } });
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
  });

  it('does not stage a value the provider already holds', async () => {
    const r = await run({
      providers: [provider({ no_alcohol: false })],
      menus: { wolt: menu('Bier') },
    });
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
  });

  it('stages no_alcohol=true only for an explicit alcohol-free signal', async () => {
    const r = await run({ menus: { wolt: menu('Alkoholfreies Bier', 'Falafel') } });
    expect(stagedRows(r.store)).toEqual([
      expect.objectContaining({ field_name: 'no_alcohol', proposed_value: true }),
    ]);
  });
});

describe('AC7: one summary line per provider', () => {
  it('names the steps that ran, the signals and what was staged', async () => {
    const r = await run({ links: [[], [woltLink]], menus: { wolt: menu('Bier', 'Speck') } });
    const lines = r.logs.filter((l) => l.includes('Tevhid Restaurant'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/maps/);
    expect(lines[0]).toMatch(/menu/);
    expect(lines[0]).toMatch(/definite_alcohol/);
    expect(lines[0]).toMatch(/definite_pork/);
    expect(lines[0]).toMatch(/STAGE.*no_alcohol/);
    expect(lines[0]).toMatch(/STAGE.*no_pork/);
  });

  it('says the menu was skipped on the early-exit path', async () => {
    const r = await run({ links: [[]], place: place({ categoryName: 'Pub' }) });
    const lines = r.logs.filter((l) => l.includes('Tevhid Restaurant'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/menu skipped/);
  });
});

describe('AC8: dry-run writes nothing', () => {
  it('never stages a candidate in dry-run, on the full path', async () => {
    const r = await run({ apply: false, menus: { wolt: menu('Bier', 'Speck') } });
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
    expect(r.logs.join('\n')).toMatch(/WOULD STAGE.*no_alcohol/);
  });

  it('never stages a candidate in dry-run, on the early-exit path', async () => {
    const r = await run({ apply: false, links: [[]], place: place({ categoryName: 'Bar' }) });
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
  });

  it('tells the screening step it is a dry run', async () => {
    const r = await run({ apply: false, links: [[]] });
    expect(r.screenProvider).toHaveBeenCalledWith(expect.anything(), { apply: false });
  });
});
