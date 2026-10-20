import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const laneEntrypoint = new URL('../../../scripts/lane', import.meta.url).pathname;
export const laneSh = new URL('../../../scripts/lane.sh', import.meta.url).pathname;

export const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export const git = (root: string, ...args: string[]) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();

// A repo with one commit on main, pushed to a bare origin next to it.
export const createLaneRepo = (fixture: string) => {
  const root = join(fixture, 'repo');
  const remote = join(fixture, 'origin.git');
  mkdirSync(root);
  execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
  git(root, 'config', 'user.email', 'lane-test@example.com');
  git(root, 'config', 'user.name', 'Lane test');
  writeFileSync(join(root, 'README.md'), 'fixture\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-m', 'fixture');
  git(root, 'remote', 'add', 'origin', remote);
  execFileSync('git', ['-C', root, 'push', '-u', 'origin', 'main'], { stdio: 'ignore' });
  return { root, baseCommit: git(root, 'rev-parse', 'HEAD') };
};

// `gh issue develop` pushes main to the requested branch name in $REPO_ROOT's origin.
// With GH_CALLS set, every call is appended to that file.
export const ghStub = `#!/bin/sh
[ -n "$GH_CALLS" ] && printf '%s\\n' "$*" >> "$GH_CALLS"
case "$1 $2" in
  "issue view") printf '%s\\n' 'type:bugfix' ;;
  "issue develop")
    shift 2
    while [ "$#" -gt 0 ]; do
      if [ "$1" = --name ]; then branch="$2"; shift 2; else shift; fi
    done
    git -C "$REPO_ROOT" push -q origin "main:refs/heads/$branch"
    ;;
esac
`;

// Case body for a stub herdr: creates a real git worktree and returns a root pane.
export const herdrWorktreeCreateCase = `  "worktree create")
    shift 2
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --cwd) repo="$2"; shift 2 ;;
        --branch) branch="$2"; shift 2 ;;
        --base) base="$2"; shift 2 ;;
        --path) path="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    git -C "$repo" worktree add -b "$branch" "$path" "$base" >/dev/null || exit 1
    printf '%s\\n' '{"result":{"root_pane":{"pane_id":"pane-lane"}}}'
    ;;
`;

export const writeStub = (bin: string, name: string, body: string) => {
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, name), body, { mode: 0o755 });
};
