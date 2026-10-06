import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Executes migration 137 against a real (WASM) Postgres. This is the only
// test layer that can catch an SQL defect in the visibility rule: the
// middleware suite stubs PostgREST, so it proves wiring, never policy.
//
// The schema below mirrors the production shape that matters: the
// `public.review_status` and `public.user_role` enums, `public.users`, the
// migration-130 SELECT policy 137 replaces, and a stub `auth.uid()` that
// reads the JWT claim GUC the way Supabase's real one does. Provider rows
// are seeded the way the 1,127 real pending rows are shaped:
// `provider_owner_id IS NULL`, creator identified only by `user_created_id`.

const SCHEMA = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected','needs_revision','removed_by_owner');
  CREATE TYPE public.user_role AS ENUM ('user','admin','moderator');
  CREATE TABLE public.users (user_id uuid PRIMARY KEY, email text, role public.user_role DEFAULT 'user');
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL,
    review_status public.review_status DEFAULT 'pending',
    user_created_id uuid,
    provider_owner_id uuid
  );
  -- stub auth.uid() reading the JWT claim GUC, as Supabase does
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $f$;
  ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users self read" ON public.users FOR SELECT USING (true);
  GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
  GRANT SELECT ON public.providers, public.users TO anon, authenticated;
`;

// The migration-130 SELECT policy verbatim: the pre-137 baseline 137 must
// preserve semantics of. The name is the 63-byte truncation Postgres
// stored, matching 001_baseline.sql and 130_provider_submission_policies.sql.
const POLICY_130 = `
  CREATE POLICY "Public can view approved, users can view own, admins can view a" ON "public"."providers" FOR SELECT USING (
    (("review_status" = 'approved'::"public"."review_status")
      OR ("provider_owner_id" = ( SELECT "auth"."uid"() AS "uid"))
      OR ("user_created_id" = ( SELECT "auth"."uid"() AS "uid"))
      OR (EXISTS ( SELECT 1 FROM "public"."users"
        WHERE (("users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("users"."role" = ANY (ARRAY['admin'::"public"."user_role", 'moderator'::"public"."user_role"]))))))
  );`;

const CREATOR = '11111111-1111-1111-1111-111111111111';
const ADMIN = '22222222-2222-2222-2222-222222222222';
const OTHER = '33333333-3333-3333-3333-333333333333';
const APPROVED = 'aaaaaaaa-0000-0000-0000-000000000001';
const PENDING = 'aaaaaaaa-0000-0000-0000-000000000002';
const REJECTED = 'aaaaaaaa-0000-0000-0000-000000000003';
const ABSENT = '00000000-0000-0000-0000-000000000000';

const migrationSql = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '137_issue547_provider_route_visibility.sql'),
  'utf8',
);

let db: PGlite;

async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Run `fn` as a PostgREST role + JWT identity, in a rolled-back transaction. */
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

interface VisibilityRow {
  count: number;
  approved: boolean;
  pending: boolean;
  rejected: boolean;
}

async function visibilityMatrix(): Promise<Record<string, VisibilityRow>> {
  const out: Record<string, VisibilityRow> = {};
  for (const [who, role, uid] of [
    ['anon', 'anon', null],
    ['creator', 'authenticated', CREATOR],
    ['admin', 'authenticated', ADMIN],
    ['unrelated', 'authenticated', OTHER],
  ] as const) {
    out[who] = await asCaller(role, uid, async () => ({
      count: (await rows<{ n: number }>('SELECT count(*)::int AS n FROM public.providers'))[0].n,
      approved:
        (await rows('SELECT provider_id FROM public.providers WHERE provider_id = $1', [APPROVED]))
          .length > 0,
      pending:
        (await rows('SELECT provider_id FROM public.providers WHERE provider_id = $1', [PENDING]))
          .length > 0,
      rejected:
        (await rows('SELECT provider_id FROM public.providers WHERE provider_id = $1', [REJECTED]))
          .length > 0,
    }));
  }
  return out;
}

async function rpcMatrix(): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [who, role, uid] of [
    ['anon', 'anon', null],
    ['creator', 'authenticated', CREATOR],
    ['admin', 'authenticated', ADMIN],
    ['unrelated', 'authenticated', OTHER],
  ] as const) {
    out[who] = await asCaller(role, uid, async () => {
      const answers: Record<string, string> = {};
      for (const [name, id] of [
        ['approved', APPROVED],
        ['pending', PENDING],
        ['rejected', REJECTED],
        ['absent', ABSENT],
      ] as const) {
        answers[name] = (
          await rows<{ v: string }>('SELECT public.provider_route_visibility($1) AS v', [id])
        )[0].v;
      }
      return answers;
    });
  }
  return out;
}

// The migration-130 rule, restated as literals — the expected matrix is an
// independent source of truth, not a recomputation of the policy under test.
const EXPECTED_MATRIX: Record<string, VisibilityRow> = {
  anon: { count: 1, approved: true, pending: false, rejected: false },
  creator: { count: 3, approved: true, pending: true, rejected: true },
  admin: { count: 3, approved: true, pending: true, rejected: true },
  unrelated: { count: 1, approved: true, pending: false, rejected: false },
};

const EXPECTED_RPC: Record<string, Record<string, string>> = {
  anon: { approved: 'visible', pending: 'hidden', rejected: 'hidden', absent: 'absent' },
  creator: { approved: 'visible', pending: 'visible', rejected: 'visible', absent: 'absent' },
  admin: { approved: 'visible', pending: 'visible', rejected: 'visible', absent: 'absent' },
  unrelated: { approved: 'visible', pending: 'hidden', rejected: 'hidden', absent: 'absent' },
};

describe('migration 137 — provider_route_visibility (executed against Postgres)', () => {
  let matrixBefore: Record<string, VisibilityRow>;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(POLICY_130);
    await rows(
      `INSERT INTO public.users VALUES
        ($1,'creator@x','user'),($2,'admin@x','admin'),($3,'other@x','user')`,
      [CREATOR, ADMIN, OTHER],
    );
    // production-shaped rows: provider_owner_id IS NULL on all pending rows
    await rows(
      `INSERT INTO public.providers (provider_id, provider_name, review_status, user_created_id, provider_owner_id)
       VALUES ($1,'Approved','approved',$4,NULL),($2,'Pending','pending',$4,NULL),($3,'Rejected','rejected',$4,NULL)`,
      [APPROVED, PENDING, REJECTED, CREATOR],
    );
    matrixBefore = await visibilityMatrix();
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('baseline (migration 130): anon sees approved only; creator and admin see all three', () => {
    expect(matrixBefore).toEqual(EXPECTED_MATRIX);
  });

  it('applies cleanly', async () => {
    await expect(db.exec(migrationSql)).resolves.toBeDefined();
  });

  it('is idempotent and leaves exactly one SELECT policy on providers', async () => {
    await expect(db.exec(migrationSql)).resolves.toBeDefined();
    const policies = await rows<{ policyname: string; cmd: string }>(
      `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'providers' AND cmd = 'SELECT'`,
    );
    expect(policies).toEqual([
      {
        policyname: 'Public can view approved, users can view own, admins can view a',
        cmd: 'SELECT',
      },
    ]);
  });

  it('preserves the 130 visibility matrix exactly for all four caller classes', async () => {
    expect(await visibilityMatrix()).toEqual(matrixBefore);
  });

  it('keeps anon visibility approved-only after the policy rewrite', async () => {
    const anon = await asCaller('anon', null, async () => ({
      count: (await rows<{ n: number }>('SELECT count(*)::int AS n FROM public.providers'))[0].n,
      pending:
        (await rows('SELECT provider_id FROM public.providers WHERE provider_id = $1', [PENDING]))
          .length > 0,
    }));
    expect(anon).toEqual({ count: 1, pending: false });
  });

  it('RPC answers the tri-state for anon, creator, admin and unrelated callers', async () => {
    expect(await rpcMatrix()).toEqual(EXPECTED_RPC);
  });

  it('provider_route_visibility is SECURITY DEFINER with a pinned search_path', async () => {
    const fns = await rows<{ proname: string; prosecdef: boolean; proconfig: string[] | null }>(
      `SELECT p.proname, p.prosecdef, p.proconfig::text[]
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'provider_route_visibility'`,
    );
    expect(fns).toEqual([
      { proname: 'provider_route_visibility', prosecdef: true, proconfig: ['search_path=public'] },
    ]);
  });
});
