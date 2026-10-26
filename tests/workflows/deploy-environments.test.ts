import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), '.github/workflows', file), 'utf8');

const deploys = [
  { file: 'deploy-uat.yml', environment: 'uat' },
  { file: 'deploy-hetzner.yml', environment: 'production' },
];

// Job-level keys sit at 4 spaces.
const jobEnvironments = (wf: string): string[] =>
  Array.from(wf.matchAll(/^ {4}environment: (.+)$/gm), (m) => m[1].trim());
const jobCount = (wf: string): number => {
  const jobs = wf.split(/^jobs:\n/m)[1] ?? '';
  return Array.from(jobs.matchAll(/^ {2}[\w-]+:\s*$/gm)).length;
};

describe('#777 deploy workflows use GitHub environments', () => {
  describe.each(deploys)('$file', ({ file, environment }) => {
    const wf = read(file);

    it(`criterion 1: every job sets environment: ${environment}`, () => {
      const envs = jobEnvironments(wf);
      expect(envs.length).toBeGreaterThan(0);
      expect(envs.length).toBe(jobCount(wf));
      for (const env of envs) expect(env).toBe(environment);
    });

    it('criterion 2: references no UAT_ secret', () => {
      expect(wf).not.toMatch(/secrets\.UAT_/);
    });

    it('criterion 2: has no || fallback on any secret', () => {
      expect(wf).not.toMatch(/secrets\.[A-Z_]+[^}\n]*\|\|/);
      expect(wf).not.toMatch(/\|\|[^}\n]*secrets\.[A-Z_]+/);
    });

    it('criterion 3: GHCR_PAT, HETZNER_HOST and HETZNER_SSH_KEY stay repo-level secrets', () => {
      for (const name of ['GHCR_PAT', 'HETZNER_HOST', 'HETZNER_SSH_KEY']) {
        expect(wf).toContain(`secrets.${name}`);
      }
    });

    it('criterion 4: does not carry over NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED', () => {
      expect(wf).not.toMatch(/ISAPPLAUNCHED/i);
    });

    it('criterion 7: keeps the APP_ENV line from #772', () => {
      expect(wf).toContain(`-e APP_ENV=${environment} `);
    });
  });

  it('criterion 2: uat reads every app secret under its plain name', () => {
    const wf = read('deploy-uat.yml');
    for (const name of [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'TURNSTILE_SECRET_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
      'TEST_API_KEY',
      'ADMIN_DEBUG_KEY',
      'MISTRAL_API_KEY',
    ]) {
      expect(wf).toContain(`secrets.${name}`);
    }
  });

  it('criterion 5: production deploy keeps its workflow_dispatch trigger', () => {
    const wf = read('deploy-hetzner.yml');
    expect(wf).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(wf).not.toMatch(/^ {2}push:/m);
  });

  it('criterion 5: uat deploy keeps its push-to-main and dispatch triggers', () => {
    const wf = read('deploy-uat.yml');
    expect(wf).toMatch(/^ {2}push:\n {4}branches: \[main\]/m);
    expect(wf).toMatch(/^ {2}workflow_dispatch:/m);
  });
});
