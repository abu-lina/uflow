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

function scriptOutput(result: ReturnType<typeof runImport>) {
  const combined = `${result.stdout}\n${result.stderr}`;
  return combined
    .split('\n')
    .filter(
      (line) =>
        !line.startsWith('npm warn exec') &&
        !line.includes('Node.js 20 and below are deprecated')
    )
    .join('\n');
}

describe('import-muslimbusiness CLI', () => {
  it('rejects --limit without a positive integer value', () => {
    const result = runImport(['--dry-run', '--limit']);
    const output = scriptOutput(result);

    expect(result.status).not.toBe(0);
    expect(output).toContain(
      '--limit requires a positive integer (got: undefined)'
    );
  }, 15_000);

  it('accepts a positive --limit and reaches category loading', () => {
    const result = runImport(['--dry-run', '--limit', '3']);
    const output = scriptOutput(result);

    expect(output).toContain('Mode       : 🔍 DRY-RUN (no writes)');
    expect(output).toContain('Limit      : 3');
    expect(output).toContain('▶ Loading categories from Supabase...');
    expect(output).toContain('Failed to load categories');
  }, 15_000);
});