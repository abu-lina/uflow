import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Exercises the RLS policies for provider_engagements and ummah_providers
// added by migration 152 (issue #911). Both tables had RLS enabled in
// migration 083 but zero CREATE POLICY statements, blocking all anon/
// authenticated access.

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TYPE public.listing_type_enum AS ENUM ('food', 'store', 'ummah');
  CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected', 'needs_revision', 'removed_by_owner');
  CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator');
  CREATE TABLE public.users (user_id uuid PRIMARY KEY, email text, role public.user_role DEFAULT 'user');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $f$;
  CREATE TABLE public.categories (
    category_id uuid PRIMARY KEY, name_de text, name_en text,
    description_de text, description_en text, category_images jsonb,
    applicable_section text NOT NULL DEFAULT 'all'
  );
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL,
    provider_description text,
    category_id uuid REFERENCES public.categories(category_id) ON DELETE SET NULL,
    review_status public.review_status DEFAULT 'pending',
    listing_type public.listing_type_enum,
    user_created_id uuid,
    provider_owner_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users self read" ON public.users FOR SELECT USING (true);
  CREATE POLICY "providers select" ON public.providers FOR SELECT USING (
    review_status = 'approved' OR provider_owner_id = (SELECT auth.uid())
  );

  CREATE TABLE public.ummah_providers (
    provider_id UUID PRIMARY KEY REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    community_service_view_count INTEGER NOT NULL DEFAULT 0,
    donation_count INTEGER NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    community_service_logo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.ummah_providers ENABLE ROW LEVEL SECURITY;

  CREATE TABLE public.provider_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiating_provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    engaged_provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    engagement_type TEXT CHECK (engagement_type IN ('endorsement', 'financial', 'supply_chain', 'community_referral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE public.provider_engagements ENABLE ROW LEVEL SECURITY;

  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers, public.users,
    public.categories, public.ummah_providers, public.provider_engagements
    TO anon, authenticated;
`;

const OWNER_A = '11111111-1111-1111-1111-111111111111';
const OWNER_B = '22222222-2222-2222-2222-222222222222';
const ADMIN = '33333333-3333-3333-3333-333333333333';
const OTHER = '44444444-4444-4444-4444-444444444444';

const PROVIDER_A = 'aaaaaaaa-0000-0000-0000-000000000001'; // approved, owned by OWNER_A
const PROVIDER_B = 'aaaaaaaa-0000-0000-0000-000000000002'; // approved ummah, owned by OWNER_B
const PROVIDER_C = 'aaaaaaaa-0000-0000-0000-000000000003'; // pending ummah, owned by OWNER_B

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const readMigration = (suffix: string) => {
  const name = readdirSync(migrationDir).find((file) => file.endsWith(suffix));
  if (!name) throw new Error(`migration file matching ${suffix} not found`);
  return readFileSync(join(migrationDir, name), 'utf8');
};

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

async function asCaller<T>(role: string, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec('BEGIN');
  await rows(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('ROLLBACK');
  }
}

describe('migration 152 — provider_engagements + ummah_providers RLS (#911)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);

    const sql152 = readMigration('_issue911_rls_provider_engagements_ummah_providers.sql');
    await db.exec(sql152);

    await rows(
      `INSERT INTO public.users (user_id, email, role) VALUES
        ($1,'ownera@x','user'),($2,'ownerb@x','user'),($3,'admin@x','admin'),($4,'other@x','user')`,
      [OWNER_A, OWNER_B, ADMIN, OTHER],
    );
    await rows(
      `INSERT INTO public.providers (provider_id, provider_name, review_status, listing_type, provider_owner_id)
       VALUES
        ($1,'Provider A','approved','food',$4),
        ($2,'Ummah B','approved','ummah',$5),
        ($3,'Ummah C','pending','ummah',$5)`,
      [PROVIDER_A, PROVIDER_B, PROVIDER_C, OWNER_A, OWNER_B],
    );
    await rows(
      `INSERT INTO public.ummah_providers (provider_id, is_verified) VALUES ($1, true), ($2, false)`,
      [PROVIDER_B, PROVIDER_C],
    );
    await rows(
      `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type) VALUES ($1, $2, 'endorsement')`,
      [PROVIDER_A, PROVIDER_B],
    );
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  }, 60_000);

  // -- ummah_providers SELECT --

  it('anon can SELECT ummah_providers rows for an approved provider', async () => {
    const result = await asCaller('anon', null, () =>
      rows<{ provider_id: string }>(
        'SELECT provider_id FROM public.ummah_providers WHERE provider_id = $1',
        [PROVIDER_B],
      ),
    );
    expect(result).toHaveLength(1);
  });

  it('anon cannot SELECT ummah_providers rows for a pending provider', async () => {
    const result = await asCaller('anon', null, () =>
      rows<{ provider_id: string }>(
        'SELECT provider_id FROM public.ummah_providers WHERE provider_id = $1',
        [PROVIDER_C],
      ),
    );
    expect(result).toHaveLength(0);
  });

  it('the owner can SELECT their own pending ummah_providers row', async () => {
    const result = await asCaller('authenticated', OWNER_B, () =>
      rows<{ provider_id: string }>(
        'SELECT provider_id FROM public.ummah_providers WHERE provider_id = $1',
        [PROVIDER_C],
      ),
    );
    expect(result).toHaveLength(1);
  });

  // -- provider_engagements SELECT --

  it('anon can SELECT provider_engagements', async () => {
    const result = await asCaller('anon', null, () =>
      rows<{ id: string }>(
        'SELECT id FROM public.provider_engagements WHERE initiating_provider_id = $1',
        [PROVIDER_A],
      ),
    );
    expect(result).toHaveLength(1);
  });

  it('anon cannot see engagements referencing a pending provider', async () => {
    await db.exec(
      `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
       VALUES ('${PROVIDER_A}', '${PROVIDER_C}', 'endorsement')`,
    );
    const result = await asCaller('anon', null, () =>
      rows<{ id: string }>(
        'SELECT id FROM public.provider_engagements WHERE engaged_provider_id = $1',
        [PROVIDER_C],
      ),
    );
    expect(result).toHaveLength(0);
    await db.exec(
      `DELETE FROM public.provider_engagements WHERE initiating_provider_id = '${PROVIDER_A}' AND engaged_provider_id = '${PROVIDER_C}' AND engagement_type = 'endorsement'`,
    );
  });

  // -- provider_engagements INSERT --

  it('provider owner can INSERT engagements for their provider', async () => {
    await asCaller('authenticated', OWNER_B, async () => {
      await db.query(
        `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
         VALUES ($1, $2, 'financial')`,
        [PROVIDER_B, PROVIDER_A],
      );
      const result = await rows<{ id: string }>(
        'SELECT id FROM public.provider_engagements WHERE initiating_provider_id = $1',
        [PROVIDER_B],
      );
      expect(result).toHaveLength(1);
    });
  });

  it('non-owner cannot INSERT engagements for another provider', async () => {
    await asCaller('authenticated', OTHER, () =>
      expect(
        db.query(
          `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
           VALUES ($1, $2, 'financial')`,
          [PROVIDER_A, PROVIDER_B],
        ),
      ).rejects.toThrow(/row-level security|row security/i),
    );
  });

  // -- provider_engagements DELETE --

  it('provider owner can DELETE engagements for their provider', async () => {
    await asCaller('authenticated', OWNER_A, async () => {
      const res = await db.query(
        'DELETE FROM public.provider_engagements WHERE initiating_provider_id = $1 AND engaged_provider_id = $2',
        [PROVIDER_A, PROVIDER_B],
      );
      expect(res.affectedRows).toBe(1);
    });
  });

  it('non-owner DELETE on another providers engagements is a silent no-op', async () => {
    await asCaller('authenticated', OTHER, async () => {
      const res = await db.query(
        'DELETE FROM public.provider_engagements WHERE initiating_provider_id = $1',
        [PROVIDER_A],
      );
      expect(res.affectedRows).toBe(0);
    });
  });

  // -- admin access --

  it('admin can INSERT engagements on any provider', async () => {
    await asCaller('authenticated', ADMIN, async () => {
      await db.query(
        `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
         VALUES ($1, $2, 'community_referral')`,
        [PROVIDER_B, PROVIDER_A],
      );
      const result = await rows<{ id: string }>(
        'SELECT id FROM public.provider_engagements WHERE initiating_provider_id = $1',
        [PROVIDER_B],
      );
      expect(result).toHaveLength(1);
    });
  });
});
