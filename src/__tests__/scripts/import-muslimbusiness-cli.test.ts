// @vitest-environment node

import path from 'path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'import-muslimbusiness.ts');

function runImport(args: string[]) {
  return spawnSync('npx', ['tsx', scriptPath, ...args], {
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
    expect(result.stderr || result.stdout).toContain(
      '--limit requires a positive integer (got: undefined)'
    );
  }, 15_000);

  it('accepts a positive --limit and reaches category loading', () => {
    const result = runImport(['--dry-run', '--limit', '3']);
    const output = `${result.stdout}\n${result.stderr}`;

    expect(output).toContain('Mode       : 🔍 DRY-RUN (no writes)');
    expect(output).toContain('Limit      : 3');
    expect(output).toContain('▶ Loading categories from Supabase...');
    expect(output).toContain('Failed to load categories');
  });
});