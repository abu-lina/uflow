import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type Step = { name?: string; run?: string; env?: Record<string, string> };
type Workflow = {
  on: { workflow_dispatch?: { inputs?: Record<string, { default?: unknown; type?: string }> } };
  jobs: Record<string, { environment?: unknown; steps?: Step[] }>;
};

const raw = readFileSync(
  path.resolve(process.cwd(), '.github/workflows/search-platform-delivery-links.yml'),
  'utf8',
);
const workflow = parse(raw) as Workflow;
const job = Object.values(workflow.jobs)[0];
const steps = job.steps ?? [];
const runStep = steps.find((s) => s.run?.includes('search-platform-delivery-links.ts'));

describe('search-platform-delivery-links workflow (#807)', () => {
  it('is manual only and defaults to a dry run', () => {
    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
    expect(workflow.on.workflow_dispatch?.inputs?.dry_run?.default).toBe(true);
  });

  it('runs in the production environment so the reviewer gate applies', () => {
    expect(job.environment).toBe('production');
  });

  it('installs Playwright Chromium for Lieferando and UberEats', () => {
    expect(steps.some((s) => s.run?.includes('playwright install chromium'))).toBe(true);
  });

  it('passes --apply only when dry_run is false', () => {
    expect(runStep).toBeDefined();
    expect(runStep?.run).toMatch(/--apply/);
    expect(runStep?.run).toMatch(/DRY_RUN.*=.*"?true"?/s);
  });

  it('passes user inputs through env, never inline in the shell script', () => {
    expect(runStep?.run).not.toMatch(/\$\{\{/);
    expect(runStep?.env?.DRY_RUN).toBeDefined();
  });

  it('gets Supabase credentials from secrets', () => {
    expect(runStep?.env?.NEXT_PUBLIC_SUPABASE_URL).toMatch(/secrets\./);
    expect(runStep?.env?.SUPABASE_SERVICE_ROLE_KEY).toMatch(/secrets\./);
  });
});
