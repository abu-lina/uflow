import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const wf = readFileSync(
  resolve(process.cwd(), '.github/workflows/backfill-location-coords.yml'),
  'utf8',
);

// Steps are split by text because no YAML parser is a direct dependency.
const steps = new Map<string, string>();
for (const block of wf.split(/^ {6}- /m).slice(1)) {
  const name = block.match(/^name: (.+)$/m)?.[1];
  if (name) steps.set(name, block);
}
const step = (name: string): string => {
  const block = steps.get(name);
  if (!block) throw new Error(`step not found: ${name}`);
  return block;
};
const runScript = (name: string): string => {
  const lines = step(name).split('\n');
  const start = lines.findIndex((l) => /^ {8}run: \|$/.test(l));
  if (start < 0) return '';
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (l.trim() !== '' && !l.startsWith('          ')) break;
    out.push(l.slice(10));
  }
  return out.join('\n');
};
const envBlock = (name: string): string =>
  step(name).match(/^ {8}env:\n((?: {10}.+\n?)+)/m)?.[1] ?? '';

const tmp = mkdtempSync(join(tmpdir(), 'wf760-'));

function buildArgs(apply: string, limit: string) {
  const dir = mkdtempSync(join(tmp, 'a-'));
  const out = join(dir, 'output');
  writeFileSync(out, '');
  const r = spawnSync('bash', ['-c', runScript('Build CLI arguments')], {
    env: { ...process.env, INPUT_APPLY: apply, INPUT_LIMIT: limit, GITHUB_OUTPUT: out },
    encoding: 'utf8',
  });
  return { status: r.status, output: readFileSync(out, 'utf8') };
}

function runSummary(apply: string, limit: string, log: string | null) {
  const dir = mkdtempSync(join(tmp, 's-'));
  const summary = join(dir, 'summary.md');
  if (log !== null) writeFileSync(join(dir, 'backfill.log'), log);
  writeFileSync(summary, '');
  const r = spawnSync('bash', ['-c', runScript('Summary')], {
    env: {
      ...process.env,
      RUNNER_TEMP: dir,
      GITHUB_STEP_SUMMARY: summary,
      INPUT_ENVIRONMENT: 'uat',
      INPUT_APPLY: apply,
      INPUT_LIMIT: limit,
    },
    encoding: 'utf8',
  });
  return { status: r.status, summary: readFileSync(summary, 'utf8') };
}

const summarise = (apply: string, limit: string, log: string | null): string =>
  runSummary(apply, limit, log).summary;

describe('backfill-location-coords workflow (#760)', () => {
  it('finds every step the other tests rely on', () => {
    const names = [
      'Build CLI arguments',
      'Run backfill (UAT)',
      'Run backfill (Production)',
      'Summary',
    ];
    for (const name of names) expect(steps.has(name), name).toBe(true);
    for (const name of ['Build CLI arguments', 'Summary']) {
      expect(runScript(name).length, name).toBeGreaterThan(0);
    }
    expect(envBlock('Run backfill (UAT)')).not.toBe('');
    expect(envBlock('Run backfill (Production)')).not.toBe('');
  });

  it('criterion 1: triggers on workflow_dispatch only, with environment, apply and limit inputs', () => {
    expect(wf).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(wf).not.toMatch(/^ {2}(push|pull_request|schedule):/m);
    expect(wf).toMatch(/environment:[\s\S]*?default: 'uat'[\s\S]*?- uat\n\s+- production/);
    expect(wf).toMatch(/apply:[\s\S]*?default: false[\s\S]*?type: boolean/);
    expect(wf).toMatch(/limit:[\s\S]*?required: false/);
  });

  it('criterion 2: dry run by default, --apply when apply=true, --limit <n> when set', () => {
    expect(buildArgs('false', '')).toEqual({ status: 0, output: 'cli_args=\n' });
    expect(buildArgs('true', '')).toEqual({ status: 0, output: 'cli_args=--apply\n' });
    expect(buildArgs('false', '5')).toEqual({ status: 0, output: 'cli_args= --limit 5\n' });
    expect(buildArgs('true', '5')).toEqual({ status: 0, output: 'cli_args=--apply --limit 5\n' });
    expect(step('Run backfill (UAT)')).toContain('scripts/backfill-location-coords.ts $CLI_ARGS');
    expect(step('Run backfill (Production)')).toContain(
      'scripts/backfill-location-coords.ts $CLI_ARGS',
    );
  });

  it('criterion 3: each environment step uses only its own secrets, with no fallback', () => {
    const uat = envBlock('Run backfill (UAT)');
    const prod = envBlock('Run backfill (Production)');
    expect(uat).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.UAT_NEXT_PUBLIC_SUPABASE_URL }}');
    expect(uat).toContain(
      'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.UAT_SUPABASE_SERVICE_ROLE_KEY }}',
    );
    expect(prod).toContain('NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}');
    expect(prod).toContain('SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}');
    expect(uat).not.toMatch(/\|\|/);
    expect(prod).not.toMatch(/\|\|/);
    expect(uat).not.toMatch(/secrets\.(?!UAT_)/);
    expect(prod).not.toMatch(/secrets\.UAT_/);
    expect(step('Run backfill (UAT)')).toMatch(/if: inputs\.environment == 'uat'/);
    expect(step('Run backfill (Production)')).toMatch(/if: inputs\.environment == 'production'/);
  });

  it('criterion 4: rejects non-positive-integer limits before they reach the shell', () => {
    for (const bad of ['0', '-1', '1.5', '007', '5; rm -rf /']) {
      const r = buildArgs('true', bad);
      expect(r.status, bad).not.toBe(0);
      expect(r.output, bad).not.toContain('cli_args');
    }
    for (const name of Array.from(steps.keys())) expect(runScript(name), name).not.toContain('${{');
    expect(step('Build CLI arguments')).toMatch(/INPUT_LIMIT: \$\{\{ inputs\.limit \}\}/);
  });

  it('criterion 5: the summary reports environment, mode, limit and the script counts', () => {
    const log = [
      'Mode: DRY-RUN (no writes)',
      'OK    loc-1 — a -> 1, 2',
      'OK    provider p-2 — b -> 3, 4',
      'MISS  loc-3 — no geocode match: c',
      'SKIP  loc-4 — insufficient address: d',
      'WOULD loc-5 — e -> 5, 6',
      'FAIL  loc-6 — boom',
      'FAIL  provider p-7 — insert error: x',
      '',
    ].join('\n');
    const out = summarise('true', '5', log);
    expect(out).toContain('| Environment | uat |');
    expect(out).toContain('| Mode | apply |');
    expect(out).toContain('| Limit | 5 |');
    expect(out).toContain('| OK | 2 |');
    expect(out).toContain('| MISS | 1 |');
    expect(out).toContain('| SKIP | 1 |');
    expect(out).toContain('| WOULD | 1 |');
    expect(out).toContain('| FAIL | 2 |');
    expect(summarise('false', '', '')).toMatch(/\| Mode \| dry-run \|[\s\S]*\| Limit \| all \|/);
    expect(step('Summary')).toMatch(/if: always\(\)/);
  });

  it('criterion 5: fails the job when any location failed, passes when none did', () => {
    expect(runSummary('true', '', 'OK    loc-1 — a\nFAIL  loc-2 — boom\n').status).not.toBe(0);
    expect(runSummary('false', '', 'WOULD loc-1 — a\nMISS  loc-2 — b\n').status).toBe(0);
  });

  it('criterion 5: reports zero counts and "No log produced" when the log is missing', () => {
    const r = runSummary('false', '', null);
    expect(r.status).toBe(0);
    for (const k of ['OK', 'MISS', 'SKIP', 'WOULD', 'FAIL']) {
      expect(r.summary).toContain(`| ${k} | 0 |`);
    }
    expect(r.summary).toContain('No log produced');
  });

  it('criterion 6: sets a timeout and a non-cancelling concurrency group', () => {
    expect(wf).toMatch(/timeout-minutes: \d+/);
    expect(wf).toMatch(
      /concurrency:\n\s+group: backfill-location-coords\n\s+cancel-in-progress: false/,
    );
  });

  it('criterion 7: secrets appear only under env, never in a run block', () => {
    for (const name of Array.from(steps.keys()))
      expect(runScript(name), name).not.toMatch(/secrets\./);
    const secretLines = wf.split('\n').filter((l) => /secrets\./.test(l));
    expect(secretLines).toHaveLength(4);
    for (const l of secretLines) expect(l).toMatch(/^ {10}[A-Z_]+: \$\{\{ secrets\.[A-Z_]+ \}\}$/);
    expect(wf).not.toMatch(/echo .*(SERVICE_ROLE|SUPABASE_URL)/);
  });
});
