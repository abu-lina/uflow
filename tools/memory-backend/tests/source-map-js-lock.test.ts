import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

interface Lockfile {
  packages: Record<string, { version?: string }>;
}

describe('source-map-js lockfile security', () => {
  it('keeps the root source-map-js override satisfied across every tracked lockfile', () => {
    const repoRoot = join(import.meta.dirname, '../../..');
    const { overrides } = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      overrides: Record<string, string>;
    };
    const minimum = /^\^?(\d+)\.(\d+)\.(\d+)$/.exec(overrides['source-map-js']);
    expect(minimum, 'source-map-js override uses a simple minimum version').not.toBeNull();
    const minimumVersion = minimum!.slice(1).map(Number);
    const lockfiles = execFileSync('git', ['ls-files', '-z', '*package-lock.json'], {
      cwd: repoRoot,
    })
      .toString()
      .split('\0')
      .filter(Boolean);

    let backendEntryFound = false;
    for (const lockfilePath of lockfiles) {
      const lockfile = JSON.parse(readFileSync(join(repoRoot, lockfilePath), 'utf8')) as Lockfile;
      const entries = Object.entries(lockfile.packages).filter(
        ([path]) =>
          path === 'node_modules/source-map-js' || path.endsWith('/node_modules/source-map-js'),
      );
      if (lockfilePath === 'tools/memory-backend/package-lock.json') {
        backendEntryFound = entries.length > 0;
      }
      for (const [path, entry] of entries) {
        const version = entry.version?.split('.').map(Number);
        expect(version, `${lockfilePath}:${path} has a stable semantic version`).toHaveLength(3);
        const meetsMinimum =
          version &&
          version.some(
            (part, index) =>
              part > minimumVersion[index] &&
              version.slice(0, index).every((previous, prefix) => previous === minimumVersion[prefix]),
          );
        const equalsMinimum = version?.every((part, index) => part === minimumVersion[index]);
        expect(meetsMinimum || equalsMinimum, `${lockfilePath}:${path} resolves ${entry.version}`).toBe(
          true,
        );
      }
    }
    expect(backendEntryFound).toBe(true);
  });
});
