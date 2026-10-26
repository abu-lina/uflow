import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (...parts: string[]): string => readFileSync(resolve(process.cwd(), ...parts), 'utf8');

const deploys = ['deploy-uat.yml', 'deploy-hetzner.yml'];

// A docker run command runs from "docker run" to the first line that doesn't end in a backslash.
const dockerRuns = (wf: string): string[] =>
  Array.from(wf.matchAll(/docker run[^\n]*\\\n(?:[^\n]*\\\n)*[^\n]*/g), (m) => m[0]);

const buildArgs = (wf: string): string => wf.match(/build-args: \|\n((?: {12}.+\n?)+)/)?.[1] ?? '';

describe('#785 VAPID push keys are wired into the Dockerfile and deploy workflows', () => {
  it('criterion 1: Dockerfile declares ARG and ENV for NEXT_PUBLIC_VAPID_PUBLIC_KEY in the build stage', () => {
    const builder = read('Dockerfile').split(/^FROM .* AS runner$/m)[0];
    expect(builder).toMatch(/^ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY$/m);
    expect(builder).toMatch(/^ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=\$NEXT_PUBLIC_VAPID_PUBLIC_KEY$/m);
  });

  describe.each(deploys)('%s', (file) => {
    const wf = read('.github/workflows', file);

    it('criterion 2: passes NEXT_PUBLIC_VAPID_PUBLIC_KEY as a build-arg from the environment secret', () => {
      expect(buildArgs(wf)).toContain(
        'NEXT_PUBLIC_VAPID_PUBLIC_KEY=${{ secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY }}',
      );
    });

    it('criterion 3: every docker run passes the three VAPID names with -e', () => {
      const runs = dockerRuns(wf);
      expect(runs.length).toBeGreaterThanOrEqual(2);
      for (const run of runs) {
        expect(run).toContain(
          '-e NEXT_PUBLIC_VAPID_PUBLIC_KEY="${{ secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY }}"',
        );
        expect(run).toContain('-e VAPID_PRIVATE_KEY="${{ secrets.VAPID_PRIVATE_KEY }}"');
        expect(run).toContain('-e VAPID_EMAIL="${{ secrets.VAPID_EMAIL }}"');
      }
    });

    it('criterion 4: VAPID_PRIVATE_KEY is not a build-arg', () => {
      expect(buildArgs(wf)).not.toMatch(/VAPID_PRIVATE_KEY/);
      expect(buildArgs(wf)).not.toMatch(/VAPID_EMAIL/);
    });

    it('criterion 4: VAPID_PRIVATE_KEY appears only as a docker run -e flag', () => {
      const lines = wf.split('\n').filter((l) => l.includes('VAPID_PRIVATE_KEY'));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.trim()).toBe('-e VAPID_PRIVATE_KEY="${{ secrets.VAPID_PRIVATE_KEY }}" \\');
      }
    });
  });

  it('criterion 4: the Dockerfile has no VAPID_PRIVATE_KEY, so it cannot land in an image layer', () => {
    expect(read('Dockerfile')).not.toMatch(/VAPID_PRIVATE_KEY/);
  });

  it('criterion 6: ENVIRONMENTS_AND_SECRETS.md lists the three names and marks build-time vs server-only', () => {
    const doc = read('docs/deployment/ENVIRONMENTS_AND_SECRETS.md');
    const row = (name: string): string =>
      doc.split('\n').find((l) => l.startsWith(`| \`${name}\``)) ?? '';
    expect(row('NEXT_PUBLIC_VAPID_PUBLIC_KEY')).toMatch(/build-time/i);
    expect(row('VAPID_PRIVATE_KEY')).toMatch(/server only/i);
    expect(row('VAPID_EMAIL')).not.toBe('');
  });

  describe.each(['env.local.template', 'env.production.template'])('criterion 7: %s', (file) => {
    it('lists the three VAPID names with empty values', () => {
      const tpl = read(file);
      for (const name of ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL']) {
        expect(tpl).toMatch(new RegExp(`^${name}=$`, 'm'));
      }
    });
  });
});
