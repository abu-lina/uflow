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

async function importAuditScript(): Promise<ReturnType<typeof vi.spyOn>> {
  const staleCloneRows: ProviderRow[] = [
    {
      id: 'stale-1',
      provider_name: 'Triple B Burger Brothers Stuttgart Mitte',
      address_city: 'Stuttgart',
      contact_phone: '+4971112345',
      social_website: 'https://triple-b.de',
      import_source_id: '5990',
      import_source: 'joinhalal',
      import_source_url:
        'https://joinhalal.com/locations/restaurant/triple-b-burger-brothers-stuttgart-mitte-5990/',
      review_status: 'pending',
      user_created_id: null,
    },
    {
      id: 'stale-2',
      provider_name: 'Brand New Restaurant',
      address_city: 'Munich',
      contact_phone: null,
      social_website: null,
      import_source_id: '99999',
      import_source: 'joinhalal',
      import_source_url: null,
      review_status: 'pending',
      user_created_id: null,
    },
  ];

  const legacyRows: ProviderRow[] = [
    {
      id: 'legacy-1',
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
  ];

  const selectEq = vi.fn((field: string, value: string) => {
    if (field === 'import_source' && value === 'joinhalal') {
      return Promise.resolve({ data: staleCloneRows, error: null });
    }
    if (field === 'user_created_id' && value === IMPORT_BOT_UUID) {
      return Promise.resolve({ data: legacyRows, error: null });
    }
    return Promise.resolve({ data: [], error: null });
  });

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: selectEq }),
  });

  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ from, auth: { admin: {} } })),
  }));
  vi.doMock('dotenv', () => ({ config: vi.fn() }));

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.argv = ['node', 'scripts/import-joinhalal.ts', '--audit-stale-clone'];
  globalThis.fetch = vi.fn() as unknown as typeof fetch;

  const exitSpy = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as never);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await import('../../../scripts/import-joinhalal');
  await new Promise((resolve) => setTimeout(resolve, 1800));

  expect(exitSpy).not.toHaveBeenCalled();

  return logSpy;
}

describe('JoinHalal stale-clone audit CLI (Plan 058 Step 6)', () => {
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

  it('produces audit report with overlap classification and recommendation', async () => {
    const logSpy = await importAuditScript();

    const output = logSpy.mock.calls.map(([line]) => String(line)).join('\n');

    // Reports batch sizes
    expect(output).toContain('Stale-clone batch: 2 rows');
    expect(output).toContain('Legacy batch: 1 rows');

    // Reports classification
    expect(output).toContain('Exact duplicates       : 1');
    expect(output).toContain('Unique to stale-clone  : 1');

    // Shows the exact duplicate detail
    expect(output).toContain('stale=stale-1');
    expect(output).toContain('legacy=legacy-1');
    expect(output).toContain('import_source_id=5990');

    // Shows the unique row detail
    expect(output).toContain('Brand New Restaurant');

    // Includes recommendation section
    expect(output).toContain('RECOMMENDATION');
    expect(output).toContain('soft-delete');
  });
});
