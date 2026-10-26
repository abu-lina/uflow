import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import { approveCandidate, bulkApproveByProvider } from '@/services/admin/enrichment';
import { isAdminField } from '@/lib/enrichment/enrichment-fields';

const WOLT = {
  platform: 'wolt',
  platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
  platform_slug: 'tevhid',
  is_active: true,
};
const LIEFERANDO = {
  platform: 'lieferando',
  platform_url: 'https://www.lieferando.de/speisekarte/tevhid',
  platform_slug: 'tevhid',
  is_active: true,
};

function candidate(proposed: unknown[] = [WOLT]) {
  return {
    id: 'cand-1',
    provider_id: 'prov-1',
    field_name: 'delivery_links',
    proposed_value: proposed,
    current_value: null,
    status: 'pending',
    source: 'provider_website:wolt',
    source_url: 'https://tevhid.example/',
    enrichment_type: 'data',
  };
}

function setup(existingLinks: unknown[], proposed: unknown[] = [WOLT]) {
  const candidateUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const candidates = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: candidate(proposed), error: null }),
    update: candidateUpdate,
  };
  const providers = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { provider_owner_id: null }, error: null }),
    update: vi.fn(),
  };
  const links = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: existingLinks, error: null }),
  };
  mockFrom.mockImplementation((table: string) => {
    if (table === 'enrichment_candidates') return candidates;
    if (table === 'providers') return providers;
    if (table === 'provider_delivery_links') return links;
    throw new Error(`unexpected table ${table}`);
  });
  mockRpc.mockResolvedValue({ data: {}, error: null });
  return { candidateUpdate, providers };
}

describe('#801 approving a delivery candidate adds it without removing existing links', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends existing links plus the new one to admin_update_provider', async () => {
    const { candidateUpdate } = setup([LIEFERANDO]);
    const result = await approveCandidate('cand-1', 'admin-1');

    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [fn, args] = mockRpc.mock.calls[0];
    expect(fn).toBe('admin_update_provider');
    expect(args.p_provider_id).toBe('prov-1');
    expect(args.p_data.delivery_links).toEqual([LIEFERANDO, WOLT]);
    expect(candidateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'applied', reviewer_id: 'admin-1' }),
    );
  });

  it('keeps inactive existing links and their fields intact', async () => {
    const inactive = { ...LIEFERANDO, is_active: false, platform_slug: null };
    setup([inactive]);
    await approveCandidate('cand-1', 'admin-1');
    expect(mockRpc.mock.calls[0][1].p_data.delivery_links).toEqual([inactive, WOLT]);
  });

  it('works for a provider without any links', async () => {
    setup([]);
    await approveCandidate('cand-1', 'admin-1');
    expect(mockRpc.mock.calls[0][1].p_data.delivery_links).toEqual([WOLT]);
  });

  it('never overwrites an existing link for the same platform and leaves the candidate pending', async () => {
    const { candidateUpdate } = setup([
      { ...WOLT, platform_url: 'https://wolt.com/de/deu/berlin/restaurant/other' },
    ]);
    const result = await approveCandidate('cand-1', 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/wolt/i);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(candidateUpdate).not.toHaveBeenCalled();
  });

  it('does not mark the candidate applied when the RPC fails', async () => {
    const { candidateUpdate } = setup([]);
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    const result = await approveCandidate('cand-1', 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('rpc down');
    expect(candidateUpdate).not.toHaveBeenCalled();
  });

  it('does not write delivery_links into the providers table', async () => {
    const { providers } = setup([]);
    await approveCandidate('cand-1', 'admin-1');
    expect(providers.update).not.toHaveBeenCalled();
  });

  it('is treated as a source-enrichable field, so bulk approval does not skip it', () => {
    expect(isAdminField('delivery_links')).toBe(false);
  });
});

describe('#801 bulk approval applies delivery candidates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves a delivery candidate instead of skipping it as admin-controlled', async () => {
    const candidateUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const pending = { id: 'cand-1', field_name: 'delivery_links' };
    const candidates = {
      select: vi.fn().mockReturnThis(),
      eq: vi
        .fn()
        .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: [pending], error: null }) })
        .mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: candidate(), error: null }),
      update: candidateUpdate,
    };
    const providers = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { provider_owner_id: null }, error: null }),
    };
    const links = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockImplementation((table: string) =>
      table === 'enrichment_candidates' ? candidates : table === 'providers' ? providers : links,
    );
    mockRpc.mockResolvedValue({ data: {}, error: null });

    const result = await bulkApproveByProvider('prov-1', 'admin-1');
    expect(result).toMatchObject({ approved: 1, skipped: 0 });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});
