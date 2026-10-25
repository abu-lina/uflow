import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const wf = readFileSync(resolve(process.cwd(), '.github/workflows/screen-providers.yml'), 'utf8');

// Lines of every `run: |` block, to check nothing is interpolated into the shell.
const runLines = wf
  .split('\n')
  .filter(
    (l) =>
      /\$\{\{/.test(l) &&
      !/^\s*[A-Z_]+: \$\{\{/.test(l) &&
      !/^\s*(if|group|name|environment):/.test(l),
  );

describe('#763 screen-providers workflow', () => {
  it('is dispatch-only with environment, provider_id, limit and apply inputs', () => {
    expect(wf).toMatch(/^on:\n {2}workflow_dispatch:/m);
    for (const input of ['environment', 'provider_id', 'limit', 'apply']) {
      expect(wf).toMatch(new RegExp(`^ {6}${input}:`, 'm'));
    }
    expect(wf).toMatch(/default: 'uat'/);
  });

  it('passes inputs through env, never interpolated in the shell (criterion 5)', () => {
    expect(runLines).toEqual([]);
    expect(wf).toMatch(/INPUT_LIMIT: \$\{\{ inputs\.limit \}\}/);
  });

  it('takes Supabase secrets from the job environment, with no UAT_ prefix or fallback (#776)', () => {
    expect(wf).toMatch(/^ {4}environment: \$\{\{ inputs\.environment \}\}$/m);
    expect(wf).toContain('secrets.NEXT_PUBLIC_SUPABASE_URL');
    expect(wf).toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(wf).not.toMatch(/secrets\.UAT_/);
    expect(wf).not.toMatch(/secrets\.\w+ *\}\} *\|\|/);
    expect(wf).toContain('secrets.APIFY_API_TOKEN');
  });

  it('prevents overlapping runs and writes a step summary (criterion 7)', () => {
    expect(wf).toMatch(/concurrency:\n {2}group: screen-providers\n {2}cancel-in-progress: false/);
    expect(wf).toContain('GITHUB_STEP_SUMMARY');
    for (const label of [
      'Environment',
      'Mode',
      'Processed',
      'Flagged',
      'Review',
      'Clear',
      'Estimated Apify cost',
    ]) {
      expect(wf).toContain(label);
    }
  });
});
