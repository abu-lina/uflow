import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Lockfile {
  packages: Record<string, { version?: string }>;
}

describe('source-map-js lockfile security', () => {
  it('resolves every entry to version 1.2.2 or later', () => {
    const lockfile = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package-lock.json'), 'utf8'),
    ) as Lockfile;
    const entries = Object.entries(lockfile.packages).filter(
      ([path]) => path === 'node_modules/source-map-js' || path.endsWith('/node_modules/source-map-js'),
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const [path, entry] of entries) {
      const version = entry.version?.split('.').map(Number);
      expect(version, `${path} has a stable semantic version`).toHaveLength(3);
      expect(
        version && (version[0] > 1 || (version[0] === 1 && (version[1] > 2 || (version[1] === 2 && version[2] >= 2)))),
        `${path} resolves ${entry.version}`,
      ).toBe(true);
    }
  });
});
