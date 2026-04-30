import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = process.env.PGPORT || '54322';

// Skip this suite when local Supabase Postgres is not reachable (e.g. CI without supabase start)
const pgReady = spawnSync('pg_isready', ['-h', PGHOST, '-p', PGPORT], {
  encoding: 'utf8',
  env: { ...process.env, PGHOST, PGPORT },
});
const LOCAL_POSTGRES = pgReady.status === 0;
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || 'postgres';

function runCommand(command: string, args: string[], input?: string) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      PGHOST,
      PGPORT,
      PGUSER,
      PGPASSWORD,
    },
    input,
  });

  return result;
}

function runSql(dbName: string, sql: string) {
  const result = runCommand('psql', ['-d', dbName, '-v', 'ON_ERROR_STOP=1', '-Atq'], sql);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'psql command failed');
  }
  return result.stdout.trim();
}

function runSqlExpectFailure(dbName: string, sql: string) {
  return runCommand('psql', ['-d', dbName, '-v', 'ON_ERROR_STOP=1', '-Atq'], sql);
}

describe.skipIf(!LOCAL_POSTGRES)('migration 006 semantic constraints behavioral checks', () => {
  const dbName = `phase4_semantic_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const scratchDir = mkdtempSync(join(tmpdir(), 'phase4-semantic-'));
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '0061_phase4_semantic_constraints.sql');
  const migrationSqlPath = join(scratchDir, '0061_phase4_semantic_constraints.sql');

  beforeAll(() => {
    const migrationSql = readFileSync(migrationPath, 'utf8');
    writeFileSync(migrationSqlPath, migrationSql, 'utf8');

    const createResult = runCommand('createdb', [dbName]);
    if (createResult.status !== 0) {
      throw new Error(createResult.stderr || createResult.stdout || 'failed to create temp db');
    }

    runSql(
      dbName,
      `
      CREATE TYPE public.listing_type_enum AS ENUM ('food', 'business');

      CREATE TABLE public.providers (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        listing_type public.listing_type_enum,
        no_alcohol BOOLEAN NOT NULL DEFAULT FALSE,
        no_pork BOOLEAN NOT NULL DEFAULT FALSE,
        halal_level SMALLINT,
        no_gambling BOOLEAN NOT NULL DEFAULT FALSE,
        solidarity_pricing BOOLEAN NOT NULL DEFAULT FALSE,
        accepts_donations BOOLEAN NOT NULL DEFAULT FALSE
      );

      INSERT INTO public.providers (listing_type, accepts_donations)
      VALUES (NULL, TRUE);
      `
    );

    const applyResult = runCommand('psql', ['-d', dbName, '-v', 'ON_ERROR_STOP=1', '-f', migrationSqlPath]);
    if (applyResult.status !== 0) {
      throw new Error(applyResult.stderr || applyResult.stdout || 'failed to apply migration 006');
    }
  });

  afterAll(() => {
    runCommand('dropdb', ['--if-exists', dbName]);
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('backfills NULL listing_type to ummah and enforces NOT NULL', () => {
    const nullCount = runSql(dbName, `SELECT COUNT(*) FROM public.providers WHERE listing_type IS NULL;`);
    expect(nullCount).toBe('0');

    const ummahCount = runSql(
      dbName,
      `SELECT COUNT(*) FROM public.providers WHERE listing_type = 'ummah'::public.listing_type_enum;`
    );
    expect(ummahCount).toBe('1');

    const isNullable = runSql(
      dbName,
      `
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'providers'
        AND column_name = 'listing_type';
      `
    );
    expect(isNullable).toBe('NO');
  });

  it('rejects invalid food-only and business-only combinations on insert', () => {
    const invalidFoodOnly = runSqlExpectFailure(
      dbName,
      `INSERT INTO public.providers (listing_type, no_alcohol) VALUES ('business', TRUE);`
    );
    expect(invalidFoodOnly.status).not.toBe(0);
    expect(invalidFoodOnly.stderr).toContain('providers_listing_type_food_only_ck');

    const invalidBusinessOnly = runSqlExpectFailure(
      dbName,
      `INSERT INTO public.providers (listing_type, no_gambling) VALUES ('food', TRUE);`
    );
    expect(invalidBusinessOnly.status).not.toBe(0);
    expect(invalidBusinessOnly.stderr).toContain('providers_listing_type_business_only_ck');
  });

  it('rejects invalid ummah-only combinations on insert', () => {
    const invalidUmmahOnly = runSqlExpectFailure(
      dbName,
      `INSERT INTO public.providers (listing_type, accepts_donations) VALUES ('food', TRUE);`
    );
    expect(invalidUmmahOnly.status).not.toBe(0);
    expect(invalidUmmahOnly.stderr).toContain('providers_listing_type_ummah_only_ck');
  });

  it('accepts valid combinations and rejects invalid updates', () => {
    runSql(
      dbName,
      `
      INSERT INTO public.providers (listing_type, no_alcohol, no_pork, halal_level)
      VALUES ('food', TRUE, TRUE, 2);

      INSERT INTO public.providers (listing_type, no_gambling, solidarity_pricing)
      VALUES ('business', TRUE, TRUE);

      INSERT INTO public.providers (listing_type, accepts_donations)
      VALUES ('ummah', TRUE);
      `
    );

    const validCount = runSql(dbName, `SELECT COUNT(*) FROM public.providers;`);
    expect(Number(validCount)).toBeGreaterThanOrEqual(4);

    const invalidUpdate = runSqlExpectFailure(
      dbName,
      `
      UPDATE public.providers
      SET no_alcohol = TRUE
      WHERE id = (
        SELECT id
        FROM public.providers
        WHERE listing_type = 'business'::public.listing_type_enum
        ORDER BY id
        LIMIT 1
      );
      `
    );

    expect(invalidUpdate.status).not.toBe(0);
    expect(invalidUpdate.stderr).toContain('providers_listing_type_food_only_ck');
  });
});
