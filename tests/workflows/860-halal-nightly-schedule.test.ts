import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const wf = readFileSync(
  resolve(process.cwd(), '.github/workflows/enrich-halal-compliance.yml'),
  'utf8',
);

describe('#860 nightly halal compliance schedule', () => {
  it('A1: runs nightly at 02:00 UTC', () => {
    expect(wf).toMatch(/^ {2}schedule:\n(?: {4}#.*\n)* {4}- cron: '0 2 \* \* \*'/m);
  });

  it('A2: nightly runs use --apply --limit 100 and never --force', () => {
    expect(wf).toContain('github.event_name');
    expect(wf).toContain('--apply --limit 100');
    expect(wf).not.toMatch(/--apply --limit 100[^\n]*--force/);
  });

  it('A3: workflow_dispatch keeps mode, provider-id, limit and environment inputs', () => {
    expect(wf).toMatch(/^ {2}workflow_dispatch:/m);
    for (const input of ['mode', 'provider-id', 'limit', 'environment']) {
      expect(wf).toMatch(new RegExp(`^ {6}${input}:`, 'm'));
    }
  });

  it('A3b: scheduled runs target production when no environment input exists', () => {
    expect(wf).toMatch(/environment: \$\{\{ inputs\.environment \|\| 'production' \}\}/);
  });

  it('A4: summary reports processed count from the script output', () => {
    expect(wf).toContain('SUMMARY processed=');
  });
});
