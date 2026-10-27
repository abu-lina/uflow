import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Workflows that run against live Supabase with service-role access.
// Every job in these files that references secrets must declare an environment
// so that GitHub's required-reviewer gate on `production` applies.
const GUARDED_WORKFLOWS = ['backfill-location-coords.yml', 'backfill-enrichment.yml'];

type Step = Record<string, unknown>;
type Job = {
  environment?: unknown;
  env?: Record<string, unknown>;
  steps?: Step[];
};
type Workflow = { jobs: Record<string, Job> };

function containsSecretRef(value: unknown): boolean {
  if (typeof value === 'string') return /\$\{\{\s*secrets\./.test(value);
  if (Array.isArray(value)) return value.some(containsSecretRef);
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).some(containsSecretRef);
  return false;
}

describe('workflow environment gate', () => {
  for (const filename of GUARDED_WORKFLOWS) {
    describe(filename, () => {
      const workflowPath = path.resolve(process.cwd(), '.github/workflows', filename);
      const workflow = parse(readFileSync(workflowPath, 'utf8')) as Workflow;

      it('every job that references secrets has an environment key', () => {
        const violations: string[] = [];

        for (const [jobId, job] of Object.entries(workflow.jobs)) {
          const jobEnvUsesSecrets = containsSecretRef(job.env ?? {});
          const stepsUseSecrets = (job.steps ?? []).some((step) =>
            containsSecretRef(step.env ?? {}),
          );

          if ((jobEnvUsesSecrets || stepsUseSecrets) && job.environment == null) {
            violations.push(jobId);
          }
        }

        expect(violations, `jobs without environment key: ${violations.join(', ')}`).toHaveLength(
          0,
        );
      });
    });
  }
});
