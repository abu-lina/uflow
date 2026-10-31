import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = resolve(process.cwd(), '.github/workflows');
const read = (file: string): string => readFileSync(resolve(dir, file), 'utf8');

describe('#830 enrich-halal-compliance workflow', () => {
  const wf = existsSync(resolve(dir, 'enrich-halal-compliance.yml'))
    ? read('enrich-halal-compliance.yml')
    : '';

  it('A1: is workflow_dispatch with mode (dry-run default), provider-id and limit (50) inputs', () => {
    expect(wf).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(wf).toMatch(
      /^ {6}mode:[\s\S]*?default: 'dry-run'[\s\S]*?options:\n {10}- dry-run\n {10}- apply/m,
    );
    expect(wf).toMatch(/^ {6}provider-id:/m);
    expect(wf).toMatch(/^ {6}limit:[\s\S]*?default: '50'/m);
    expect(wf).toMatch(/^ {6}environment:[\s\S]*?default: 'production'/m);
  });

  it('A2: runs npx tsx scripts/enrich-halal-compliance.ts with the selected flags', () => {
    expect(wf).toContain('npx tsx scripts/enrich-halal-compliance.ts');
    expect(wf).toContain('--provider-id');
    expect(wf).toContain('--limit');
  });

  it('A3: takes APIFY_API_TOKEN and SUPABASE_SERVICE_ROLE_KEY from secrets via the job environment', () => {
    expect(wf).toMatch(/^ {4}environment: \$\{\{ inputs\.environment \}\}$/m);
    expect(wf).toContain('${{ secrets.APIFY_API_TOKEN }}');
    expect(wf).toContain('${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(wf).toContain('${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
  });

  it('A4: writes a step summary and uploads the log as an artifact', () => {
    expect(wf).toContain('GITHUB_STEP_SUMMARY');
    expect(wf).toContain('actions/upload-artifact');
  });

  it('A5: --dry-run is the default, --apply only when apply is selected, no input in shell', () => {
    expect(wf).toContain('--dry-run');
    expect(wf).toContain('--apply');
    expect(wf).toMatch(/INPUT_MODE: \$\{\{ inputs\.mode \}\}/);
    expect(wf).not.toMatch(/run: .*\$\{\{ inputs\./);
  });
});

describe('#830 deleted workflows', () => {
  it.each(['enrich-wolt.yml', 'enrich-one-provider.yml', 'uflow-dev-cycle.json'])(
    'B: %s is deleted',
    (file) => {
      expect(existsSync(resolve(dir, file))).toBe(false);
    },
  );
});

describe('#830 discover-halal.yml', () => {
  const wf = read('discover-halal.yml');

  it('C1: has no Lieferando discovery path', () => {
    expect(wf).not.toMatch(/lieferando/i);
  });

  it('C2: keeps the Wolt discovery job', () => {
    expect(wf).toContain('scripts/discover-wolt.ts');
  });
});

describe('#830 overlap review', () => {
  it('D1: enrich-food-providers.yml documents why both it and halal compliance are needed', () => {
    expect(read('enrich-food-providers.yml')).toMatch(/enrich-halal-compliance/);
  });

  it('D2: performance-test.yml k6 scripts exist and the review is documented', () => {
    expect(existsSync(resolve(process.cwd(), 'tests/performance/run-tests.sh'))).toBe(true);
    expect(read('performance-test.yml')).toMatch(/#830/);
  });
});
