import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const WT = '/Users/NARAFIQ/Projects/uflow-wt/547-provider-404-regression';
const db = new PGlite();

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

// migration-130 SELECT policy = the pre-137 baseline
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

async function q(sql, params) {
  return (await db.query(sql, params)).rows;
}

async function asCaller(role, uid, fn) {
  await db.exec('BEGIN');
  await q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
  await db.exec(`SET LOCAL ROLE ${role}`);
  let out;
  try {
    out = await fn();
  } finally {
    await db.exec('ROLLBACK');
  }
  return out;
}

async function visibleCount() {
  const r = await q('SELECT count(*)::int AS n FROM public.providers');
  return r[0].n;
}
async function canSee(id) {
  const r = await q('SELECT provider_id FROM public.providers WHERE provider_id = $1', [id]);
  return r.length > 0;
}

async function matrix(label) {
  const rows = [];
  for (const [who, role, uid] of [
    ['anon', 'anon', null],
    ['creator', 'authenticated', CREATOR],
    ['admin', 'authenticated', ADMIN],
    ['unrelated', 'authenticated', OTHER],
  ]) {
    const res = await asCaller(role, uid, async () => ({
      count: await visibleCount(),
      approved: await canSee(APPROVED),
      pending: await canSee(PENDING),
      rejected: await canSee(REJECTED),
    }));
    rows.push({ label, who, ...res });
  }
  console.table(rows);
}

await db.exec(SCHEMA);
await db.exec(POLICY_130);
await q(`INSERT INTO public.users VALUES ($1,'creator@x','user'),($2,'admin@x','admin'),($3,'other@x','user')`, [CREATOR, ADMIN, OTHER]);
// production-shaped rows: provider_owner_id IS NULL on all 1,127 pending rows
await q(
  `INSERT INTO public.providers (provider_id, provider_name, review_status, user_created_id, provider_owner_id)
   VALUES ($1,'Approved','approved',$4,NULL),($2,'Pending','pending',$4,NULL),($3,'Rejected','rejected',$4,NULL)`,
  [APPROVED, PENDING, REJECTED, CREATOR],
);

console.log('\n=== BEFORE (migration 130 policy) ===');
await matrix('130');

console.log('\n=== applying migration 137 ===');
const sql = readFileSync(`${WT}/supabase/migrations/137_issue547_provider_route_visibility.sql`, 'utf8');
await db.exec(sql);
console.log('applied OK');

console.log('\n=== AFTER (migration 137 policy) ===');
await matrix('137');

console.log('\n=== idempotency: re-run 137 ===');
await db.exec(sql);
console.log('re-run OK');
const pols = await q(`SELECT policyname, cmd FROM pg_policies WHERE tablename='providers' ORDER BY policyname`);
console.table(pols);

console.log('\n=== RPC tri-state ===');
const rpcRows = [];
for (const [who, role, uid] of [
  ['anon', 'anon', null],
  ['creator', 'authenticated', CREATOR],
  ['admin', 'authenticated', ADMIN],
  ['unrelated', 'authenticated', OTHER],
]) {
  const res = await asCaller(role, uid, async () => {
    const out = {};
    for (const [name, id] of [['approved', APPROVED], ['pending', PENDING], ['rejected', REJECTED], ['absent', '00000000-0000-0000-0000-000000000000']]) {
      try {
        out[name] = (await q('SELECT public.provider_route_visibility($1) AS v', [id]))[0].v;
      } catch (e) {
        out[name] = 'ERR: ' + e.message;
      }
    }
    return out;
  });
  rpcRows.push({ who, ...res });
}
console.table(rpcRows);

console.log('\n=== function owner / security / volatility ===');
console.table(await q(`SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.provolatile, p.proacl::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('provider_is_visible','provider_route_visibility')`));

console.log('\n=== EXPLAIN: is provider_is_visible inlined / admin check hoisted? ===');
await asCaller('authenticated', OTHER, async () => {
  const r = await q('EXPLAIN SELECT provider_id FROM public.providers');
  console.log(r.map((x) => x['QUERY PLAN']).join('\n'));
});

await db.close();
