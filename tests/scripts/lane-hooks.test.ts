import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');

const shellFunction = (name: string) => {
  const match = laneScript.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'));
  if (!match) throw new Error(`Could not find ${name} in scripts/lane.sh`);
  return match[0];
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();

const fixtures: string[] = [];

// Mirrors husky 9: a tracked .husky/pre-commit plus a git-ignored, generated .husky/_ dispatcher.
const createHuskyRepo = () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'lane-hooks-')));
  fixtures.push(fixture);
  const root = join(fixture, 'repo');
  mkdirSync(join(root, '.husky', '_'), { recursive: true });
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
  git(root, 'config', 'user.email', 'lane-test@example.com');
  git(root, 'config', 'user.name', 'Lane Test');
  git(root, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(root, '.gitignore'), '.worktrees/\n.husky/_\n');
  writeFileSync(join(root, '.husky', 'pre-commit'), 'touch "$MARKER_DIR/hook-ran"\n');
  writeFileSync(join(root, '.husky', '_', 'pre-commit'), '#!/bin/sh\n. "$(dirname "$0")/h"\n', {
    mode: 0o755,
  });
  writeFileSync(
    join(root, '.husky', '_', 'h'),
    '#!/bin/sh\ns=$(dirname "$(dirname "$0")")/$(basename "$0")\nsh -e "$s" "$@"\n',
  );
  git(root, 'add', '.gitignore', '.husky/pre-commit');
  git(root, 'commit', '-m', 'init');
  git(root, 'config', 'core.hooksPath', '.husky/_');
  return { fixture, root };
};

const runSetup = (root: string, dir: string) =>
  execFileSync(
    'bash',
    ['-c', `${shellFunction('_lane_setup_hooks')}\n_lane_setup_hooks "$1" "$2"`, 'bash', root, dir],
    { encoding: 'utf8' },
  );

const commitIn = (cwd: string, markerDir: string) => {
  writeFileSync(join(cwd, 'file.txt'), `${Math.random()}\n`);
  git(cwd, 'add', 'file.txt');
  execFileSync('git', ['-C', cwd, 'commit', '-m', 'change'], {
    env: { ...process.env, MARKER_DIR: markerDir },
    stdio: 'ignore',
  });
};

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

describe('lane worktree git hooks (#655)', () => {
  it('criterion 1: the pre-commit hook runs in a worktree after the lane setup step', () => {
    const { fixture, root } = createHuskyRepo();
    const dir = join(root, '.worktrees', '1-demo');
    git(root, 'worktree', 'add', '-b', 'fix/1-demo', dir);
    const markerDir = join(fixture, 'markers');
    mkdirSync(markerDir);

    runSetup(root, dir);
    commitIn(dir, markerDir);

    expect(existsSync(join(markerDir, 'hook-ran'))).toBe(true);
  });

  it('criterion 2: the main checkout keeps running hooks and keeps core.hooksPath', () => {
    const { fixture, root } = createHuskyRepo();
    const dir = join(root, '.worktrees', '1-demo');
    git(root, 'worktree', 'add', '-b', 'fix/1-demo', dir);
    const markerDir = join(fixture, 'markers');
    mkdirSync(markerDir);

    runSetup(root, dir);
    commitIn(root, markerDir);

    expect(existsSync(join(markerDir, 'hook-ran'))).toBe(true);
    expect(git(root, 'config', '--get', 'core.hooksPath')).toBe('.husky/_');
  });

  it('is called by lane after the worktree exists', () => {
    expect(shellFunction('lane')).toContain('_lane_setup_hooks "$root" "$dir"');
  });
});
