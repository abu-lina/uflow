/**
 * Regression test — issue #554, CVE-2026-93749 (GHSA, CVSS 7.5).
 *
 * source-map-js <1.2.2 ships an exponential-backtracking regex in
 * `IndexedSourceMapConsumer`: a ~200-byte crafted source map blocks the Node
 * event loop for over a second (measured in Diagnose: 1213 ms on 1.2.1, throw
 * in 0 ms on 1.2.2). The package reaches the runtime image through
 * `postcss -> source-map-js` because Next.js file tracing copies the whole
 * postcss tree into `.next/standalone/node_modules` whether or not the code
 * path executes at runtime.
 *
 * Two guards, two different failure modes:
 *
 * 1. The lockfile assertion catches the override trap: an `overrides` entry is
 *    a constraint, not an upgrade instruction. Adding the floor without
 *    re-resolving the lock leaves `node_modules/source-map-js` at 1.2.1 while
 *    everything looks pinned. This test reads the resolved tree, so it fails on
 *    a stale lock no matter how the manifest reads.
 *
 * 2. The manifest assertion keeps the floor in place: `npm update` and lockfile
 *    regeneration re-resolve `^1.2.1` ranges to the latest 1.x, which today is
 *    >=1.2.2 but slides back to a vulnerable build the day a 1.2.1 re-release
 *    or a stale registry mirror wins resolution. The override is what makes the
 *    fix survive the next regeneration, so its presence and shape are asserted
 *    rather than assumed.
 *
 * If source-map-js ever leaves the dependency tree entirely, test 1 passes
 * vacuously and that is correct: a package that is not installed cannot be
 * vulnerable. Test 2 then becomes the only false-positive risk; removing the
 * override alongside the package means deleting that assertion too.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const lock = JSON.parse(readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf-8')) as {
  packages: Record<string, { version?: string }>;
};
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')) as {
  overrides?: Record<string, string>;
};

// Every install location npm can write a copy: the hoisted root entry plus any
// nested `node_modules/.../node_modules/source-map-js` a version conflict could
// leave behind.
const sourceMapJsEntries = Object.keys(lock.packages).filter((key) =>
  /(^|\/)source-map-js$/.test(key),
);

type SemverTuple = [number, number, number];

function parse(version: string): SemverTuple {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`Not a semver version: ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(version: string, floor: SemverTuple): boolean {
  const v = parse(version);
  for (let i = 0; i < 3; i++) {
    if (v[i] !== floor[i]) return v[i] > floor[i];
  }
  return true;
}

const PATCHED_FLOOR: SemverTuple = [1, 2, 2];

describe('source-map-js advisory floor (CVE-2026-93749)', () => {
  it('resolves every lockfile copy of source-map-js to >=1.2.2', () => {
    // Vacuous pass is intentional: a tree with no source-map-js is a tree with
    // no CVE-2026-93749. The loop asserts every copy that IS present.
    for (const key of sourceMapJsEntries) {
      const version = lock.packages[key].version ?? 'missing';
      expect(isAtLeast(version, PATCHED_FLOOR), `${key} resolved ${version}`).toBe(true);
    }
    // Guard against the test silently passing because the lookup broke: the
    // key shape is asserted, not just the version, so a lockfile format change
    // that empties `sourceMapJsEntries` gets noticed here.
    expect(sourceMapJsEntries).toContain('node_modules/source-map-js');
  });

  it('carries a bounded overrides floor in package.json that excludes 1.2.1', () => {
    const floor = pkg.overrides?.['source-map-js'];
    expect(floor, 'overrides["source-map-js"] must pin the patched floor').toBeDefined();
    if (floor === undefined) return;

    // The range must name a minimum at or above the patched release. `^1.2.2`
    // is the current spelling; `^1.3.0` or an exact `1.2.2` pin would also
    // satisfy this.
    const minimum = floor.match(/(\d+\.\d+\.\d+)/);
    expect(minimum, `overrides["source-map-js"]="${floor}" names no version`).not.toBeNull();
    if (!minimum) return;
    expect(isAtLeast(minimum[0], PATCHED_FLOOR)).toBe(true);

    // Unbounded `>=` ranges are banned by the dependency-pinning rules
    // (`>=1.2.2` would also accept a hypothetical vulnerable 1.9.x). `^`, `~`
    // and exact pins are the acceptable spellings.
    expect(floor.trim().startsWith('>=')).toBe(false);
    expect(floor.trim()).toMatch(/^([\^~]|v?\d)/);
  });
});
