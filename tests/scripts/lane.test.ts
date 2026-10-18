import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');
const laneEntrypoint = new URL('../../scripts/lane', import.meta.url).pathname;
const ciWorkflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');
const setupDecisions = readFileSync(
  new URL('../../docs/agents/setup-decisions.md', import.meta.url),
  'utf8',
);

const shellFunction = (name: string) => {
  const match = laneScript.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'));
  if (!match) throw new Error(`Could not find ${name} in scripts/lane.sh`);
  return match[0];
};

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const herdrFixtureDir = new URL('../fixtures/herdr/', import.meta.url).pathname;
const herdrFixture = (name: string) => readFileSync(join(herdrFixtureDir, name), 'utf8');

const ciBuildPlaceholder = (key: string) => {
  const match = ciWorkflow.match(
    new RegExp(`echo "${key}=\\$\\{${key}:-([^}]+)\\}" >> \\$GITHUB_ENV`),
  );
  if (!match) throw new Error(`Could not find ${key} CI build placeholder`);
  return match[1];
};

const filesUnder = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : entry.isFile() ? [path] : [];
  });

const createLintStubs = (fixture: string) => {
  const bin = join(fixture, 'bin');
  const log = join(fixture, 'lint.log');
  mkdirSync(bin);
  for (const tool of ['bash', 'zsh', 'shellcheck']) {
    writeFileSync(
      join(bin, tool),
      `#!/bin/sh
printf '%s' "\${0##*/}" >> "$LINT_LOG"
for arg do printf '\\t%s' "$arg" >> "$LINT_LOG"; done
printf '\\n' >> "$LINT_LOG"
`,
      { mode: 0o755 },
    );
  }
  return { bin, log };
};

const git = (root: string, ...args: string[]) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();

const createLaneRepo = (fixture: string) => {
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

const startCopilotLane = (fixture: string, rootEnv = '', prepareRoot?: (root: string) => void) => {
  const bin = join(fixture, 'bin');
  const herdrLog = join(fixture, 'herdr.log');
  const { root } = createLaneRepo(fixture);
  mkdirSync(bin);
  if (rootEnv) writeFileSync(join(root, '.env.local'), rootEnv);
  prepareRoot?.(root);
  writeFileSync(
    join(bin, 'gh'),
    `#!/bin/sh
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
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, 'herdr'),
    `#!/bin/sh
case "$1 $2" in
  "worktree create")
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
  "agent start")
    printf '%s\\n' 'agent start' >> "$HERDR_LOG"
    shift 2
    for arg do printf '%s\\n' "$arg" >> "$HERDR_LOG"; done
    ;;
  "agent prompt") printf '%s\\n' 'agent prompt' >> "$HERDR_LOG" ;;
esac
`,
    { mode: 0o755 },
  );
  const result = spawnSync('bash', [laneEntrypoint, 'start', '640', 'placeholder-test'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: herdrLog,
      REPO_ROOT: root,
    },
  });
  return { root, herdrLog, result };
};

describe('lane shell helpers', () => {
  it('runs lane status from a non-interactive shell without loading shell startup files', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-entrypoint-'));
    const bin = join(fixture, 'bin');
    const herdrLog = join(fixture, 'herdr.log');
    try {
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
printf "%s\\n" "$*" >> "$HERDR_LOG"
case "$1 $2" in
  "agent list"|"workspace list") printf '%s\\n' '{"result":{}}' ;;
esac
`,
        { mode: 0o755 },
      );
      writeFileSync(join(bin, 'jq'), '#!/bin/sh\ncat >/dev/null\n', { mode: 0o755 });

      const result = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} status`], {
        cwd: new URL('../..', import.meta.url).pathname,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HERDR_LOG: herdrLog },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('AGENT\tSTATUS\tWORKSPACE LABEL\tBRANCH');
      expect(readFileSync(herdrLog, 'utf8')).toContain('agent list');
      expect(readFileSync(herdrLog, 'utf8')).toContain('workspace list');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('resolves the helper for absolute, relative, and symlink invocations from a nested repo directory', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-entrypoint-link-'));
    const bin = join(fixture, 'bin');
    const link = join(fixture, 'lane');
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const nestedDirectory = join(repoRoot, 'docs', 'agents');
    try {
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
case "$1 $2" in
  "agent list"|"workspace list") printf '%s\\n' '{"result":{}}' ;;
esac
`,
        { mode: 0o755 },
      );
      writeFileSync(join(bin, 'jq'), '#!/bin/sh\ncat >/dev/null\n', { mode: 0o755 });
      symlinkSync(laneEntrypoint, link);

      const invocations = [
        [laneEntrypoint, nestedDirectory],
        ['../../scripts/lane', nestedDirectory],
        [link, nestedDirectory],
      ];
      for (const [path, cwd] of invocations) {
        const result = spawnSync('zsh', ['-c', `${shellQuote(path)} status`], {
          cwd,
          encoding: 'utf8',
          env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        });
        expect(result.status, `${path}: ${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('AGENT\tSTATUS\tWORKSPACE LABEL\tBRANCH');
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('prints usage for missing and unknown subcommands', () => {
    for (const command of ['', 'bogus']) {
      const result = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} ${command}`], {
        encoding: 'utf8',
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('status');
      expect(result.stderr).toContain('start');
      expect(result.stderr).toContain('done');
    }
  });

  it('returns the dispatched helper exit code for success and failure', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-entrypoint-exit-'));
    const bin = join(fixture, 'bin');
    try {
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
case "$1 $2" in
  "agent list"|"workspace list") printf '%s\\n' '{"result":{}}' ;;
esac
`,
        { mode: 0o755 },
      );
      writeFileSync(join(bin, 'jq'), '#!/bin/sh\ncat >/dev/null\n', { mode: 0o755 });

      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const successful = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} status`], {
        cwd: new URL('../..', import.meta.url).pathname,
        encoding: 'utf8',
        env,
      });
      const startMissingIssue = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} start`], {
        encoding: 'utf8',
        env,
      });
      const failed = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} done`], {
        encoding: 'utf8',
        env,
      });

      expect(successful.status).toBe(0);
      expect(startMissingIssue.status).toBe(1);
      expect(startMissingIssue.stderr).toContain('usage: lane <issue>');
      expect(failed.status).toBe(1);
      expect(failed.stderr).toContain('usage: lane_done');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('rejects zsh special-variable bindings in shell fixtures', () => {
    const fixtures = [
      { file: 'local-path.sh', line: 2, variable: 'path' },
      { file: 'local-array-fpath.sh', line: 2, variable: 'fpath' },
      { file: 'typeset-cdpath.sh', line: 2, variable: 'cdpath' },
      { file: 'declare-manpath.sh', line: 2, variable: 'manpath' },
      { file: 'readonly-status.sh', line: 2, variable: 'status' },
      { file: 'read-path.sh', line: 2, variable: 'path' },
      { file: 'ifs-read-status.sh', line: 2, variable: 'status' },
      { file: 'for-path.sh', line: 2, variable: 'path' },
      { file: 'assignment-path.sh', line: 2, variable: 'path' },
      { file: 'assignment-status.sh', line: 2, variable: 'status' },
    ];
    const root = new URL('../..', import.meta.url).pathname;

    for (const { file, line, variable } of fixtures) {
      const fixture = join(root, 'tests/fixtures/shell', file);
      const result = spawnSync('npm', ['run', 'lint:shell', '--', fixture], {
        cwd: root,
        encoding: 'utf8',
      });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.status, file).not.toBe(0);
      expect(output, file).toContain(`${fixture}:${line}`);
      expect(output, file).toContain(variable);
      expect(output, file).toContain('zsh special parameter');
    }

    const cleanFixture = join(root, 'tests/fixtures/shell/clean.sh');
    const cleanResult = spawnSync('npm', ['run', 'lint:shell', '--', cleanFixture], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(cleanResult.status, cleanFixture).toBe(0);
  }, 30_000);

  it('criterion 1: runs all shell checks on defaults and only requested files', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lint-shell-criterion-1-'));
    const { bin, log } = createLintStubs(fixture);
    const root = new URL('../..', import.meta.url).pathname;
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, LINT_LOG: log };

    try {
      const defaults = spawnSync('npm', ['run', 'lint:shell'], {
        cwd: root,
        encoding: 'utf8',
        env,
      });
      expect(defaults.status).toBe(0);
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
        `bash\t-n\t${join(root, 'scripts/lane.sh')}`,
        `zsh\t-n\t${join(root, 'scripts/lane.sh')}`,
        `shellcheck\t--shell=bash\t-x\t${join(root, 'scripts/lane.sh')}`,
        `bash\t-n\t${join(root, 'scripts/lane')}`,
        `zsh\t-n\t${join(root, 'scripts/lane')}`,
        `shellcheck\t--shell=bash\t-x\t${join(root, 'scripts/lane')}`,
      ]);

      writeFileSync(log, '');
      const specialFixture = join(root, 'tests/fixtures/shell/assignment-path.sh');
      const selected = spawnSync('npm', ['run', 'lint:shell', '--', specialFixture], {
        cwd: root,
        encoding: 'utf8',
        env,
      });
      expect(selected.status).not.toBe(0);
      expect(`${selected.stdout}${selected.stderr}`).toContain('zsh special parameter');
      expect(readFileSync(log, 'utf8').trim().split('\n')).toEqual([
        `bash\t-n\t${specialFixture}`,
        `zsh\t-n\t${specialFixture}`,
        `shellcheck\t--shell=bash\t-x\t${specialFixture}`,
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }, 30_000);

  it('follows ShellCheck sources when linting scripts/lane alone', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lint-shell-source-'));
    const { bin, log } = createLintStubs(fixture);
    const root = new URL('../..', import.meta.url).pathname;

    try {
      const result = spawnSync('npm', ['run', 'lint:shell', '--', 'scripts/lane'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LINT_LOG: log },
      });
      expect(result.status).toBe(0);
      expect(readFileSync(log, 'utf8')).toContain(
        `shellcheck\t--shell=bash\t-x\t${join(root, 'scripts/lane')}`,
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('preserves zsh variables and status output when listing stale workspaces', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-status-path-'));
    const bin = join(fixture, 'bin');
    const existingPath = join(fixture, 'existing-checkout');
    const missingPath = join(fixture, 'missing-checkout');
    const pathBefore = join(fixture, 'path-before');
    const pathAfter = join(fixture, 'path-after');
    const jqPath = join(fixture, 'jq-path');
    const variableDeclarations = join(fixture, 'variables');
    const workspaceJson = JSON.stringify({
      result: {
        workspaces: [
          {
            workspace_id: 'workspace-existing',
            label: 'Existing',
            worktree: { checkout_path: existingPath },
          },
          {
            workspace_id: 'workspace-missing',
            label: 'Missing',
            worktree: { checkout_path: missingPath },
          },
          { workspace_id: 'workspace-no-path', label: 'No path', worktree: {} },
        ],
      },
    });
    try {
      mkdirSync(bin);
      mkdirSync(existingPath);
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
case "$1 $2" in
  "agent list") printf '%s\\n' '{"result":{"agents":[]}}' ;;
  "workspace list") printf '%s\\n' ${shellQuote(workspaceJson)} ;;
esac
`,
        { mode: 0o755 },
      );

      const env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        PATH_BEFORE: pathBefore,
        PATH_AFTER: pathAfter,
        JQ_PATH: jqPath,
        VARIABLE_DECLARATIONS: variableDeclarations,
      };
      const zsh = spawnSync(
        'zsh',
        [
          '-f',
          '-c',
          `source ${shellQuote(new URL('../../scripts/lane.sh', import.meta.url).pathname)}
printf '%s\\n' "$PATH" > "$PATH_BEFORE"
jq_before="$(command -v jq)"
lane_status
printf '%s\\n' "$PATH" > "$PATH_AFTER"
printf '%s\\n%s\\n' "$jq_before" "$(command -v jq)" > "$JQ_PATH"
typeset -p workspace_id label path > "$VARIABLE_DECLARATIONS" 2>&1 || true`,
        ],
        { cwd: new URL('../..', import.meta.url).pathname, encoding: 'utf8', env },
      );
      const bash = spawnSync('bash', [laneEntrypoint, 'status'], {
        cwd: new URL('../..', import.meta.url).pathname,
        encoding: 'utf8',
        env,
      });

      const expectedOutput =
        `AGENT\tSTATUS\tWORKSPACE LABEL\tBRANCH\n` +
        `No lanes open.\n` +
        `STALE WORKSPACE\tworkspace-missing\tMissing\tcheckout path does not exist: ${missingPath}\n`;
      expect(zsh.status).toBe(0);
      expect(bash.status).toBe(0);
      expect(zsh.stdout).toBe(expectedOutput);
      expect(bash.stdout).toBe(expectedOutput);
      expect(readFileSync(pathAfter, 'utf8')).toBe(readFileSync(pathBefore, 'utf8'));
      const jqPaths = readFileSync(jqPath, 'utf8').trimEnd().split('\n');
      expect(jqPaths).toHaveLength(2);
      expect(jqPaths[0]).not.toBe('');
      expect(jqPaths[1]).toBe(jqPaths[0]);
      const declarations = readFileSync(variableDeclarations, 'utf8');
      expect(declarations).toContain('no such variable: workspace_id');
      expect(declarations).toContain('no such variable: label');
      expect(declarations).toContain('typeset -aT PATH path=');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('keeps external commands available in zsh while resolving a workspace id', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-zsh-'));
    try {
      writeFileSync(join(fixture, 'jq'), '#!/bin/sh\nprintf "workspace-636\\n"\n', { mode: 0o755 });
      const output = execFileSync(
        'zsh',
        ['-c', `${shellFunction('_herdr_workspace_id')}\n_herdr_workspace_id '{}' '/tmp/checkout'`],
        { encoding: 'utf8', env: { ...process.env, PATH: `${fixture}:/usr/bin:/bin` } },
      );
      expect(output.trim()).toBe('workspace-636');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('removes ignored build output and closes a failed Herdr worktree removal', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-cleanup-'));
    const root = join(fixture, 'repo');
    const worktree = join(root, '.worktrees', '636-fixture');
    const bin = join(fixture, 'bin');
    const herdrState = join(fixture, 'herdr-closed');
    const herdrLog = join(fixture, 'herdr.log');
    try {
      mkdirSync(root);
      mkdirSync(bin);
      execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
      execFileSync('git', ['-C', root, 'config', 'user.email', 'lane-test@example.com']);
      execFileSync('git', ['-C', root, 'config', 'user.name', 'Lane test']);
      writeFileSync(join(root, '.gitignore'), '.next/\nnode_modules/\n');
      writeFileSync(join(root, 'README.md'), 'fixture\n');
      execFileSync('git', ['-C', root, 'add', '.gitignore', 'README.md']);
      execFileSync('git', ['-C', root, 'commit', '-m', 'fixture'], { stdio: 'ignore' });
      mkdirSync(join(root, '.worktrees'));
      execFileSync(
        'git',
        ['-C', root, 'worktree', 'add', '-b', 'fix/636-fixture', worktree, 'HEAD'],
        {
          stdio: 'ignore',
        },
      );
      mkdirSync(join(worktree, '.next'));
      mkdirSync(join(worktree, 'node_modules'));
      writeFileSync(join(worktree, '.next', 'build-output'), 'ignored\n');
      writeFileSync(join(worktree, 'node_modules', 'dependency'), 'ignored\n');
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_LOG"
case "$1 $2" in
  "workspace list")
    if [ -f "$HERDR_STATE" ]; then
      printf '{"result":{"workspaces":[]}}\\n'
    else
      printf '{"result":{"workspaces":[{"workspace_id":"workspace-636","worktree":{"checkout_path":"%s"}}]}}\\n' "$LANE_WORKTREE"
    fi
    ;;
  "worktree remove") exit 1 ;;
  "workspace close") : > "$HERDR_STATE" ;;
esac
`,
        { mode: 0o755 },
      );
      writeFileSync(join(bin, 'jq'), '#!/bin/sh\nprintf "workspace-636\\n"\n', { mode: 0o755 });

      const script = [
        shellFunction('_lane_root'),
        shellFunction('_lane_dir'),
        shellFunction('_lane_port'),
        shellFunction('_herdr_workspace_id'),
        shellFunction('lane_done'),
        'lane_done 636 --force 2>&1',
        'herdr workspace list',
      ].join('\n');
      const output = execFileSync('bash', ['-c', script], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          HERDR_LOG: herdrLog,
          HERDR_STATE: herdrState,
          LANE_WORKTREE: worktree,
        },
      });

      expect(readFileSync(herdrLog, 'utf8')).toContain('workspace close workspace-636');
      expect(output).toMatch(
        /Herdr could not remove .*; closing its workspace and completing local cleanup/,
      );
      expect(output).toContain('lane #636 removed');
      expect(JSON.parse(output.trim().split('\n').at(-1) ?? '').result.workspaces).toEqual([]);
      expect(existsSync(worktree)).toBe(false);
      expect(
        execFileSync('git', ['-C', root, 'branch', '--list', 'fix/636-fixture'], {
          encoding: 'utf8',
        }),
      ).toBe('');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('uses Herdr instead of tmux for agent work', () => {
    for (const file of [laneScript, laneGuide, foremanGuide]) {
      expect(file).not.toContain('tmux');
    }
  });

  it('bases a lane branch on origin/main rather than an unpushed local main commit', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-base-'));
    try {
      const { root } = createLaneRepo(fixture);
      writeFileSync(join(root, 'local-only.txt'), 'unpushed\n');
      git(root, 'add', 'local-only.txt');
      git(root, 'commit', '-m', 'local-only main commit');
      const localCommit = git(root, 'rev-parse', 'HEAD');
      const script = [
        shellFunction('_lane_base'),
        'base="$(_lane_base)"',
        'git branch lane-base-test "$base"',
      ].join('\n');
      execFileSync('bash', ['-c', script], { cwd: root, stdio: 'ignore' });
      const containsLocalCommit = spawnSync('git', [
        '-C',
        root,
        'merge-base',
        '--is-ancestor',
        localCommit,
        'lane-base-test',
      ]);

      expect(containsLocalCommit.status).toBe(1);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('fetches origin/main before resolving the lane base', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-base-fetch-'));
    try {
      const { root, baseCommit } = createLaneRepo(fixture);
      writeFileSync(join(root, 'remote-only.txt'), 'remote\n');
      git(root, 'add', 'remote-only.txt');
      git(root, 'commit', '-m', 'new origin main');
      const remoteCommit = git(root, 'rev-parse', 'HEAD');
      execFileSync('git', ['-C', root, 'push', 'origin', 'main'], { stdio: 'ignore' });
      git(root, 'update-ref', 'refs/remotes/origin/main', baseCommit);
      const script = [shellFunction('_lane_base'), '_lane_base'].join('\n');

      expect(execFileSync('bash', ['-c', script], { cwd: root, encoding: 'utf8' }).trim()).toBe(
        'origin/main',
      );
      expect(git(root, 'rev-parse', 'origin/main')).toBe(remoteCommit);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('refuses to start when local main has unpushed commits and names them', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-main-ahead-'));
    try {
      const { root } = createLaneRepo(fixture);
      writeFileSync(join(root, 'local-only.txt'), 'unpushed\n');
      git(root, 'add', 'local-only.txt');
      git(root, 'commit', '-m', 'unpushed main marker');
      const result = spawnSync(
        'bash',
        ['-c', `${shellFunction('_lane_check_main')}\n_lane_check_main`],
        { cwd: root, encoding: 'utf8' },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('local main is ahead of origin/main');
      expect(result.stderr).toContain('unpushed main marker');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('keeps learnings in the lane PR without a foreman follow-up commit', () => {
    expect(foremanGuide).toMatch(/lane's learning file lands in its PR/i);
    expect(foremanGuide).toMatch(/foreman edits no files after merge/i);
    expect(foremanGuide).not.toMatch(/push(?:ing)? (?:the )?LEARNINGS commit/i);
  });

  it('creates the linked branch and Herdr worktree with its root pane', () => {
    expect(laneScript).toContain('gh issue develop "$issue" --name "$branch" --base main');
    expect(laneScript).toContain('herdr worktree create');
    for (const flag of ['--cwd', '--branch', '--base "$base"', '--path', '--label']) {
      expect(laneScript).toContain(flag);
    }
    expect(laneScript).toContain('--label "#$issue $slug"');
    expect(laneScript).toContain('.result.root_pane.pane_id');
  });

  it('starts the selected agent in the returned pane and submits the lane prompt', () => {
    expect(laneScript).toContain('herdr agent start');
    expect(laneScript).toContain('--kind "$agent"');
    expect(laneScript).toContain('--pane "$pane"');
    expect(laneScript).toContain('herdr agent prompt');
    expect(laneScript).toContain('_lane_prompt "$issue"');
  });

  it('preserves the scoped Copilot and Devin lane permissions', () => {
    for (const tool of [
      'write',
      'shell(npm:*)',
      'shell(npx:*)',
      'shell(git:*)',
      'shell(gh issue:*)',
      'shell(gh pr create)',
      'shell(gh pr checks)',
      'shell(git merge)',
      'shell(git rebase)',
      'write(.env.local)',
      'shell(gh pr merge)',
    ]) {
      expect(laneScript).toContain(tool);
    }
    expect(laneScript).toContain('--permission-mode accept-edits --sandbox');
  });

  it('writes CI placeholder values to the new worktree .env.local with mode 0600', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-placeholders-'));
    try {
      const { root, result } = startCopilotLane(fixture);
      expect(result.status, result.stderr).toBe(0);
      const envPath = join(root, '.worktrees/640-placeholder-test/.env.local');
      expect(readFileSync(envPath, 'utf8')).toBe(
        `NEXT_PUBLIC_SUPABASE_URL=${ciBuildPlaceholder('NEXT_PUBLIC_SUPABASE_URL')}\n` +
          `NEXT_PUBLIC_SUPABASE_ANON_KEY=${ciBuildPlaceholder('NEXT_PUBLIC_SUPABASE_ANON_KEY')}\n`,
      );
      expect(statSync(envPath).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('keeps the lane .env.local limited to the two public CI build variables', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-env-allowlist-'));
    try {
      const { root, result } = startCopilotLane(
        fixture,
        'SUPABASE_SERVICE_ROLE_KEY=owner-secret\nRESEND_API_KEY=owner-secret\n',
      );
      expect(result.status, result.stderr).toBe(0);
      const laneEnv = readFileSync(
        join(root, '.worktrees/640-placeholder-test/.env.local'),
        'utf8',
      );
      expect(laneEnv).not.toContain('owner-secret');
      expect(
        laneEnv
          .split('\n')
          .filter(Boolean)
          .map((line) => line.split('=')[0]),
      ).toEqual(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('starts Copilot lane agents with pass-cli shell access denied', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-pass-cli-denied-'));
    try {
      const { herdrLog, result } = startCopilotLane(fixture);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(herdrLog, 'utf8').split('\n')).toContain('--deny-tool=shell(pass-cli:*)');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('defines CI placeholder values once and keeps them aligned with ci.yml', () => {
    const scriptFiles = filesUnder(new URL('../../scripts/', import.meta.url).pathname);
    for (const [name, key] of [
      ['ci_supabase_url', 'NEXT_PUBLIC_SUPABASE_URL'],
      ['ci_supabase_anon_key', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    ]) {
      const value = ciBuildPlaceholder(key);
      const match = laneScript.match(new RegExp(`local ${name}="([^"]+)"`));
      expect(match, `Expected ${name} to be defined once in scripts/lane.sh`).not.toBeNull();
      expect(laneScript.match(new RegExp(`local ${name}=`, 'g'))).toHaveLength(1);
      expect(match?.[1]).toBe(value);
      expect(scriptFiles.filter((file) => readFileSync(file, 'utf8').includes(value))).toEqual([
        new URL('../../scripts/lane.sh', import.meta.url).pathname,
      ]);
    }
  });

  it('grants Devin lanes only the shared git directory and approved gh commands', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-devin-sandbox-'));
    const bin = join(fixture, 'bin');
    const herdrLog = join(fixture, 'herdr.log');
    const { root } = createLaneRepo(fixture);
    try {
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'gh'),
        `#!/bin/sh
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
`,
        { mode: 0o755 },
      );
      writeFileSync(
        join(bin, 'herdr'),
        `#!/bin/sh
case "$1 $2" in
  "worktree create")
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
  "agent start")
    printf '%s\\n' 'agent start' >> "$HERDR_LOG"
    shift 2
    for arg do printf '%s\\n' "$arg" >> "$HERDR_LOG"; done
    ;;
  "agent prompt") printf '%s\\n' 'agent prompt' >> "$HERDR_LOG" ;;
esac
`,
        { mode: 0o755 },
      );
      const result = spawnSync('bash', [laneEntrypoint, 'start', '659', 'devin-sandbox', 'devin'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          HERDR_LOG: herdrLog,
          REPO_ROOT: root,
        },
      });

      expect(result.status, result.stderr).toBe(0);
      const loggedArgs = readFileSync(herdrLog, 'utf8').split('\n');
      const startIndex = loggedArgs.indexOf('agent start');
      const promptIndex = loggedArgs.indexOf('agent prompt', startIndex);
      const args = loggedArgs.slice(startIndex + 1, promptIndex);
      expect(args).toContain('--sandbox');
      const configIndex = args.indexOf('--config');
      expect(configIndex).toBeGreaterThanOrEqual(0);
      const configPath = args[configIndex + 1];
      expect(configPath).toBeTruthy();
      const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
        permissions: { allow: string[] };
        sandbox: { excluded: { allow: string[] } };
      };
      const commonDir = git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir');
      expect(config.permissions.allow).toEqual([`Write(${commonDir})`]);
      expect(config.sandbox.excluded.allow).toEqual([
        'Exec(gh issue comment)',
        'Exec(gh pr create --draft)',
        'Exec(gh pr checks)',
        'Exec(gh pr view)',
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('writes only lane ports and clones dependencies without copying environment files', () => {
    expect(laneScript).toContain('PORT=$port');
    expect(laneScript).toContain('PLAYWRIGHT_BASE_URL=http://127.0.0.1:$port');
    expect(laneScript).not.toContain('SUPABASE_PROJECT_ID');
    expect(laneScript).toContain('cp -c -R "$root/node_modules"');
    expect(laneScript).not.toContain('cp "$f" "$dir/"');
  });

  it('focuses an existing Herdr lane and refuses nested worktrees', () => {
    expect(laneScript).toContain('run lane from the main checkout, not a worktree');
    expect(laneScript).toContain('herdr workspace focus');
    expect(laneScript).toContain('herdr workspace list');
  });

  it('guards lane cleanup and removes or closes its Herdr workspace before deleting the checkout', () => {
    for (const guard of [
      'not MERGED',
      'has uncommitted changes',
      'has unpushed commits',
      'still listens on :$port',
    ]) {
      expect(laneScript).toContain(guard);
    }
    expect(laneScript).toContain('herdr worktree remove');
    expect(laneScript).toContain('herdr workspace close');
    expect(laneScript).toContain('herdr workspace list');
    expect(laneScript.indexOf('herdr worktree remove')).toBeLessThan(
      laneScript.indexOf('git worktree remove'),
    );
  });

  it('reports lane agents and orphaned Herdr workspaces', () => {
    expect(laneScript).toContain('herdr agent list');
    expect(laneScript).toContain('WORKSPACE LABEL');
    expect(laneScript).toContain('.result.agents');
    expect(laneScript).toContain('.agent_status');
    expect(laneScript).toContain('.result.workspaces');
    expect(laneScript).toContain('.worktree.checkout_path');
    expect(laneScript).toContain('branch');
    expect(laneScript).toContain('checkout_path');
    expect(laneScript).toContain('does not exist');
    expect(laneScript).toContain('No lanes open.');
  });

  it('starts the default Devin foreman with Herdr skill context', () => {
    expect(laneScript).toMatch(/foreman\(\)[\s\S]*?agent="\$\{1:-devin\}"/);
    expect(laneScript).toContain('claude-opus-5-5-high');
    expect(laneScript).toContain('herdr --skill');
    expect(laneScript).toContain('herdr agent start foreman');
  });

  it('foreman passes Devin a private 0600 copy of .devin/foreman.json via --config, never the committed file, and no bypassing permission mode', () => {
    const committedConfig = readFileSync(new URL('../../.devin/foreman.json', import.meta.url));
    const shells: [string, string[]][] = [
      ['bash', ['-c']],
      ['zsh', ['-f', '-c']],
    ];
    for (const [shell, shellArgs] of shells) {
      const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'lane-foreman-config-')));
      const root = join(fixture, 'repo');
      const bin = join(fixture, 'bin');
      const temp = join(fixture, 'tmp');
      const herdrLog = join(fixture, 'herdr.log');
      const configSnapshot = join(fixture, 'config-at-start.json');
      try {
        mkdirSync(join(root, '.devin'), { recursive: true });
        mkdirSync(bin);
        mkdirSync(temp);
        execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
        writeFileSync(join(root, '.devin', 'foreman.json'), committedConfig);
        // On agent start the stub acts like Devin: it saves its own state into the --config file.
        writeFileSync(
          join(bin, 'herdr'),
          `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_LOG"
case "$1 $2" in
  "agent get") cat "$FIXTURES/dead-get.json" >&2; exit 1 ;;
  "tab create") cat "$FIXTURES/tab-create.json" ;;
  "agent start")
    prev=""
    for arg; do
      if [ "$prev" = --config ]; then
        cp "$arg" "$CONFIG_SNAPSHOT"
        printf '%s\\n' '{"devin":{"org_id":"org-fake"},"permissions":{"allow":["exec"]}}' > "$arg"
      fi
      prev="$arg"
    done
    ;;
esac
`,
          { mode: 0o755 },
        );

        const result = spawnSync(
          shell,
          [
            ...shellArgs,
            `source ${shellQuote(new URL('../../scripts/lane.sh', import.meta.url).pathname)}\nforeman`,
          ],
          {
            cwd: root,
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH}`,
              TMPDIR: temp,
              HERDR_LOG: herdrLog,
              HERDR_WORKSPACE_ID: 'w1M',
              HERDR_PANE_ID: 'w1M:p1',
              FIXTURES: herdrFixtureDir,
              CONFIG_SNAPSHOT: configSnapshot,
            },
          },
        );

        expect(result.status, `${shell}: ${result.stderr}`).toBe(0);
        const start = readFileSync(herdrLog, 'utf8')
          .split('\n')
          .find((line) => line.startsWith('agent start foreman'));
        expect(start, shell).toBeDefined();
        const args = (start ?? '').split(' ');
        expect(args[args.indexOf('--kind') + 1]).toBe('devin');
        expect(args).toContain('--config');
        const config = args[args.indexOf('--config') + 1];
        expect(config).not.toBe(`${root}/.devin/foreman.json`);
        expect(config.startsWith(`${temp}/`), `${shell}: ${config}`).toBe(true);
        expect(statSync(config).mode & 0o777).toBe(0o600);
        expect(JSON.parse(readFileSync(configSnapshot, 'utf8')).permissions).toEqual(
          JSON.parse(committedConfig.toString()).permissions,
        );
        expect(readFileSync(join(root, '.devin', 'foreman.json')).equals(committedConfig)).toBe(
          true,
        );
        expect(start).not.toMatch(/--permission-mode (dangerous|bypass|yolo|smart|accept-edits)/);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    }
  });

  it('tells the foreman to wait for blocked or completed lanes', () => {
    expect(laneScript).toContain('herdr agent wait <lane> --until blocked --until done');
  });

  it('documents Herdr commands and removes tmux workflow instructions', () => {
    expect(foremanGuide).toContain('foreman [copilot|devin]');
    for (const mapping of [
      'lane status',
      'reading a lane',
      'sending keys to a lane',
      'starting a lane',
      'cleaning up a lane',
    ]) {
      expect(foremanGuide.toLowerCase()).toContain(mapping);
    }
  });

  it('records the Herdr notification and environment decisions', () => {
    expect(setupDecisions).toContain('Herdr');
    expect(setupDecisions).toContain('delivery = "system"');
    expect(setupDecisions).toContain('.env.local');
  });

  it('keeps the foreman read-only and approval-first', () => {
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?never write code/i);
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?wait for approval/);
  });

  it('passes per-invocation model or reasoning effort to both agent roles', () => {
    expect(laneScript).toMatch(/copilot[\s\S]*?--reasoning-effort/);
    expect(laneScript).toMatch(/copilot[\s\S]*?--model/);
    expect(laneScript).toMatch(/devin[\s\S]*?--model/);
  });

  it('keeps issue-comment reporting in the lane instructions', () => {
    expect(laneScript).toContain('comment on the issue');
    expect(laneGuide).toContain('comment on the issue');
    expect(foremanGuide).toContain('issue comments');
  });

  it('documents model defaults and scoped permission decisions', () => {
    expect(foremanGuide).toContain('claude-opus-5-5-high');
    expect(setupDecisions).toContain('Ghostty');
    expect(setupDecisions).toContain('trustedFolders');
    expect(setupDecisions).toContain('allow-all-paths');
  });
});

type ForemanScenario = {
  agentGet: 'live' | 'dead' | 'other-error';
  tabCreate?: 'ok' | 'fail' | 'no-root-pane';
  agentStartError?: string;
  workspaceId?: string | null;
};

const startBusy = (code: string) =>
  JSON.stringify({
    error: { code, message: 'agent target pane is not an available shell' },
    id: 'cli:agent:start',
  });

const runForeman = (shell: 'bash' | 'zsh', scenario: ForemanScenario) => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'lane-foreman-restart-')));
  const root = join(fixture, 'repo');
  const bin = join(fixture, 'bin');
  const log = join(fixture, 'herdr.log');
  const prompt = join(fixture, 'prompt.txt');
  const pathBefore = join(fixture, 'path-before');
  const pathAfter = join(fixture, 'path-after');
  try {
    mkdirSync(join(root, '.devin'), { recursive: true });
    mkdirSync(bin);
    execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
    writeFileSync(
      join(root, '.devin', 'foreman.json'),
      readFileSync(new URL('../../.devin/foreman.json', import.meta.url)),
    );
    writeFileSync(join(fixture, 'agent-start-error.json'), scenario.agentStartError ?? '');
    // Derived from the real tab create response with the root pane removed.
    const tabWithoutRootPane = JSON.parse(herdrFixture('tab-create.json'));
    delete tabWithoutRootPane.result.root_pane;
    writeFileSync(join(fixture, 'tab-no-root-pane.json'), JSON.stringify(tabWithoutRootPane));
    // Synthetic: a Herdr failure other than agent_not_found, to prove liveness is never guessed.
    writeFileSync(
      join(fixture, 'other-error.json'),
      '{"error":{"code":"socket_unavailable","message":"cannot reach herdr"},"id":"cli:agent:get"}',
    );
    writeFileSync(
      join(bin, 'herdr'),
      `#!/bin/sh
if [ "$1" = --skill ]; then printf '%s\\n' 'HERDR-SKILL-TEXT'; exit 0; fi
printf '%s\\n' "$*" | tr '\\n' ' ' >> "$HERDR_LOG"
printf '\\n' >> "$HERDR_LOG"
case "$1 $2" in
  "agent get")
    case "$AGENT_GET" in
      live) cat "$FIXTURES/live-get.json" ;;
      dead) cat "$FIXTURES/dead-get.json" >&2; exit 1 ;;
      *) cat "$OTHER_ERROR" >&2; exit 1 ;;
    esac
    ;;
  "tab create")
    if [ "$TAB_CREATE" = fail ]; then cat "$FIXTURES/tab-create-error.json" >&2; exit 1; fi
    if [ "$TAB_CREATE" = no-root-pane ]; then cat "$TAB_NO_ROOT_PANE"; exit 0; fi
    cat "$FIXTURES/tab-create.json"
    ;;
  "agent start")
    if [ -s "$AGENT_START_ERROR" ]; then cat "$AGENT_START_ERROR" >&2; exit 1; fi
    ;;
  "agent prompt") printf '%s' "$4" > "$PROMPT_FILE" ;;
esac
`,
      { mode: 0o755 },
    );

    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: log,
      HERDR_PANE_ID: 'w1M:p1',
      FIXTURES: herdrFixtureDir,
      TAB_NO_ROOT_PANE: join(fixture, 'tab-no-root-pane.json'),
      AGENT_GET: scenario.agentGet,
      OTHER_ERROR: join(fixture, 'other-error.json'),
      TAB_CREATE: scenario.tabCreate ?? 'ok',
      AGENT_START_ERROR: join(fixture, 'agent-start-error.json'),
      PROMPT_FILE: prompt,
    };
    delete (env as Record<string, string | undefined>).HERDR_WORKSPACE_ID;
    if (scenario.workspaceId !== null) {
      (env as Record<string, string>).HERDR_WORKSPACE_ID = scenario.workspaceId ?? 'w1M';
    }
    const laneSh = shellQuote(new URL('../../scripts/lane.sh', import.meta.url).pathname);
    const result =
      shell === 'bash'
        ? spawnSync('bash', [laneEntrypoint, 'foreman'], { cwd: root, encoding: 'utf8', env })
        : spawnSync(
            'zsh',
            [
              '-f',
              '-c',
              `source ${laneSh}\nprintf '%s' "$PATH" > ${shellQuote(pathBefore)}\nforeman\nrc=$?\nprintf '%s' "$PATH" > ${shellQuote(pathAfter)}\nexit $rc`,
            ],
            { cwd: root, encoding: 'utf8', env },
          );
    const expectedPrompt = spawnSync('bash', ['-c', `source ${laneSh}\n_foreman_prompt`], {
      cwd: root,
      encoding: 'utf8',
      env,
    }).stdout.replace(/\n+$/, '');
    return {
      root,
      result,
      calls: existsSync(log)
        ? readFileSync(log, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => line.trim())
        : [],
      prompt: existsSync(prompt) ? readFileSync(prompt, 'utf8') : null,
      expectedPrompt,
      pathBefore: existsSync(pathBefore) ? readFileSync(pathBefore, 'utf8') : null,
      pathAfter: existsSync(pathAfter) ? readFileSync(pathAfter, 'utf8') : null,
    };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
};

const callsMatching = (calls: string[], prefix: string) =>
  calls.filter((call) => call.startsWith(prefix));

describe('foreman restart (#650)', () => {
  it('fixtures hold real Herdr output for a live and a dead foreman', () => {
    const live = JSON.parse(herdrFixture('live-get.json'));
    expect(live.result.type).toBe('agent_info');
    expect(live.result.agent.agent_status).toMatch(/^(idle|working)$/);
    const dead = JSON.parse(herdrFixture('dead-get.json'));
    expect(dead.error.code).toBe('agent_not_found');
    const tab = JSON.parse(herdrFixture('tab-create.json'));
    expect(tab.result.root_pane.pane_id).toBeTruthy();
  });

  for (const shell of ['bash', 'zsh'] as const) {
    describe(`under ${shell}`, () => {
      it('focuses a live foreman once and starts nothing', () => {
        const { result, calls } = runForeman(shell, { agentGet: 'live' });
        expect(result.status, result.stderr).toBe(0);
        expect(callsMatching(calls, 'agent focus foreman')).toHaveLength(1);
        for (const forbidden of ['tab create', 'agent start', 'agent prompt']) {
          expect(callsMatching(calls, forbidden), forbidden).toEqual([]);
        }
      });

      it('checks liveness with agent get foreman, not a name match in agent list', () => {
        const { calls } = runForeman(shell, { agentGet: 'dead' });
        expect(callsMatching(calls, 'agent get foreman')).toHaveLength(1);
        expect(callsMatching(calls, 'agent list')).toEqual([]);
      });

      it('does not focus a dead foreman and goes on to start a new one', () => {
        const { result, calls } = runForeman(shell, { agentGet: 'dead' });
        expect(result.status, result.stderr).toBe(0);
        expect(callsMatching(calls, 'agent focus')).toEqual([]);
        expect(callsMatching(calls, 'agent start foreman')).toHaveLength(1);
        expect(callsMatching(calls, 'agent rename')).toEqual([]);
      });

      it('creates a labelled tab in the caller workspace and starts the agent in its root pane only', () => {
        const { root, result, calls, prompt, expectedPrompt } = runForeman(shell, {
          agentGet: 'dead',
        });
        expect(result.status, result.stderr).toBe(0);
        expect(calls).toContain(`tab create --workspace w1M --cwd ${root} --label foreman --focus`);
        const rootPane = JSON.parse(herdrFixture('tab-create.json')).result.root_pane.pane_id;
        const [start] = callsMatching(calls, 'agent start foreman');
        const args = start.split(' ');
        expect(args[args.indexOf('--pane') + 1]).toBe(rootPane);
        expect(start).not.toContain('w1M:p1');
        expect(calls.join('\n')).not.toContain('pane current');
        const order = [
          'agent get foreman',
          'tab create',
          'agent start foreman',
          'agent prompt foreman',
        ].map((prefix) => calls.findIndex((call) => call.startsWith(prefix)));
        expect(order.every((index) => index >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(prompt).toBe(expectedPrompt);
      });

      it('exits non-zero, prints Herdr error and never starts an agent when tab create fails', () => {
        const { result, calls } = runForeman(shell, { agentGet: 'dead', tabCreate: 'fail' });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('workspace_not_found');
        expect(callsMatching(calls, 'agent start')).toEqual([]);
        expect(callsMatching(calls, 'agent prompt')).toEqual([]);
      });

      it('exits non-zero and starts nothing when HERDR_WORKSPACE_ID is unset', () => {
        const { result, calls } = runForeman(shell, { agentGet: 'dead', workspaceId: null });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('HERDR_WORKSPACE_ID is not set');
        for (const forbidden of ['tab create', 'agent start', 'agent prompt']) {
          expect(callsMatching(calls, forbidden), forbidden).toEqual([]);
        }
      });

      it('exits non-zero and starts nothing when tab create returns no root pane', () => {
        const { result, calls } = runForeman(shell, {
          agentGet: 'dead',
          tabCreate: 'no-root-pane',
        });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('did not return a root pane');
        expect(callsMatching(calls, 'agent start')).toEqual([]);
        expect(callsMatching(calls, 'agent prompt')).toEqual([]);
      });

      for (const code of ['agent_pane_busy', 'agent_not_ready']) {
        it(`exits non-zero naming the pane and sends no prompt on ${code}`, () => {
          const { result, calls } = runForeman(shell, {
            agentGet: 'dead',
            agentStartError: startBusy(code),
          });
          const rootPane = JSON.parse(herdrFixture('tab-create.json')).result.root_pane.pane_id;
          expect(result.status).not.toBe(0);
          expect(result.stderr).toContain(rootPane);
          expect(result.stderr).toContain(code);
          expect(callsMatching(calls, 'agent prompt')).toEqual([]);
        });
      }

      it('does not start a second foreman when liveness cannot be determined', () => {
        const { result, calls } = runForeman(shell, { agentGet: 'other-error' });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('socket_unavailable');
        for (const forbidden of ['agent focus', 'tab create', 'agent start', 'agent prompt']) {
          expect(callsMatching(calls, forbidden), forbidden).toEqual([]);
        }
      });
    });
  }

  it('leaves PATH unchanged in the zsh caller', () => {
    for (const agentGet of ['live', 'dead'] as const) {
      const { pathBefore, pathAfter } = runForeman('zsh', { agentGet });
      expect(pathBefore).toBeTruthy();
      expect(pathAfter).toBe(pathBefore);
    }
  });
});

describe('lane worktree git hooks (#655)', () => {
  // Mirrors husky 9: a tracked .husky/pre-commit plus a git-ignored, generated .husky/_ dispatcher.
  const huskyRoot = (hooksPath: string | null) => (root: string) => {
    mkdirSync(join(root, '.husky', '_'), { recursive: true });
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
    git(root, 'commit', '-m', 'husky');
    git(root, 'push', '-q', 'origin', 'main');
    if (hooksPath) git(root, 'config', 'core.hooksPath', hooksPath);
  };

  const commitIn = (cwd: string, markerDir: string) => {
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(join(cwd, 'file.txt'), `${Math.random()}\n`);
    git(cwd, 'add', 'file.txt');
    execFileSync('git', ['-C', cwd, 'commit', '-m', 'change'], {
      env: { ...process.env, MARKER_DIR: markerDir },
      stdio: 'ignore',
    });
  };

  const withLane = (
    hooksPath: string | null,
    check: (ctx: { fixture: string; root: string; dir: string; status: number | null }) => void,
  ) => {
    const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'lane-hooks-')));
    try {
      const { root, result } = startCopilotLane(fixture, '', huskyRoot(hooksPath));
      expect(result.status, result.stderr).toBe(0);
      check({
        fixture,
        root,
        dir: join(root, '.worktrees/640-placeholder-test'),
        status: result.status,
      });
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  };

  it('criterion 1: a commit in a worktree made by lane start runs the pre-commit hook', () => {
    withLane('.husky/_', ({ fixture, dir }) => {
      commitIn(dir, join(fixture, 'markers'));
      expect(existsSync(join(fixture, 'markers', 'hook-ran'))).toBe(true);
    });
  });

  it('criterion 2: the main checkout keeps running hooks and keeps core.hooksPath', () => {
    withLane('.husky/_', ({ fixture, root }) => {
      commitIn(root, join(fixture, 'markers'));
      expect(existsSync(join(fixture, 'markers', 'hook-ran'))).toBe(true);
      expect(git(root, 'config', '--get', 'core.hooksPath')).toBe('.husky/_');
    });
  });

  it('starts a lane without copying hooks when core.hooksPath is unset', () => {
    withLane(null, ({ dir }) => {
      expect(existsSync(join(dir, '.husky', '_'))).toBe(false);
    });
  });

  it('starts a lane without copying hooks when core.hooksPath is absolute', () => {
    withLane(null, ({ fixture, root }) => {
      const absolute = join(fixture, 'abs-hooks');
      mkdirSync(absolute);
      writeFileSync(join(absolute, 'pre-commit'), '#!/bin/sh\n');
      git(root, 'config', 'core.hooksPath', absolute);
      const bash = `${shellFunction('_lane_setup_hooks')}\n_lane_setup_hooks "$1" "$2"`;
      const target = join(fixture, 'target');
      mkdirSync(target);
      const result = spawnSync('bash', ['-c', bash, 'bash', root, target], { encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      expect(readdirSync(target)).toEqual([]);
    });
  });

  it('does not touch anything outside the worktree when core.hooksPath contains ..', () => {
    withLane(null, ({ root, dir }) => {
      const worktrees = join(root, '.worktrees');
      git(root, 'config', 'core.hooksPath', '..');
      const bash = `${shellFunction('_lane_setup_hooks')}\n_lane_setup_hooks "$1" "$2"`;
      const result = spawnSync('bash', ['-c', bash, 'bash', root, dir], {
        encoding: 'utf8',
      });
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(dir)).toBe(true);
      expect(readdirSync(worktrees)).toEqual(['640-placeholder-test']);
      git(root, 'config', 'core.hooksPath', '.husky/../..');
      const nested = spawnSync('bash', ['-c', bash, 'bash', root, dir], { encoding: 'utf8' });
      expect(nested.status, nested.stderr).toBe(0);
      expect(existsSync(dir)).toBe(true);
      expect(readdirSync(worktrees)).toEqual(['640-placeholder-test']);
    });
  });
});
