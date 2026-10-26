import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type LockPackage = { version?: string };
type Lock = { packages: Record<string, LockPackage> };

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lock: Lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));

const parse = (v: string) => v.split('-')[0].split('.').map(Number);

function atLeast(actual: string, min: string): boolean {
  const a = parse(actual);
  const m = parse(min);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (m[i] ?? 0)) return (a[i] ?? 0) > (m[i] ?? 0);
  }
  return true;
}

function versionsOf(name: string): string[] {
  return Object.entries(lock.packages)
    .filter(([path]) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`))
    .map(([, p]) => p.version)
    .filter((v): v is string => Boolean(v));
}

describe('Dependabot alerts (#788)', () => {
  it('next and eslint-config-next are on 16.4.x, at least 16.4.1', () => {
    for (const name of ['next', 'eslint-config-next']) {
      const [installed] = versionsOf(name);
      expect(installed, name).toMatch(/^16\.4\./);
      expect(atLeast(installed, '16.4.1'), name).toBe(true);
    }
    expect(pkg.dependencies.next).toMatch(/^16\.4\./);
    expect(pkg.devDependencies['eslint-config-next']).toMatch(/^16\.4\./);
  });

  it('zod is at least 4.6.6', () => {
    expect(atLeast(lock.packages['node_modules/zod'].version!, '4.6.6')).toBe(true);
  });

  it('every undici 7.x copy is at least 7.30.1', () => {
    const sevens = versionsOf('undici').filter((v) => v.startsWith('7.'));
    expect(sevens.length).toBeGreaterThan(0);
    for (const v of sevens) expect(atLeast(v, '7.30.1'), v).toBe(true);
  });

  it('vite is at least 7.3.7 and every undici 6.x copy is at least 6.29.1', () => {
    for (const v of versionsOf('vite')) expect(atLeast(v, '7.3.7'), v).toBe(true);
    for (const v of versionsOf('undici').filter((x) => x.startsWith('6.'))) {
      expect(atLeast(v, '6.29.1'), v).toBe(true);
    }
  });

  it('overrides do not pin a version that conflicts with a direct dependency', () => {
    const direct = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, spec] of Object.entries<unknown>(pkg.overrides)) {
      if (typeof spec !== 'string' || !(name in direct)) continue;
      expect(spec, `override ${name}`).toBe(`$${name}`);
    }
    expect(pkg.overrides.esbuild ?? '>=0.28.1').toMatch(/^[>^~]/);
  });

  it('undici override allows at least 7.30.1', () => {
    expect(pkg.overrides.undici).toMatch(/^[>^~]?=?7\.(30\.[1-9]|[3-9]\d)/);
  });

  it('sharp stays at or above 0.35.5', () => {
    for (const v of versionsOf('sharp')) expect(atLeast(v, '0.35.5'), v).toBe(true);
  });
});
