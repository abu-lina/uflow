import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ProviderRow {
  id: string;
  provider_name: string;
  social_website: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
}

interface BackfillHarness {
  update: ReturnType<typeof vi.fn>;
  updateIn: ReturnType<typeof vi.fn>;
  updateEq: ReturnType<typeof vi.fn>;
  fetchMock: ReturnType<typeof vi.fn>;
  logSpy: ReturnType<typeof vi.spyOn>;
}

function makeJoinHalalHtml(badgeText: string): string {
  return `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">
{"@context":"https://schema.org","@graph":[{"@type":"FoodEstablishment","name":"Backfill Test","additionalProperty":[{"@type":"PropertyValue","name":"Halal-Merkmale","value":"Asiatisch"}]}]}
</script>
</head><body>
  <h3 class="elementor-heading-title elementor-size-default">Halal Merkmale</h3>
  <div class="elementor-widget elementor-widget-ts-advanced-list">
    <ul class="flexify simplify-ul ts-advanced-list">
      <li class="flexify ts-action">
        <div class="ts-action-con">
          <div class="ts-action-icon"><i class="lar la-check-circle"></i></div>${badgeText}
        </div>
      </li>
    </ul>
  </div>
</body></html>`;
}

async function importBackfillScript(args: string[]): Promise<BackfillHarness> {
  const providers: ProviderRow[] = [
    {
      id: 'pending-positive',
      provider_name: 'Pending Positive',
      social_website: 'https://joinhalal.com/locations/restaurant/pending-positive/',
      review_status: 'pending',
    },
    {
      id: 'approved-positive',
      provider_name: 'Approved Positive',
      social_website: 'https://joinhalal.com/locations/restaurant/approved-positive/',
      review_status: 'approved',
    },
    {
      id: 'pending-no-url',
      provider_name: 'Pending No URL',
      social_website: null,
      review_status: 'pending',
    },
  ];

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateIn = vi.fn().mockReturnValue({ eq: updateEq });
  const update = vi.fn().mockReturnValue({ in: updateIn });
  const selectEq = vi.fn().mockResolvedValue({ data: providers, error: null });

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: selectEq }),
    update,
  });

  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    text: async () => {
      if (url.includes('pending-positive')) {
        return makeJoinHalalHtml('Alkoholverkauf');
      }
      return makeJoinHalalHtml('Kein Alkoholverkauf');
    },
  }));

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ from, auth: { admin: {} } })),
  }));
  vi.doMock('dotenv', () => ({ config: vi.fn() }));

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.argv = ['node', 'scripts/import-joinhalal.ts', ...args];

  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const exitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as never);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await import('../../../scripts/import-joinhalal');

  // The script invokes main() at module scope; give the async backfill path time to finish.
  await new Promise((resolve) => setTimeout(resolve, 350));

  expect(exitSpy).not.toHaveBeenCalled();

  return { update, updateIn, updateEq, fetchMock, logSpy };
}

describe('JoinHalal backfill CLI (Plan 057)', () => {
  const originalArgv = [...process.argv];
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.argv = [...originalArgv];

    if (originalSupabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    }

    if (originalServiceRoleKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    }

    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }

    vi.restoreAllMocks();
    vi.unmock('@supabase/supabase-js');
    vi.unmock('dotenv');
  });

  it('dry-run reports candidates without issuing updates and skips already reviewed providers', async () => {
    const harness = await importBackfillScript(['--backfill-alcohol', '--dry-run']);

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://joinhalal.com/locations/restaurant/pending-positive/',
      expect.any(Object)
    );
    expect(harness.update).not.toHaveBeenCalled();

    const output = harness.logSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain('Would reject          : 1');
    expect(output).toContain('Skipped (reviewed)    : 1');
    expect(output).toContain('No URL (skipped)      : 1');
  });

  it('write mode updates only pending matches and keeps the pending guard on the update query', async () => {
    const harness = await importBackfillScript(['--backfill-alcohol', '--write']);

    expect(harness.fetchMock).toHaveBeenCalledTimes(1);
    expect(harness.update).toHaveBeenCalledWith({ review_status: 'rejected' });
    expect(harness.updateIn).toHaveBeenCalledWith('id', ['pending-positive']);
    expect(harness.updateEq).toHaveBeenCalledWith('review_status', 'pending');

    const output = harness.logSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain("Updated 1 providers to rejected.");
  });
});