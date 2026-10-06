import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

// Executes migration 138 against a real (WASM) Postgres — the only layer that
// can prove the admin_review_provider RPC is atomic: a gate or conflict
// failure must roll back BOTH the attestation write and the status change
// (#548 AC 1).
//
// The seeded schema mirrors the verified live DEV shape BEFORE the fix:
// food_providers.no_* are NOT NULL DEFAULT false (migration 129 unapplied),
// and providers has no reviewed_by / reviewed_at columns.

const MIGRATION = readFileSync(
  join(__dirname, '../../../supabase/migrations/138_issue548_review_audit_and_tri_state.sql'),
  'utf-8',
);

const SCHEMA = `
  CREATE ROLE service_role;
  CREATE TYPE public.review_status AS ENUM
    ('pending','approved','rejected','needs_revision','removed_by_owner');
  CREATE TYPE public.listing_type_enum AS ENUM ('food','store','ummah');
  CREATE TYPE public.user_role AS ENUM ('user','admin','moderator');
  CREATE TABLE public.users (
    user_id uuid PRIMARY KEY,
    email text,
    role public.user_role DEFAULT 'user'
  );
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL,
    listing_type public.listing_type_enum NOT NULL,
    review_status public.review_status NOT NULL DEFAULT 'pending',
    review_feedback text,
    user_created_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  -- Pre-129 shape: NOT NULL + DEFAULT false (verified live on DEV).
  CREATE TABLE public.food_providers (
    provider_id uuid PRIMARY KEY REFERENCES public.providers(provider_id),
    verification_method text,
    has_certificate boolean NOT NULL DEFAULT false,
    certificate_url text,
    no_alcohol boolean NOT NULL DEFAULT false,
    no_pork boolean NOT NULL DEFAULT false,
    no_gambling boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.store_providers (
    provider_id uuid PRIMARY KEY REFERENCES public.providers(provider_id),
    verification_method text,
    has_certificate boolean NOT NULL DEFAULT false,
    certificate_url text,
    no_alcohol boolean DEFAULT false,
    no_pork boolean DEFAULT false,
    no_gambling boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

const ADMIN = '22222222-2222-2222-2222-222222222222';
const PROVIDER = 'aaaaaaaa-0000-0000-0000-000000000548';
const STORE_PROVIDER = 'bbbbbbbb-0000-0000-0000-000000000548';

let db: PGlite;

async function reviewRpc(
  opts: {
    status?: string;
    feedback?: string | null;
    halal?: string | null;
    expected?: string | null;
    providerId?: string;
  } = {},
) {
  const status = opts.status ?? 'approved';
  const feedback =
    opts.feedback === undefined ? 'NULL' : opts.feedback === null ? 'NULL' : `'${opts.feedback}'`;
  const halal = opts.halal === undefined || opts.halal === null ? 'NULL' : `'${opts.halal}'::jsonb`;
  const expected =
    opts.expected === undefined || opts.expected === null
      ? 'NULL'
      : `'${opts.expected}'::timestamptz`;
  return db.exec(
    `SELECT public.admin_review_provider(
       '${opts.providerId ?? PROVIDER}'::uuid,
       '${status}'::public.review_status,
       ${feedback},
       '${ADMIN}'::uuid,
       ${halal},
       ${expected})`,
  );
}

async function providerRow(id = PROVIDER) {
  const { rows } = await db.query<{
    review_status: string;
    review_feedback: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    updated_at: string;
  }>(
    `SELECT review_status, review_feedback, reviewed_by, reviewed_at, updated_at
       FROM public.providers WHERE provider_id = $1`,
    [id],
  );
  return rows[0];
}

async function foodRow(id = PROVIDER) {
  const { rows } = await db.query<{
    no_alcohol: boolean | null;
    no_pork: boolean | null;
    no_gambling: boolean | null;
  }>(
    `SELECT no_alcohol, no_pork, no_gambling
       FROM public.food_providers WHERE provider_id = $1`,
    [id],
  );
  return rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(`INSERT INTO public.users (user_id, email, role) VALUES
    ('${ADMIN}', 'admin@test.local', 'admin')`);
  await db.exec(`INSERT INTO public.providers
      (provider_id, provider_name, listing_type, review_status, updated_at)
    VALUES
      ('${PROVIDER}', 'Halal Test Grill', 'food', 'pending', '2025-01-01T00:00:00Z'),
      ('${STORE_PROVIDER}', 'Halal Test Store', 'store', 'pending', '2025-01-01T00:00:00Z')`);
  // 912-of-914 shape: stored row exists, every answer clamped to false.
  await db.exec(`INSERT INTO public.food_providers (provider_id) VALUES ('${PROVIDER}')`);
  await db.exec(`INSERT INTO public.store_providers (provider_id) VALUES ('${STORE_PROVIDER}')`);
  await db.exec(MIGRATION);
});

describe('migration 138 — schema changes', () => {
  it('adds reviewed_by and reviewed_at as nullable columns', async () => {
    const { rows } = await db.query<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'providers' AND column_name IN ('reviewed_by','reviewed_at')
        ORDER BY column_name`,
    );
    expect(rows).toEqual([
      { column_name: 'reviewed_at', is_nullable: 'YES' },
      { column_name: 'reviewed_by', is_nullable: 'YES' },
    ]);
  });

  it('re-states migration 129: attestation columns become nullable with no default', async () => {
    for (const table of ['food_providers', 'store_providers']) {
      const { rows } = await db.query<{
        column_name: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, is_nullable, column_default FROM information_schema.columns
          WHERE table_name = '${table}'
            AND column_name IN ('no_alcohol','no_pork','no_gambling')
          ORDER BY column_name`,
      );
      for (const row of rows) {
        expect(row.is_nullable).toBe('YES');
        expect(row.column_default).toBeNull();
      }
      expect(rows).toHaveLength(3);
    }
  });

  it('stores NULL for an omitted attestation after the migration (tri-state)', async () => {
    const id = 'cccccccc-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Tri State', 'food')`,
    );
    await db.exec(`INSERT INTO public.food_providers (provider_id) VALUES ('${id}')`);
    const row = await foodRow(id);
    expect(row).toEqual({ no_alcohol: null, no_pork: null, no_gambling: null });
  });
});

describe('migration 138 — no data migration (AC 13)', () => {
  it('contains no UPDATE against providers, food_providers or store_providers outside the function', () => {
    // Strip the $$-quoted function body, then scan what remains. A stray
    // top-level UPDATE would be a data rewrite of the 914 existing rows.
    const withoutFunctions = MIGRATION.replace(/\$\$[\s\S]*?\$\$/g, '');
    expect(withoutFunctions).not.toMatch(
      /UPDATE\s+public\.(providers|food_providers|store_providers)/i,
    );
    expect(withoutFunctions).not.toMatch(
      /INSERT\s+INTO\s+public\.(providers|food_providers|store_providers)/i,
    );
  });

  it('re-states all six DROP NOT NULL / DROP DEFAULT pairs', () => {
    for (const table of ['food_providers', 'store_providers']) {
      for (const col of ['no_alcohol', 'no_pork', 'no_gambling']) {
        expect(MIGRATION).toContain(`ALTER COLUMN ${col}`);
      }
      const section = MIGRATION.match(new RegExp(`ALTER TABLE public\\.${table}[^;]+;`, 'i'));
      expect(section?.[0]).toMatch(/DROP NOT NULL/i);
      expect(section?.[0]).toMatch(/DROP DEFAULT/i);
    }
  });
});

describe('admin_review_provider RPC', () => {
  it('approves with submitted answers even when the stored row is all-false', async () => {
    // Current-data case: 0 of 914 stored rows pass the gate today.
    await reviewRpc({
      halal: '{"no_alcohol":true,"no_pork":true,"no_gambling":true,"verification_method":"onsite"}',
    });
    const p = await providerRow();
    const f = await foodRow();
    expect(p.review_status).toBe('approved');
    expect(p.reviewed_by).toBe(ADMIN);
    expect(p.reviewed_at).not.toBeNull();
    expect(f).toEqual({ no_alcohol: true, no_pork: true, no_gambling: true });
    const { rows } = await db.query<{ verification_method: string }>(
      `SELECT verification_method FROM public.food_providers WHERE provider_id = '${PROVIDER}'`,
    );
    expect(rows[0].verification_method).toBe('onsite');
  });

  it('rolls back BOTH writes when the merged answers fail the gate (AC 1)', async () => {
    const id = 'dddddddd-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Atomicity', 'food')`,
    );
    // Explicit falses simulate the 912-row clamped shape the migration
    // leaves untouched (the DEFAULT is gone by this point).
    await db.exec(
      `INSERT INTO public.food_providers (provider_id, no_alcohol, no_pork, no_gambling)
       VALUES ('${id}', false, false, false)`,
    );

    await expect(
      reviewRpc({
        providerId: id,
        halal: '{"no_alcohol":true,"no_pork":true,"no_gambling":null}',
      }),
    ).rejects.toThrow(/HALAL_GATE/);

    const p = await providerRow(id);
    const f = await foodRow(id);
    // Neither write survived: status still pending, answers still all-false.
    expect(p.review_status).toBe('pending');
    expect(p.reviewed_by).toBeNull();
    expect(f).toEqual({ no_alcohol: false, no_pork: false, no_gambling: false });
  });

  it('raises CONFLICT when expectedUpdatedAt does not match, writing nothing', async () => {
    const id = 'eeeeeeee-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Conflicted', 'food')`,
    );
    await expect(
      reviewRpc({
        providerId: id,
        halal: '{"no_alcohol":true,"no_pork":true,"no_gambling":true}',
        expected: '1999-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(/CONFLICT/);
    const p = await providerRow(id);
    expect(p.review_status).toBe('pending');
    const f = await foodRow(id);
    expect(f).toBeUndefined(); // extension insert rolled back too
  });

  it('rejects with feedback and records the reviewer, skipping the gate', async () => {
    const id = 'ffffffff-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Rejectable', 'food')`,
    );
    await reviewRpc({ providerId: id, status: 'rejected', feedback: 'no verifiable halal info' });
    const p = await providerRow(id);
    expect(p.review_status).toBe('rejected');
    expect(p.review_feedback).toBe('no verifiable halal info');
    expect(p.reviewed_by).toBe(ADMIN);
    expect(p.reviewed_at).not.toBeNull();
  });

  it('keeps JSON null answers NULL, not clamped to false (migration-131 semantics)', async () => {
    const id = 'a0a0a0a0-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Null Answer', 'food')`,
    );
    await db.exec(`INSERT INTO public.food_providers (provider_id) VALUES ('${id}')`);
    await expect(
      reviewRpc({
        providerId: id,
        status: 'rejected',
        feedback: 'incomplete',
        halal: '{"no_alcohol":null,"no_pork":true,"no_gambling":false}',
      }),
    ).resolves.toBeDefined();
    const f = await foodRow(id);
    expect(f).toEqual({ no_alcohol: null, no_pork: true, no_gambling: false });
  });

  it('blocks approval on stored values when no halal payload is sent (list path)', async () => {
    const id = 'b0b0b0b0-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'No Payload', 'food')`,
    );
    await db.exec(`INSERT INTO public.food_providers (provider_id) VALUES ('${id}')`);
    await expect(reviewRpc({ providerId: id })).rejects.toThrow(/HALAL_GATE/);
    const p = await providerRow(id);
    expect(p.review_status).toBe('pending');
  });

  it('approves a non-food provider without attestation data', async () => {
    const id = 'c1c1c1c1-0000-0000-0000-000000000548';
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name, listing_type)
       VALUES ('${id}', 'Ummah Org', 'ummah')`,
    );
    await reviewRpc({ providerId: id });
    const p = await providerRow(id);
    expect(p.review_status).toBe('approved');
    expect(p.reviewed_by).toBe(ADMIN);
  });
});
