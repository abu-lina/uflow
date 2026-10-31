import { readdirSync, readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  force?: boolean;
  failLoadMenu?: boolean;
}

async function run(h: Harness = {}) {
  const linkResponses = [...(h.links ?? [[woltLink]])];
  const store: ComplianceStore = {
    listProviders: vi.fn(async () => h.providers ?? [provider()]),
    loadDeliveryLinks: vi.fn(async () =>
      linkResponses.length > 1 ? (linkResponses.shift() as DeliveryLinkRow[]) : linkResponses[0],
    ),
    loadMenuItemNames: vi.fn(async () => {
      if (h.failLoadMenu) throw new Error('db down');
      return h.storedMenuNames ?? [];
    }),
    stageCandidate: vi.fn(async () => ({ outcome: 'staged' as const })),
    markScreened: vi.fn(async () => undefined),
  };
  const screenProvider = vi.fn(async () => (h.place === undefined ? place() : h.place));
  const fetchMenu = vi.fn(async (link: DeliveryLinkRow) => h.menus?.[link.platform] ?? menu());
  const logs: string[] = [];
  const summary = await runHalalCompliance({
    store,
    screenProvider,
    fetchMenu,
    log: (m) => logs.push(m),
    options: { apply: h.apply ?? true, limit: 10, force: h.force ?? false },
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
    const { calls, client } = queryRecorder();

    await createSupabaseStore(client).listProviders({ limit: 3 });

    expect(calls).toContainEqual(['eq', 'review_status', 'pending']);
    expect(calls).toContainEqual(['eq', 'listing_type', 'food']);
  });

  it('--force is off by default and on with the flag', () => {
    expect(parseCliArgs([]).force).toBe(false);
    expect(parseCliArgs(['--apply', '--force']).force).toBe(true);
  });
});

function queryRecorder() {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'or', 'order', 'limit', 'gt', 'update']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
  const from = vi.fn(() => builder);
  return { calls, from, client: { from } as unknown as SupabaseClient };
}

describe('AC834-1: migration adds halal_screened_at to food_providers', () => {
  it('has a migration that adds the nullable timestamptz column', () => {
    const file = readdirSync('supabase/migrations').find((f) => f.includes('issue834'));
    expect(file).toBeDefined();
    const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
    expect(sql).toMatch(
      /ALTER TABLE\s+(public\.)?food_providers\s+ADD COLUMN IF NOT EXISTS\s+halal_screened_at\s+timestamptz/i,
    );
  });
});

describe('AC834-2: pipeline skips providers screened within 90 days', () => {
  afterEach(() => vi.useRealTimers());

  it('the store only lists providers never screened or screened more than 90 days ago', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));
    const { calls, client } = queryRecorder();

    await createSupabaseStore(client).listProviders({ limit: 3 });

    const cutoff = new Date('2026-08-02T12:00:00.000Z').toISOString();
    const or = calls.find((c) => c[0] === 'or');
    expect(or?.[1]).toBe(`halal_screened_at.is.null,halal_screened_at.lt.${cutoff}`);
    expect(or?.[2]).toEqual({ referencedTable: 'food_providers' });
    const select = calls.find((c) => c[0] === 'select');
    expect(select?.[1]).toMatch(/food_providers!inner\(/);
  });
});

describe('AC834-3: --force re-screens regardless of timestamp', () => {
  it('the store applies no screening-age filter when force is set', async () => {
    const { calls, client } = queryRecorder();

    await createSupabaseStore(client).listProviders({ limit: 3, force: true });

    expect(calls.some((c) => c[0] === 'or')).toBe(false);
  });

  it('passes force through to listProviders', async () => {
    const r = await run({ force: true });
    expect(r.store.listProviders).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
  });

  it('still stamps the timestamp after a forced pass', async () => {
    const r = await run({ force: true });
    expect(r.store.markScreened).toHaveBeenCalledWith('p1');
  });
});

describe('AC834-4: halal_screened_at is stamped at the end of each provider pass', () => {
  it('stamps after the full path', async () => {
    const r = await run({ menus: { wolt: menu('Falafel Teller') } });
    expect(r.store.markScreened).toHaveBeenCalledTimes(1);
    expect(r.store.markScreened).toHaveBeenCalledWith('p1');
  });

  it('stamps after the "Serves alcohol" early exit', async () => {
    const r = await run({
      links: [[]],
      place: place({ additionalInfo: { Offerings: [{ 'Serves alcohol': true }] } }),
    });
    expect(r.store.markScreened).toHaveBeenCalledWith('p1');
  });

  it('stamps only after staging finished', async () => {
    const r = await run({ menus: { wolt: menu('Bier') } });
    const staged = (r.store.stageCandidate as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const stamped = (r.store.markScreened as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(stamped).toBeGreaterThan(staged);
  });

  it('does not stamp a provider whose pass crashed, so the next run retries it', async () => {
    const r = await run({ failLoadMenu: true });
    expect(r.summary.failed).toBe(1);
    expect(r.store.markScreened).not.toHaveBeenCalled();
  });

  it('does not stamp in dry-run', async () => {
    const r = await run({ apply: false, menus: { wolt: menu('Falafel Teller') } });
    expect(r.store.markScreened).not.toHaveBeenCalled();
  });

  it('the Supabase store writes halal_screened_at on the provider food_providers row', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T12:00:00.000Z'));
    const { calls, from, client } = queryRecorder();

    await createSupabaseStore(client).markScreened('p1');
    vi.useRealTimers();

    expect(from).toHaveBeenCalledWith('food_providers');
    expect(calls).toContainEqual(['update', { halal_screened_at: '2026-10-31T12:00:00.000Z' }]);
    expect(calls).toContainEqual(['eq', 'provider_id', 'p1']);
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
    'bar category "%s" does not exit early: the menu is always checked',
    async (c) => {
      const r = await run({
        links: [[], [woltLink]],
        place: place({ categoryName: c }),
        menus: { wolt: menu('Falafel Teller') },
      });
      expect(r.fetchMenu).toHaveBeenCalledWith(woltLink);
      expect(r.store.stageCandidate).not.toHaveBeenCalled();
    },
  );

  it('a bar category alone never stages no_alcohol, even when stored menu items are ambiguous', async () => {
    const r = await run({
      links: [[]],
      place: place({ categoryName: 'Bar' }),
      storedMenuNames: ['Apfelsaft'],
    });
    expect(r.store.loadMenuItemNames).toHaveBeenCalled();
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
  });

  it('a bar with an alcohol menu stages no_alcohol=false from the menu', async () => {
    const r = await run({
      links: [[], [woltLink]],
      place: place({ categoryName: 'Pub' }),
      menus: { wolt: menu('Bier', 'Pommes') },
    });
    expect(stagedRows(r.store)).toEqual([
      expect.objectContaining({ field_name: 'no_alcohol', proposed_value: false }),
    ]);
  });

  it('a bar with an explicit alcohol-free menu stages no_alcohol=true: the menu wins', async () => {
    const r = await run({
      links: [[], [woltLink]],
      place: place({ categoryName: 'Cocktail bar' }),
      menus: { wolt: menu('Alkoholfreier Cocktail', 'Limonade') },
    });
    expect(stagedRows(r.store)).toEqual([
      expect.objectContaining({ field_name: 'no_alcohol', proposed_value: true }),
    ]);
  });

  it('logs the bar category as metadata on the signals step', async () => {
    const r = await run({
      links: [[], [woltLink]],
      place: place({ categoryName: 'Bar' }),
      menus: { wolt: menu('Falafel Teller') },
    });
    const line = r.logs.find((l) => l.includes('Tevhid Restaurant')) ?? '';
    expect(line).toMatch(/signals alcohol=no_signal pork=no_signal \(bar category\)/);
  });

  it('does not log a bar category for a non-bar place', async () => {
    const r = await run({
      links: [[], [woltLink]],
      menus: { wolt: menu('Falafel Teller') },
    });
    expect(r.logs.join('\n')).not.toMatch(/bar category/);
  });

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
    const r = await run({
      links: [[]],
      place: place({ additionalInfo: { Offerings: [{ 'Serves alcohol': true }] } }),
    });
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
    const r = await run({
      apply: false,
      links: [[]],
      place: place({ additionalInfo: { Offerings: [{ 'Serves alcohol': true }] } }),
    });
    expect(r.store.stageCandidate).not.toHaveBeenCalled();
  });

  it('tells the screening step it is a dry run', async () => {
    const r = await run({ apply: false, links: [[]] });
    expect(r.screenProvider).toHaveBeenCalledWith(expect.anything(), { apply: false });
  });
});

describe('staging keeps an owner rejection', () => {
  it('counts a rejected candidate as existing and does not insert again', async () => {
    const inSpy = vi.fn().mockReturnThis();
    const insert = vi.fn();
    const chain = {
      eq: vi.fn().mockReturnThis(),
      in: inSpy,
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'r1' }], error: null }),
    };
    const client = {
      from: vi.fn(() => ({ select: vi.fn(() => chain), insert })),
    } as unknown as SupabaseClient;

    const outcome = await createSupabaseStore(client).stageCandidate({
      provider_id: 'p1',
      source: 'halal_compliance',
      field_name: 'no_alcohol',
      enrichment_type: 'data',
    });

    expect(inSpy).toHaveBeenCalledWith('status', expect.arrayContaining(['rejected']));
    expect(outcome).toEqual({ outcome: 'skipped-existing' });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('#838: evidence on staged candidates', () => {
  const byField = (store: ComplianceStore, field: string) =>
    stagedRows(store).find((r) => r.field_name === field) as Record<string, unknown>;

  it('menu-based candidates carry the triggering item names, keywords and platform', async () => {
    const r = await run({
      menus: { wolt: menu('Bier', 'Schweinebraten', 'Falafel') },
      place: null,
    });
    expect(byField(r.store, 'no_alcohol').evidence).toMatchObject({
      matched_keywords: expect.arrayContaining(['Bier']),
      matched_items: ['Bier'],
      source_platform: 'wolt',
    });
    expect(byField(r.store, 'no_pork').evidence).toMatchObject({
      matched_items: ['Schweinebraten'],
      source_platform: 'wolt',
    });
  });

  it('early exit on a Maps alcohol attribute puts the indicator in evidence', async () => {
    const r = await run({
      links: [[], []],
      place: place({
        categoryName: 'Bar',
        additionalInfo: { Offerings: [{ 'Serves alcohol': true }] },
      }),
    });
    expect(stagedRows(r.store)[0].evidence).toMatchObject({
      maps_attributes: ['Serves alcohol'],
      maps_category: 'Bar',
      source_platform: 'google_maps',
    });
  });
});
