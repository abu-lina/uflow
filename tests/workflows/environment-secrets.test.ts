import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), '.github/workflows', file), 'utf8');

const withInput = [
  'backfill-enrichment.yml',
  'backfill-location-coords.yml',
  'discover-halal.yml',
  'enrich-providers.yml',
  'import-joinhalal.yml',
  'import-muslimbusiness.yml',
  'screen-providers.yml',
];
const productionOnly = ['enrich-wolt.yml', 'enrich-food-providers.yml', 'enrich-one-provider.yml'];
const listed = [...withInput, ...productionOnly];

// Job-level keys sit at 4 spaces; dispatch inputs sit at 6, so they never match.
const jobEnvironments = (wf: string): string[] =>
  Array.from(wf.matchAll(/^ {4}environment: (.+)$/gm), (m) => m[1].trim());
const jobCount = (wf: string): number => {
  const jobs = wf.split(/^jobs:\n/m)[1] ?? '';
  return Array.from(jobs.matchAll(/^ {2}[\w-]+:\s*$/gm)).length;
};

describe('#776 workflows use GitHub environments for Supabase secrets', () => {
  describe.each(listed)('%s', (file) => {
    const wf = read(file);

    it('criterion 4: has job-level environment on every job', () => {
      const envs = jobEnvironments(wf);
      expect(envs.length).toBeGreaterThan(0);
      expect(envs.length).toBe(jobCount(wf));
    });

    it('criterion 4: references no UAT_ secret', () => {
      expect(wf).not.toMatch(/secrets\.UAT_/);
    });

    it('criterion 2: has no || fallback on Supabase secrets', () => {
      expect(wf).not.toMatch(
        /secrets\.(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)[^}]*\|\|/,
      );
      expect(wf).not.toMatch(
        /\|\|[^}]*secrets\.(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)/,
      );
    });

    it('criterion 2: reads Supabase URL and service role key from secrets', () => {
      expect(wf).toContain('${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
      expect(wf).toContain('${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    });
  });

  describe.each(withInput)('%s environment source', (file) => {
    it('criterion 1: job environment comes from the environment input', () => {
      for (const env of jobEnvironments(read(file))) {
        expect(env).toMatch(/^\$\{\{ inputs\.environment( \|\| '(production|uat)')? \}\}$/);
      }
    });
  });

  it('criterion 1: discover-halal keeps production as the default for scheduled runs', () => {
    const envs = jobEnvironments(read('discover-halal.yml'));
    expect(envs).toEqual(Array(envs.length).fill("${{ inputs.environment || 'production' }}"));
  });

  it.each(productionOnly)('criterion 1: %s uses the production environment', (file) => {
    const envs = jobEnvironments(read(file));
    expect(envs.length).toBeGreaterThan(0);
    for (const env of envs) expect(env).toBe('production');
  });

  it('criterion 3: dispatch workflows keep INPUT_* passed through env', () => {
    expect(read('screen-providers.yml')).toMatch(/INPUT_LIMIT: \$\{\{ inputs\.limit \}\}/);
    expect(read('backfill-location-coords.yml')).toMatch(/INPUT_LIMIT: \$\{\{ inputs\.limit \}\}/);
  });

  it('criterion 5: screen-providers still runs on both production and uat', () => {
    const wf = read('screen-providers.yml');
    expect(wf).toMatch(/default: 'uat'/);
    expect(wf).toMatch(/- uat\n\s+- production/);
    expect(wf).toContain('--dry-run');
  });
});
