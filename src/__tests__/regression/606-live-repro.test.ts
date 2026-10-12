// @vitest-environment node
/**
 * #606 — live end-to-end repro of the production 500.
 *
 * The mocked regression suite (606-provider-submit.test.ts) pins the
 * contract; this harness exercises the real path — real categories table,
 * real `cities` closed list, real providers insert — against a live
 * Supabase project. It is the repro the issue asked for: before the fix,
 * `createProviderOrServiceServer` threw a bare error for every category
 * whose `applicable_section` is 'all', which the route surfaced as a
 * generic 500.
 *
 * Gated on dedicated env vars the global test setup never touches:
 *   UFLOW_LIVE_DB_URL      — a real Supabase URL (local `supabase start`
 *                            or an explicitly trusted remote)
 *   UFLOW_LIVE_SERVICE_KEY — the matching service-role key
 *   UFLOW_LIVE_ALLOW_REMOTE=1 — extra opt-in required before the key is
 *                            ever sent to a non-loopback host
 * It never reads NEXT_PUBLIC_SUPABASE_URL: setup.ts overwrites that with a
 * mock host, and sending a service key to a URL the developer did not set
 * is a credential leak. The key reaches the probe child process via env,
 * never argv (ps-visible). In CI none of this is set, so the suite reports
 * its skip loudly instead of reading as silent green.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.UFLOW_LIVE_DB_URL;
const SERVICE_KEY = process.env.UFLOW_LIVE_SERVICE_KEY;

/** The service key may only leave this process for a loopback Supabase
 * (`supabase start`), or a remote host the developer explicitly opted into
 * via UFLOW_LIVE_ALLOW_REMOTE=1. Anything else → skip, no keyed request. */
function liveHostAllowed(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.startsWith('127.')
  ) {
    return true;
  }
  return process.env.UFLOW_LIVE_ALLOW_REMOTE === '1';
}

const HOST_ALLOWED = Boolean(SUPABASE_URL && SERVICE_KEY && liveHostAllowed(SUPABASE_URL));

// Sync REST probe — top-level await isn't available under this tsconfig.
// URL and key go through env so neither lands in the child's argv.
const REST_UP = HOST_ALLOWED
  ? spawnSync(
      process.execPath,
      [
        '-e',
        `fetch(process.env.UFLOW_PROBE_URL+'/rest/v1/providers?select=provider_id&limit=0',{headers:{apikey:process.env.UFLOW_PROBE_KEY}}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))`,
      ],
      {
        encoding: 'utf8',
        timeout: 5000,
        env: {
          ...process.env,
          UFLOW_PROBE_URL: SUPABASE_URL!,
          UFLOW_PROBE_KEY: SERVICE_KEY!,
        },
      },
    ).status === 0
  : false;

const LIVE = Boolean(HOST_ALLOWED && REST_UP);

it.runIf(!LIVE)(
  'LIVE 606 REPRO SKIPPED — no Supabase env/reachable stack, the end-to-end submission did not run',
  () => {
    console.warn(
      '[606-live-repro] UFLOW_LIVE_DB_URL / UFLOW_LIVE_SERVICE_KEY missing, ' +
        'the URL is not loopback (set UFLOW_LIVE_ALLOW_REMOTE=1 for a trusted ' +
        'remote), or PostgREST is unreachable; the live submission harness ' +
        'did not run.',
    );
  },
);

describe.skipIf(!LIVE)('#606 live repro — real Supabase submission path', () => {
  let admin: SupabaseClient;
  const createdProviderIds: string[] = [];
  const runId = `606repro-${Date.now()}`;

  function adminClient(): SupabaseClient {
    if (!admin) {
      admin = createClient(SUPABASE_URL!, SERVICE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return admin;
  }

  async function closedListCity(): Promise<string> {
    const { data, error } = await adminClient().from('cities').select('city_name').limit(1);
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('cities table is empty — migration 140 not applied');
    return data[0].city_name;
  }

  function payload(over: Record<string, unknown> = {}) {
    return {
      formData: {
        creationMode: 'recommendation' as const,
        entityType: 'provider' as const,
        title: `Repro ${runId}`,
        category: '',
        description: 'live repro',
        isOnlineBusiness: false,
        street: '',
        zip: '',
        city: '',
        country: 'DE',
        latitude: null,
        longitude: null,
        showAddress: true,
        website: '',
        instagram: '',
        phone: '',
        email: '',
        offers_ids: [],
        needs_ids: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
        no_alcohol: true,
        no_pork: true,
        no_gambling: true,
        verification_method: 'online' as const,
        has_certificate: false,
        certificate_url: '',
        submissionSource: 'recommend' as const,
        ...over,
      },
      actor: { userId: '606-live-repro', isOwner: false },
    };
  }

  afterAll(async () => {
    // Clean up every provider the harness managed to insert.
    for (const id of createdProviderIds) {
      await adminClient().from('locations').delete().eq('provider_id', id);
      await adminClient().from('providers').delete().eq('provider_id', id);
    }
  });

  it('every live applicable_section="all" category submits instead of 500ing', async () => {
    const { createProviderOrServiceServer } = await import(
      '@/features/providers/services/create-provider.server'
    );
    const { data: allCategories, error } = await adminClient()
      .from('categories')
      .select('category_id, name_en, applicable_section')
      .eq('applicable_section', 'all');
    if (error) throw error;
    expect(allCategories!.length).toBeGreaterThan(0);

    const city = await closedListCity();
    for (const category of allCategories!) {
      const result = await createProviderOrServiceServer(
        payload({
          category: category.category_id,
          city,
          title: `Repro ${runId} ${category.category_id.slice(0, 8)}`,
        }) as never,
      );
      expect(result.provider_id).toBeTruthy();
      createdProviderIds.push(result.provider_id!);

      const { data: row } = await adminClient()
        .from('providers')
        .select('listing_type')
        .eq('provider_id', result.provider_id)
        .single();
      expect(['food', 'store', 'ummah']).toContain(row!.listing_type);
    }
  }, 60_000);

  it('a recommend city outside the closed list fails coded, not 500', async () => {
    const { createProviderOrServiceServer, ProviderSubmitError } = await import(
      '@/features/providers/services/create-provider.server'
    );
    const { data: cat } = await adminClient()
      .from('categories')
      .select('category_id')
      .limit(1)
      .single();

    await expect(
      createProviderOrServiceServer(
        payload({ category: cat!.category_id, city: `Atlantis-${runId}` }) as never,
      ),
    ).rejects.toMatchObject({
      name: 'ProviderSubmitError',
      code: 'CITY_NOT_SUPPORTED',
    });
    void ProviderSubmitError;
  }, 30_000);

  it('the same normalised name+city twice is a coded duplicate, not a 500', async () => {
    const { createProviderOrServiceServer } = await import(
      '@/features/providers/services/create-provider.server'
    );
    const { data: cat } = await adminClient()
      .from('categories')
      .select('category_id, applicable_section')
      .neq('applicable_section', 'ummah')
      .limit(1)
      .single();
    const city = await closedListCity();
    const first = await createProviderOrServiceServer(
      payload({ category: cat!.category_id, city }) as never,
    );
    createdProviderIds.push(first.provider_id!);

    await expect(
      createProviderOrServiceServer(payload({ category: cat!.category_id, city }) as never),
    ).rejects.toMatchObject({
      name: 'ProviderSubmitError',
      code: 'PROVIDER_DUPLICATE',
    });
  }, 60_000);
});
