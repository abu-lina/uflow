import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const wf = readFileSync(
  resolve(process.cwd(), '.github/workflows/enrich-halal-compliance.yml'),
  'utf8',
);

describe('#861 quarterly halal re-screening schedule', () => {
  it('AC1: a cron fires quarterly (03:00 UTC on the 1st of every third month)', () => {
    expect(wf).toMatch(/^ {4}- cron: '0 3 1 \*\/3 \*'$/m);
  });

  it('AC1 routing: quarterly schedule passes --apply --force --limit 500', () => {
    expect(wf).toContain('github.event.schedule');
    expect(wf).toContain('--apply --force --limit 500');
  });

  it('AC1: the nightly schedule keeps --apply --limit 100 without --force', () => {
    expect(wf).toContain('--apply --limit 100');
    expect(wf).not.toMatch(/--apply --limit 100[^\n]*--force/);
  });

  it('AC4: the step summary reports processed and staged counts', () => {
    expect(wf).toContain('SUMMARY processed=');
    expect(wf).toContain('staged=');
  });
});
