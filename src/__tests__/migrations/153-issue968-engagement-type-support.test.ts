import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Verifies that 'support' is an allowed engagement_type value after the
// CHECK constraint is updated (issue #968).

const SCHEMA = `
  CREATE TABLE public.providers (
    provider_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name text NOT NULL
  );

  CREATE TABLE public.provider_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiating_provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    engaged_provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
    engagement_type TEXT CHECK (engagement_type IN ('endorsement', 'financial', 'supply_chain', 'community_referral')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const PROVIDER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const PROVIDER_B = 'aaaaaaaa-0000-0000-0000-000000000002';

let db: PGlite;

describe('migration 153 — engagement_type CHECK includes support (#968)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    await db.exec(
      `INSERT INTO public.providers (provider_id, provider_name) VALUES
        ('${PROVIDER_A}', 'Provider A'), ('${PROVIDER_B}', 'Provider B')`,
    );

    // Apply migration 153
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migrationDir = join(process.cwd(), 'supabase', 'migrations');
    const name = readdirSync(migrationDir).find((f) => f.includes('issue968'));
    if (!name) throw new Error('Migration file for issue968 not found');
    await db.exec(readFileSync(join(migrationDir, name), 'utf8'));
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  }, 60_000);

  it('INSERT with engagement_type = support succeeds', async () => {
    const result = await db.query(
      `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
       VALUES ($1, $2, 'support') RETURNING id`,
      [PROVIDER_A, PROVIDER_B],
    );
    expect(result.rows).toHaveLength(1);
  });

  it('existing engagement_type values still work', async () => {
    for (const val of ['endorsement', 'financial', 'supply_chain', 'community_referral']) {
      const result = await db.query(
        `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
         VALUES ($1, $2, $3) RETURNING id`,
        [PROVIDER_A, PROVIDER_B, val],
      );
      expect(result.rows).toHaveLength(1);
    }
  });

  it('invalid engagement_type still rejected', async () => {
    await expect(
      db.query(
        `INSERT INTO public.provider_engagements (initiating_provider_id, engaged_provider_id, engagement_type)
         VALUES ($1, $2, 'invalid_type')`,
        [PROVIDER_A, PROVIDER_B],
      ),
    ).rejects.toThrow(/check|constraint/i);
  });
});
