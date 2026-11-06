import { describe, expect, it, vi } from 'vitest';

import {
  runHalalCompliance,
  type ApifyPlace,
  type ComplianceProvider,
  type ComplianceStore,
} from '../../scripts/enrich-halal-compliance';

const noopStore = (): ComplianceStore => ({
  listProviders: vi.fn(async () => []),
  loadDeliveryLinks: vi.fn(async () => []),
  loadMenuItemNames: vi.fn(async () => []),
  stageCandidate: vi.fn(async () => ({ outcome: 'staged' as const })),
  markScreened: vi.fn(async () => undefined),
});

describe('#861 runHalalCompliance unit tests', () => {
  it('AC2: force=true is forwarded to store.listProviders', async () => {
    let capturedForce: boolean | undefined;
    const store = noopStore();
    store.listProviders = vi.fn(async (opts) => {
      capturedForce = opts.force;
      return [];
    });

    await runHalalCompliance({
      store,
      screenProvider: vi.fn(),
      fetchMenu: vi.fn(),
      options: { apply: false, limit: 10, force: true },
    });

    expect(capturedForce).toBe(true);
  });

  it('AC3: stageCandidate skipped-existing does not increment summary.staged', async () => {
    const provider: ComplianceProvider = {
      provider_id: '11111111-1111-1111-1111-111111111111',
      provider_name: 'Test Bar',
      no_alcohol: null,
      no_pork: null,
    };
    const alcoholPlace: ApifyPlace = {
      url: 'https://maps.google.com/',
      additionalInfo: { 'Service options': [{ Alcohol: true }] },
    };
    const stageCandidate = vi.fn(async () => ({ outcome: 'skipped-existing' as const }));
    const store: ComplianceStore = {
      listProviders: vi.fn(async () => [provider]),
      loadDeliveryLinks: vi.fn(async () => []),
      loadMenuItemNames: vi.fn(async () => []),
      stageCandidate,
      markScreened: vi.fn(async () => undefined),
    };

    const summary = await runHalalCompliance({
      store,
      screenProvider: vi.fn(async () => alcoholPlace),
      fetchMenu: vi.fn(),
      options: { apply: true, limit: 10, force: false },
    });

    expect(stageCandidate).toHaveBeenCalledOnce();
    expect(summary.staged).toBe(0);
  });
});
