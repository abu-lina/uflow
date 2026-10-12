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

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.UFLOW_LIVE_DB_URL;
const SERVICE_KEY = process.env.UFLOW_LIVE_SERVICE_KEY;

/** Narrows the env pair inside the live-only paths; the skip gate above must
 * still see them as possibly-absent, so it never calls this. */
function liveEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('live harness env missing');
  return { url: SUPABASE_URL, key: SERVICE_KEY };
}

function assertPresent<T>(v: T | null | undefined, what: string): asserts v is T {
  if (v == null) throw new Error(`expected ${what}`);
}

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
    /^127\.\d+\.\d+\.\d+$/.test(hostname) // literal IPv4 loopback only
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
          UFLOW_PROBE_URL: liveEnv().url,
          UFLOW_PROBE_KEY: liveEnv().key,
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

  /** providers.user_created_id FKs to auth.users — the actor must be a real
   * user row, created for the run and deleted in afterAll. */
  let actorUserId: string;

  beforeAll(async () => {
    // The service under test builds its admin client from NEXT_PUBLIC_*/key
    // env vars — and setup.ts:15 clobbers the URL with the mock host. Without
    // these stubs the service would send the shell's SUPABASE_SERVICE_ROLE_KEY
    // to that unowned domain. Point it at the live stack for this describe.
    const { url, key } = liveEnv();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);

    const { data, error } = await adminClient().auth.admin.createUser({
      email: `606repro-${Date.now()}@example.com`,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('live user create failed');
    actorUserId = data.user.id;
  });

  function adminClient(): SupabaseClient {
    if (!admin) {
      const { url, key } = liveEnv();
      admin = createClient(url, key, {
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
      actor: { userId: actorUserId, isOwner: false },
    };
  }

  afterAll(async () => {
    // Clean up every provider the harness managed to insert, then the actor.
    for (const id of createdProviderIds) {
      await adminClient().from('locations').delete().eq('provider_id', id);
      await adminClient().from('providers').delete().eq('provider_id', id);
    }
    if (actorUserId) {
      await adminClient().auth.admin.deleteUser(actorUserId);
    }
    vi.unstubAllEnvs();
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
    assertPresent(allCategories, 'allCategories');
    expect(allCategories.length).toBeGreaterThan(0);

    const city = await closedListCity();
    for (const category of allCategories) {
      const result = await createProviderOrServiceServer(
        payload({
          category: category.category_id,
          city,
          title: `Repro ${runId} ${category.category_id.slice(0, 8)}`,
        }) as never,
      );
      // The community-support category returns community_service_id; every
      // other category returns provider_id. Both land in `providers`.
      const createdId = result.provider_id ?? result.community_service_id;
      expect(createdId).toBeTruthy();
      assertPresent(createdId, 'createdId');
      createdProviderIds.push(createdId);

      const { data: row } = await adminClient()
        .from('providers')
        .select('listing_type')
        .eq('provider_id', createdId)
        .single();
      assertPresent(row, 'providers row');
      expect(['food', 'store', 'ummah']).toContain(row.listing_type);
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
    assertPresent(cat, 'a categories row');

    await expect(
      createProviderOrServiceServer(
        payload({ category: cat.category_id, city: `Atlantis-${runId}` }) as never,
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
    assertPresent(cat, 'a categories row');
    const city = await closedListCity();
    const first = await createProviderOrServiceServer(
      payload({ category: cat.category_id, city }) as never,
    );
    assertPresent(first.provider_id, 'first.provider_id');
    createdProviderIds.push(first.provider_id);

    await expect(
      createProviderOrServiceServer(payload({ category: cat.category_id, city }) as never),
    ).rejects.toMatchObject({
      name: 'ProviderSubmitError',
      code: 'PROVIDER_DUPLICATE',
    });
  }, 60_000);
});
