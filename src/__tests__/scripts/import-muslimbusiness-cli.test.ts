// @vitest-environment node

import path from 'path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'import-muslimbusiness.ts');
// Use the locally installed tsx binary (devDependency) instead of npx to avoid
// CI environment issues with npx auto-install producing noise in stderr.
const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx');

function runImport(args: string[]) {
  return spawnSync(tsxBin, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy-service-role-key',
    },
  });
}

describe('import-muslimbusiness CLI', () => {
  it('rejects --limit without a positive integer value', () => {
    const result = runImport(['--dry-run', '--limit']);

    expect(result.status).not.toBe(0);
    // The script writes argument validation errors to stderr
    expect(result.stderr).toContain(
      '--limit requires a positive integer (got: undefined)'
    );
  }, 15_000);

  it('accepts a positive --limit and reaches category loading', () => {
    const result = runImport(['--dry-run', '--limit', '3']);

    // The script writes its DRY-RUN header and progress to stdout
    expect(result.stdout).toContain('Mode       : 🔍 DRY-RUN (no writes)');
    expect(result.stdout).toContain('Limit      : 3');
    expect(result.stdout).toContain('▶ Loading categories from Supabase...');
    // The Supabase connection failure is reported to stderr
    expect(result.stderr).toContain('Failed to load categories');
  }, 15_000);
});