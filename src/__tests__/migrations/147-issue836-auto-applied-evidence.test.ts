import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATION = readFileSync(
  join(__dirname, '../../../supabase/migrations/147_issue836_auto_applied_evidence.sql'),
  'utf-8',
);

const SCHEMA = `
  CREATE TYPE enrichment_status AS ENUM ('pending', 'approved', 'rejected', 'applied');
  CREATE TABLE public.enrichment_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    field_name text NOT NULL,
    status enrichment_status NOT NULL DEFAULT 'pending'
  );
  INSERT INTO public.enrichment_candidates (field_name, status) VALUES ('phone', 'applied');
`;

describe('#836 auto-applied status and evidence column', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(MIGRATION);
  });

  it('auto-applied is a valid status in enrichment_candidates', async () => {
    await db.query(
      `INSERT INTO public.enrichment_candidates (field_name, status) VALUES ('website', 'auto-applied')`,
    );
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.enrichment_candidates WHERE status = 'auto-applied'`,
    );
    expect(rows[0].n).toBe(1);
  });

  it('evidence column exists, nullable JSONB', async () => {
    const { rows } = await db.query<{ data_type: string; is_nullable: string }>(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_name = 'enrichment_candidates' AND column_name = 'evidence'`,
    );
    expect(rows).toEqual([{ data_type: 'jsonb', is_nullable: 'YES' }]);
  });

  it('existing rows unaffected', async () => {
    const { rows } = await db.query<{ status: string; evidence: unknown }>(
      `SELECT status, evidence FROM public.enrichment_candidates WHERE field_name = 'phone'`,
    );
    expect(rows).toEqual([{ status: 'applied', evidence: null }]);
  });

  it('migration is idempotent', async () => {
    await db.exec(MIGRATION);
  });
});
