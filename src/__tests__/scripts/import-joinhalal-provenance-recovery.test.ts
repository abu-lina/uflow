import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ProviderRow {
  id: string;
  provider_name: string;
  address_city: string | null;
  contact_phone: string | null;
  social_website: string | null;
  import_source_id: string | null;
  import_source?: string | null;
  import_source_url?: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  user_created_id?: string | null;
}

const IMPORT_BOT_UUID = '00000000-0000-0000-0000-000047000001';
const MATCH_URL =
  'https://joinhalal.com/locations/restaurant/triple-b-burger-brothers-stuttgart-mitte-5990/';

interface ProvenanceHarness {
  update: ReturnType<typeof vi.fn>;
  updateIdEq: ReturnType<typeof vi.fn>;
  updateReviewEq: ReturnType<typeof vi.fn>;
  fetchMock: ReturnType<typeof vi.fn>;
  logSpy: ReturnType<typeof vi.spyOn>;
}

function makeSitemapXml(urls: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
  ].join('\n');
}

function makeJoinHalalDetailHtml(): string {
  return `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">
{"@context":"https://schema.org","@graph":[{"@type":"FoodEstablishment","name":"Triple B Burger Brothers Stuttgart Mitte in Stuttgart - joinhalal | Finde Halal Spots","address":{"streetAddress":"Königstraße 1, 70173 Stuttgart, Deutschland"},"telephone":"+4971112345","url":"https://triple-b.de"}]}
</script>
<script type="application/json" class="vxconfig">{"current_post":{"display_name":"Triple B Burger Brothers Stuttgart Mitte","id":5990}}</script>
</head><body></body></html>`;
}

async function importProvenanceScript(args: string[]): Promise<ProvenanceHarness> {
  const modernProviders: ProviderRow[] = [
    {
      id: 'modern-existing',
      provider_name: 'Already Linked',
      address_city: 'Berlin',
      contact_phone: null,
      social_website: 'https://example.com',
      import_source_id: '1111',
      import_source: 'joinhalal',
      import_source_url: 'https://joinhalal.com/locations/restaurant/already-linked-1111/',
      review_status: 'pending',
      user_created_id: IMPORT_BOT_UUID,
    },
  ];

  const legacyProviders: ProviderRow[] = [
    {
      id: 'legacy-pending',
      provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
      address_city: 'Stuttgart',
      contact_phone: '+4971112345',
      social_website: 'https://triple-b.de',
      import_source_id: '5990',
      import_source: null,
      import_source_url: null,
      review_status: 'pending',
      user_created_id: IMPORT_BOT_UUID,
    },
    {
      id: 'legacy-approved',
      provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
      address_city: 'Stuttgart',
      contact_phone: '+4971112345',
      social_website: 'https://triple-b.de',
      import_source_id: '5990',
      import_source: null,
      import_source_url: null,
      review_status: 'approved',
      user_created_id: IMPORT_BOT_UUID,
    },
  ];

  const updateReviewEq = vi.fn().mockResolvedValue({ error: null });
  const updateIdEq = vi.fn().mockReturnValue({ eq: updateReviewEq });
  const update = vi.fn().mockReturnValue({ eq: updateIdEq });
  const selectEq = vi.fn((field: string, value: string) => {
    if (field === 'import_source' && value === 'joinhalal') {
      return Promise.resolve({ data: modernProviders, error: null });
    }

    if (field === 'user_created_id' && value === IMPORT_BOT_UUID) {
      return Promise.resolve({ data: legacyProviders, error: null });
    }

    return Promise.resolve({ data: [], error: null });
  });

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: selectEq }),
    update,
  });

  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('locations-sitemap1.xml')) {
      return {
        ok: true,
        status: 200,
        text: async () => makeSitemapXml([MATCH_URL]),
      };
    }

    if (/locations-sitemap[2-5]\.xml$/.test(url)) {
      return {
        ok: true,
        status: 200,
        text: async () => makeSitemapXml([]),
      };
    }

    if (url === MATCH_URL) {
      return {
        ok: true,
        status: 200,
        text: async () => makeJoinHalalDetailHtml(),
      };
    }

    return {
      ok: false,
      status: 404,
      text: async () => '',
    };
  });

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
  await new Promise((resolve) => setTimeout(resolve, 1800));

  expect(exitSpy).not.toHaveBeenCalled();

  return { update, updateIdEq, updateReviewEq, fetchMock, logSpy };
}

describe('JoinHalal provenance recovery CLI (Plan 058)', () => {
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

  it('dry-run reports matched and skipped-reviewed rows without issuing updates', async () => {
    const harness = await importProvenanceScript(['--recover-provenance', '--dry-run']);

    expect(harness.fetchMock).toHaveBeenCalledWith(
      'https://joinhalal.com/locations-sitemap1.xml',
      expect.any(Object)
    );
    expect(harness.fetchMock).toHaveBeenCalledWith(MATCH_URL, expect.any(Object));
    expect(harness.update).not.toHaveBeenCalled();

    const output = harness.logSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain('Already have import_source_url: 1');
    expect(output).toContain('Need provenance recovery: 2');
    expect(output).toContain('Matched (single candidate) : 1');
    expect(output).toContain('Skipped (already reviewed)  : 1');
    expect(output).toContain('DRY-RUN complete. No changes written.');
  });

  it('write mode persists matched provenance and keeps the pending-row guard', async () => {
    const harness = await importProvenanceScript(['--recover-provenance', '--write']);

    expect(harness.update).toHaveBeenCalledWith({
      import_source_url: MATCH_URL,
      import_source: 'joinhalal',
      import_source_id: '5990',
    });
    expect(harness.updateIdEq).toHaveBeenCalledWith('id', 'legacy-pending');
    expect(harness.updateReviewEq).toHaveBeenCalledWith('review_status', 'pending');

    const output = harness.logSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain('Persisting provenance for 1 matched providers...');
    expect(output).toContain('Successfully persisted : 1');
    expect(output).toContain('Failed                 : 0');
  });
});