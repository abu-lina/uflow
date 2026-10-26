import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const filesIn = (dir: string): string[] =>
  readdirSync(resolve(root, dir), { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(dir, e.name));

describe('#778 environment cleanup', () => {
  it('criterion 3: no committed perf test key in tests/performance or docs/performance', () => {
    const files = [...filesIn('tests/performance'), ...filesIn('docs/performance')];
    const offenders = files.filter((f) =>
      readFileSync(resolve(root, f), 'utf8').includes('perf-test-2024-uat'),
    );
    expect(offenders).toEqual([]);
  });

  it('criterion 3: perf scripts read TEST_API_KEY from the environment', () => {
    const cfg = readFileSync(resolve(root, 'tests/performance/k6.config.js'), 'utf8');
    expect(cfg).toMatch(/TEST_API_KEY[^\n]*__ENV\.TEST_API_KEY/);
  });

  it('criterion 4: environment and secret layout is documented', () => {
    const file = resolve(root, 'docs/deployment/ENVIRONMENTS_AND_SECRETS.md');
    expect(existsSync(file)).toBe(true);
    const doc = readFileSync(file, 'utf8');
    for (const name of [
      'GHCR_PAT',
      'HETZNER_HOST',
      'HETZNER_SSH_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TEST_API_KEY',
    ]) {
      expect(doc).toContain(name);
    }
    expect(doc).toMatch(/repo(sitory)?[- ]level/i);
    expect(doc).toMatch(/environment[- ]level/i);
  });

  it('criterion 2: enrich-provider route and its test are removed', () => {
    expect(existsSync(resolve(root, 'src/app/api/webhooks/enrich-provider'))).toBe(false);
  });

  it.each(['deploy-uat.yml', 'deploy-hetzner.yml'])(
    'criterion 2: %s no longer passes WEBHOOK_SECRET',
    (file) => {
      const wf = readFileSync(resolve(root, '.github/workflows', file), 'utf8');
      expect(wf).not.toContain('WEBHOOK_SECRET');
    },
  );
  it('criterion 3: requireTestApiKey throws when TEST_API_KEY is unset and returns it when set', async () => {
    vi.resetModules();
    vi.stubGlobal('__ENV', {});
    const unset = await import('../performance/k6.config.js');
    expect(() => unset.requireTestApiKey()).toThrow(/TEST_API_KEY/);
    vi.resetModules();
    vi.stubGlobal('__ENV', { TEST_API_KEY: 'abc' });
    const set = await import('../performance/k6.config.js');
    expect(set.requireTestApiKey()).toBe('abc');
    vi.unstubAllGlobals();
  });

  it.each(['auth-flow.js', 'realistic-load-test.js'])(
    'criterion 3: %s calls requireTestApiKey in setup()',
    (file) => {
      const src = readFileSync(resolve(root, 'tests/performance', file), 'utf8');
      expect(src).toMatch(/export function setup\(\)\s*\{[\s\S]*?requireTestApiKey\(\)/);
    },
  );

  it('criterion 4: documents TEST_API_KEY as uat only and the GHCR_PAT fallback', () => {
    const doc = readFileSync(resolve(root, 'docs/deployment/ENVIRONMENTS_AND_SECRETS.md'), 'utf8');
    expect(doc).toMatch(/TEST_API_KEY[^\n]*uat[- ]only|uat[- ]only[^\n]*TEST_API_KEY/i);
    expect(doc).toMatch(/falls back to `GITHUB_TOKEN`/);
  });

  it('criterion 3: perf docs reference no stale UAT_TEST_API_KEY or repository-secret wording', () => {
    for (const f of [
      'docs/performance/PERFORMANCE_TEST_SETUP_INSTRUCTIONS.md',
      'docs/performance/PERFORMANCE_TEST_NEXT_STEPS.md',
    ]) {
      const doc = readFileSync(resolve(root, f), 'utf8');
      expect(doc).not.toContain('UAT_TEST_API_KEY');
      expect(doc).not.toMatch(/New repository secret/);
      expect(doc).not.toMatch(/export TEST_API_KEY=\S+ [a-z]/);
    }
  });
});
