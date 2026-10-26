import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnTestTimeoutMs } from './helpers/timeout';

const repoRoot = path.resolve(__dirname, '../..');
const guard = path.join(repoRoot, 'scripts/check-staged-size.sh');

function checkIgnore(p: string): number {
  return spawnSync('git', ['check-ignore', '-q', '--', p], { cwd: repoRoot }).status ?? -1;
}

describe('media ignore rules', { timeout: spawnTestTimeoutMs }, () => {
  it.each([
    'video/brand-video/public/audio/the-middle.mp3',
    'imports/The Middle (Nasheed Background) - Vocals Only Halal Beats Type #halaltrax - Halal Trax.mp3',
    'imports/m2-res_480p.mp4',
    'agent-output/artifacts/m2-res-contact-sheet.jpg',
    'video/a.mp4',
    'video/a.mov',
    'imports/a.wav',
    'imports/a.webm',
    'agent-output/artifacts/a.jpg',
  ])('ignores %s', (p) => {
    expect(checkIgnore(p)).toBe(0);
  });

  it.each([
    'agent-output/artifacts/run-1/output.log',
    'public/animations/new.json',
    'public/images/new.png',
    'imports/maps.svg',
    'agent-output/artifacts/a.png',
  ])('does not ignore %s', (p) => {
    expect(checkIgnore(p)).toBe(1);
  });

  it('does not ignore any tracked file beyond the one known today', () => {
    const out = execFileSync('git', ['ls-files', '-ci', '--exclude-standard'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    expect(out.trim().split('\n')).toEqual(['memories/repo/qa-plan-049-auth-flow-regression.md']);
  });
});

describe('pre-commit size guard', { timeout: spawnTestTimeoutMs }, () => {
  let dir: string;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  const run = () => spawnSync('bash', [guard], { cwd: dir, encoding: 'utf8' });
  const write = (name: string, mb: number) =>
    writeFileSync(path.join(dir, name), Buffer.alloc(Math.round(mb * 1024 * 1024), 'a'));

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'size-guard-'));
    git('init', '-q');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 't');
    git('config', 'commit.gpgsign', 'false');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('rejects a staged new 6 MB file and prints its path', () => {
    write('big.bin', 6);
    git('add', 'big.bin');
    const r = run();
    expect(r.status).not.toBe(0);
    expect(r.stdout + r.stderr).toContain('big.bin');
  });

  it('accepts a staged new 1 MB file', () => {
    write('small.bin', 1);
    git('add', 'small.bin');
    expect(run().status).toBe(0);
  });

  it('accepts a modified 6 MB file that is already committed', () => {
    write('big.json', 6);
    git('add', 'big.json');
    git('commit', '-q', '-m', 'init', '--no-verify');
    writeFileSync(path.join(dir, 'big.json'), Buffer.alloc(6 * 1024 * 1024 + 10, 'b'));
    git('add', 'big.json');
    expect(run().status).toBe(0);
  });
});
