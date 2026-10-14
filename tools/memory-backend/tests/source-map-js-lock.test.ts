import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Lockfile {
  packages: Record<string, { version?: string }>;
}

function compareVersions(left: number[], right: number[]): number {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

describe('source-map-js lockfile security', () => {
  it('keeps the root source-map-js override satisfied across every tracked lockfile', () => {
    const repoRoot = resolve(import.meta.dirname, '../../..');
    const { overrides } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
      overrides: Record<string, string>;
    };
    const minimum = /^\^?(\d+)\.(\d+)\.(\d+)$/.exec(overrides['source-map-js']);
    if (!minimum) throw new Error('source-map-js override must specify a simple minimum version');
    const minimumVersion = minimum.slice(1).map(Number);
    const lockfiles = execFileSync('git', ['ls-files', '-z', '*package-lock.json'], {
      cwd: repoRoot,
    })
      .toString()
      .split('\0')
      .filter(Boolean);

    let backendEntryFound = false;
    for (const lockfilePath of lockfiles) {
      const lockfile = JSON.parse(
        readFileSync(resolve(repoRoot, lockfilePath), 'utf8'),
      ) as Lockfile;
      const entries = Object.entries(lockfile.packages).filter(
        ([path]) =>
          path === 'node_modules/source-map-js' || path.endsWith('/node_modules/source-map-js'),
      );
      if (lockfilePath === 'tools/memory-backend/package-lock.json') {
        backendEntryFound = entries.length > 0;
      }
      for (const [path, entry] of entries) {
        if (!entry.version) throw new Error(`${lockfilePath}:${path} has no version`);
        const version = entry.version.split('.').map(Number);
        expect(version, `${lockfilePath}:${path} has a stable semantic version`).toHaveLength(3);
        expect(
          compareVersions(version, minimumVersion),
          `${lockfilePath}:${path} resolves ${entry.version}`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
    expect(backendEntryFound).toBe(true);
  });
});
