import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const file = resolve(process.cwd(), '.github/workflows/backfill-location-coords.yml');
const read = (): string => readFileSync(file, 'utf8');

describe('backfill-location-coords workflow (#760)', () => {
  it('triggers on workflow_dispatch only, with environment, apply and limit inputs', () => {
    const wf = read();
    expect(wf).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(wf).not.toMatch(/^ {2}(push|pull_request|schedule):/m);
    expect(wf).toMatch(/environment:[\s\S]*?default: 'uat'[\s\S]*?- uat\n\s+- production/);
    expect(wf).toMatch(/apply:[\s\S]*?type: boolean[\s\S]*?default: false/);
    expect(wf).toMatch(/limit:[\s\S]*?required: false/);
  });

  it('runs a dry run by default, adds --apply when apply=true and --limit <n> when set', () => {
    const wf = read();
    expect(wf).toContain('scripts/backfill-location-coords.ts');
    expect(wf).toContain('--apply');
    expect(wf).toMatch(/--limit/);
    expect(wf).toMatch(/INPUT_APPLY/);
  });

  it('uses UAT secrets without production fallback and production secrets for production', () => {
    const wf = read();
    expect(wf).toContain('secrets.UAT_NEXT_PUBLIC_SUPABASE_URL');
    expect(wf).toContain('secrets.UAT_SUPABASE_SERVICE_ROLE_KEY');
    expect(wf).not.toMatch(/UAT_[A-Z_]+ \|\|/);
    expect(wf).toContain('secrets.NEXT_PUBLIC_SUPABASE_URL');
    expect(wf).toContain('secrets.SUPABASE_SERVICE_ROLE_KEY');
    expect(wf).not.toMatch(/\|\| *secrets\./);
  });

  it('validates limit as a positive integer and passes it via env, not shell interpolation', () => {
    const wf = read();
    expect(wf).toMatch(/INPUT_LIMIT: \$\{\{ inputs\.limit \}\}/);
    expect(wf).toMatch(/\^\[1-9\]\[0-9\]\*\$/);
    const run = wf.split('\n').filter((l) => !/^\s+[A-Z_]+: \$\{\{/.test(l));
    const interpolated = run.filter((l) => /\$\{\{ *inputs\.(limit|apply)/.test(l));
    expect(interpolated.filter((l) => !/^\s*(name|if|group):/.test(l))).toEqual([]);
  });

  it('writes a step summary with environment, mode, limit and OK/MISS/SKIP counts', () => {
    const wf = read();
    expect(wf).toContain('GITHUB_STEP_SUMMARY');
    expect(wf).toMatch(/Environment/);
    expect(wf).toMatch(/Mode/);
    expect(wf).toMatch(/Limit/);
    for (const k of ['OK', 'MISS', 'SKIP']) expect(wf).toContain(k);
    expect(wf).toMatch(/if: always\(\)/);
  });

  it('sets a timeout and a non-cancelling concurrency group', () => {
    const wf = read();
    expect(wf).toMatch(/timeout-minutes: \d+/);
    expect(wf).toMatch(
      /concurrency:\n\s+group: backfill-location-coords\n\s+cancel-in-progress: false/,
    );
  });
});
