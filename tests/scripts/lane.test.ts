import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createLaneRepo,
  ghStub,
  git,
  laneEntrypoint,
  laneSh,
  shellQuote,
  testEnv,
  writeStub,
} from './helpers/lane';
import { spawnTestTimeoutMs } from './helpers/timeout';

const ciWorkflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');
const setupDecisions = readFileSync(
  new URL('../../docs/agents/setup-decisions.md', import.meta.url),
  'utf8',
);

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

type StartOptions = {
  agent?: 'copilot';
  model?: string;
  issue?: string;
  slug?: string;
};

// Fake session/block IDs injected into the test environment for Rex-based lane start.
const TEST_REX_SESSION = 'session:test-rex';
const TEST_REX_BLOCK = 'block:test-foreman';
const TEST_REX_LANE_BLOCK = 'block:test-123';

const startCopilotLane = (
  fixture: string,
  rootEnv = '',
  prepareRoot?: (root: string) => void,
  options: StartOptions = {},
) => {
  const bin = join(fixture, 'bin');
  const herdrCalls = join(fixture, 'herdr-calls.log');
  const ghCalls = join(fixture, 'gh-calls.log');
  const tmuxLog = join(fixture, 'tmux.log');
  const rexLog = join(fixture, 'rex.log');
  const rexArgs = join(fixture, 'rex-args.log');
  const rexPrompt = join(fixture, 'rex-prompt.txt');
  const { root } = createLaneRepo(fixture);
  mkdirSync(bin);
  mkdirSync(join(fixture, 'tmp'));
  if (rootEnv) writeFileSync(join(root, '.env.local'), rootEnv);
  prepareRoot?.(root);
  writeStub(bin, 'gh', ghStub);
  writeStub(bin, 'tmux', `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TMUX_LOG"\n`);
  // Minimal herdr stub — lane.sh no longer calls herdr for lane start (Rex handles it).
  writeStub(
    bin,
    'herdr',
    `#!/bin/sh
{ printf '%s' "$*" | tr '\\n' ' '; printf '\\n'; } >> "$HERDR_CALLS"
`,
  );
  // Rex stub: returns a fake block_id on split, an instant shell prompt on capture,
  // and logs the agent command args (one per line) so tests can assert on flags.
  writeStub(
    bin,
    'rex',
    `#!/bin/sh
{ printf '%s' "$*" | tr '\\n' ' '; printf '\\n'; } >> "$REX_LOG"
case "$1" in
  split)
    # Find args after -- (which are: bash -c <agent_cmd>)
    while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do shift; done
    # $1=-- $2=bash $3=-c $4=agent_cmd
    if [ "$#" -ge 4 ]; then
      shift 3  # skip -- bash -c
      agent_cmd="$1"
      # Strip the leading "cd /path && " to get the agent command and its flags
      agent_part="\${agent_cmd#* && }"
      # Use eval to properly unquote shell-escaped flags, then log each arg
      eval "set -- \$agent_part"
      shift  # skip binary name (copilot/claude)
      for arg do printf '%s\\n' "\$arg"; done >> "$REX_ARGS"
    fi
    printf '%s\\n' '{"block_ids":["${TEST_REX_LANE_BLOCK}"]}'
    ;;
  capture)
    printf '❯\\n'
    ;;
  send)
    cat >> "$REX_PROMPT"
    ;;
esac
`,
  );
  const { agent, model, issue = '640', slug = 'placeholder-test' } = options;
  const args = ['start', issue, slug, ...(agent ? [agent] : []), ...(model ? [model] : [])];
  const result = spawnSync('bash', [laneEntrypoint, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: testEnv({
      REX_SESSION: TEST_REX_SESSION,
      REX_BLOCK: TEST_REX_BLOCK,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_CALLS: herdrCalls,
      GH_CALLS: ghCalls,
      TMUX_LOG: tmuxLog,
      REX_LOG: rexLog,
      REX_ARGS: rexArgs,
      REX_PROMPT: rexPrompt,
      TMPDIR: join(fixture, 'tmp'),
      REPO_ROOT: root,
    }),
  });
  const lines = (file: string) =>
    existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  return {
    root,
    rexArgs,
    rexPrompt,
    result,
    herdrCalls: () => lines(herdrCalls),
    ghCalls: () => lines(ghCalls),
    tmuxCalls: () => lines(tmuxLog),
    rexCalls: () => lines(rexLog),
  };
};

const withFixture = (prefix: string, run: (fixture: string) => void) => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  try {
    run(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
};

const baseWorktreeEntries = ['.env.lane', '.git', '.gitignore', 'README.md'];

const commitFile = (root: string, file: string, contents: string, message: string) => {
  writeFileSync(join(root, file), contents);
  git(root, 'add', file);
  git(root, 'commit', '-m', message);
};

const argsAfterAgentStart = (rexArgs: string) => {
  if (!existsSync(rexArgs)) return [];
  return readFileSync(rexArgs, 'utf8').split('\n').filter(Boolean);
};

type DoneOptions = { prState?: string; lsofStatus?: number };

const runLaneDone = (
  fixture: string,
  prepare: (ctx: { root: string; dir: string }) => void,
  { prState = 'MERGED', lsofStatus = 1 }: DoneOptions = {},
) => {
  const { root } = createLaneRepo(fixture);
  const bin = join(fixture, 'bin');
  const herdrLog = join(fixture, 'herdr.log');
  const lsofLog = join(fixture, 'lsof.log');
  const dir = join(root, '.worktrees', '636-fixture');
  mkdirSync(join(root, '.worktrees'));
  git(root, 'worktree', 'add', '-q', '-b', 'fix/636-fixture', dir, 'HEAD');
  git(dir, 'push', '-q', '-u', 'origin', 'fix/636-fixture');
  prepare({ root, dir });
  writeStub(bin, 'gh', `#!/bin/sh\nprintf '%s\\n' "$PR_STATE"\n`);
  writeStub(bin, 'lsof', `#!/bin/sh\nprintf '%s\\n' "$*" >> "$LSOF_LOG"\nexit ${lsofStatus}\n`);
  writeStub(
    bin,
    'herdr',
    `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_LOG"
case "$1 $2" in
  "workspace list")
    printf '{"result":{"workspaces":[{"workspace_id":"workspace-636","worktree":{"checkout_path":"%s"}}]}}\\n' "$LANE_DIR"
    ;;
  "worktree remove") [ -d "$LANE_DIR" ] && printf '%s\\n' 'checkout still present' >> "$HERDR_LOG" ;;
esac
`,
  );
  const result = spawnSync('bash', [laneEntrypoint, 'done', '636'], {
    cwd: root,
    encoding: 'utf8',
    env: testEnv({
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: herdrLog,
      LSOF_LOG: lsofLog,
      LANE_DIR: dir,
      PR_STATE: prState,
    }),
  });
  const calls = existsSync(herdrLog)
    ? readFileSync(herdrLog, 'utf8').split('\n').filter(Boolean)
    : [];
  const lsofCalls = existsSync(lsofLog)
    ? readFileSync(lsofLog, 'utf8').split('\n').filter(Boolean)
    : [];
  return { root, dir, result, calls, lsofCalls };
};

describe('lane shell helpers', { timeout: spawnTestTimeoutMs }, () => {
  it('runs lane status from a non-interactive shell without loading shell startup files', () => {
    const result = spawnSync('zsh', ['-f', '-c', `${shellQuote(laneEntrypoint)} status`], {
      cwd: new URL('../..', import.meta.url).pathname,
      encoding: 'utf8',
      env: testEnv(),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WORKTREE\tBRANCH\tPR\tCI');
  });

  it('resolves the helper for absolute, relative, and symlink invocations from a nested repo directory', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-entrypoint-link-'));
    const link = join(fixture, 'lane');
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const nestedDirectory = join(repoRoot, 'docs', 'agents');
    try {
      symlinkSync(laneEntrypoint, link);

      const invocations = [
        [laneEntrypoint, nestedDirectory],
        ['../../scripts/lane', nestedDirectory],
        [link, nestedDirectory],
      ];
      for (const [path, cwd] of invocations) {
        const result = spawnSync('zsh', ['-f', '-c', `${shellQuote(path)} status`], {
          cwd,
          encoding: 'utf8',
          env: testEnv(),
        });
        expect(result.status, `${path}: ${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('WORKTREE\tBRANCH\tPR\tCI');
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('prints usage for missing and unknown subcommands', () => {
    for (const command of ['', 'bogus']) {
      const result = spawnSync('zsh', ['-f', '-c', `${shellQuote(laneEntrypoint)} ${command}`], {
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

      const env = testEnv({ PATH: `${bin}:${process.env.PATH}` });
      const successful = spawnSync('zsh', ['-f', '-c', `${shellQuote(laneEntrypoint)} status`], {
        cwd: new URL('../..', import.meta.url).pathname,
        encoding: 'utf8',
        env,
      });
      const startMissingIssue = spawnSync(
        'zsh',
        ['-f', '-c', `${shellQuote(laneEntrypoint)} start`],
        {
          encoding: 'utf8',
          env,
        },
      );
      const failed = spawnSync('zsh', ['-f', '-c', `${shellQuote(laneEntrypoint)} done`], {
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
  });

  it('criterion 1: runs all shell checks on defaults and only requested files', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lint-shell-criterion-1-'));
    const { bin, log } = createLintStubs(fixture);
    const root = new URL('../..', import.meta.url).pathname;
    const env = testEnv({ PATH: `${bin}:${process.env.PATH}`, LINT_LOG: log });

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
  });

  it('follows ShellCheck sources when linting scripts/lane alone', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lint-shell-source-'));
    const { bin, log } = createLintStubs(fixture);
    const root = new URL('../..', import.meta.url).pathname;

    try {
      const result = spawnSync('npm', ['run', 'lint:shell', '--', 'scripts/lane'], {
        cwd: root,
        encoding: 'utf8',
        env: testEnv({ PATH: `${bin}:${process.env.PATH}`, LINT_LOG: log }),
      });
      expect(result.status).toBe(0);
      expect(readFileSync(log, 'utf8')).toContain(
        `shellcheck\t--shell=bash\t-x\t${join(root, 'scripts/lane')}`,
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('does not leak internal variables into the calling shell when sourced in zsh', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-status-path-'));
    const pathBefore = join(fixture, 'path-before');
    const pathAfter = join(fixture, 'path-after');
    const variableDeclarations = join(fixture, 'variables');
    try {
      const repoRoot = new URL('../..', import.meta.url).pathname;
      const zsh = spawnSync(
        'zsh',
        [
          '-f',
          '-c',
          `source ${shellQuote(laneSh)}
printf '%s\\n' "$PATH" > "$PATH_BEFORE"
lane_status
printf '%s\\n' "$PATH" > "$PATH_AFTER"
typeset -p worktree branch pr_info > "$VARIABLE_DECLARATIONS" 2>&1 || true`,
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: testEnv({
            PATH_BEFORE: pathBefore,
            PATH_AFTER: pathAfter,
            VARIABLE_DECLARATIONS: variableDeclarations,
          }),
        },
      );

      expect(zsh.status).toBe(0);
      expect(zsh.stdout).toContain('WORKTREE\tBRANCH\tPR\tCI');
      expect(readFileSync(pathAfter, 'utf8')).toBe(readFileSync(pathBefore, 'utf8'));
      const declarations = readFileSync(variableDeclarations, 'utf8');
      expect(declarations).toContain('no such variable: worktree');
      expect(declarations).toContain('no such variable: branch');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('removes ignored build output via git worktree --force on lane done', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-cleanup-'));
    const root = join(fixture, 'repo');
    const worktree = join(root, '.worktrees', '636-fixture');
    const bin = join(fixture, 'bin');
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
        { stdio: 'ignore' },
      );
      // Add ignored build output — git worktree remove --force should clean this up
      mkdirSync(join(worktree, '.next'));
      mkdirSync(join(worktree, 'node_modules'));
      writeFileSync(join(worktree, '.next', 'build-output'), 'ignored\n');
      writeFileSync(join(worktree, 'node_modules', 'dependency'), 'ignored\n');
      writeStub(bin, 'gh', `#!/bin/sh\nprintf '%s\\n' 'MERGED'\n`);
      writeStub(bin, 'lsof', `#!/bin/sh\nexit 1\n`);

      const done = spawnSync('bash', [laneEntrypoint, 'done', '636', '--force'], {
        cwd: root,
        encoding: 'utf8',
        env: testEnv({ PATH: `${bin}:${process.env.PATH}` }),
      });

      expect(done.status, `${done.stdout}${done.stderr}`).toBe(0);
      expect(done.stdout).toContain('lane #636 removed');
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

  it('uses Rex instead of tmux for agent work', () => {
    for (const file of [laneGuide, foremanGuide]) {
      expect(file).not.toContain('tmux');
    }
    withFixture('lane-no-tmux-', (fixture) => {
      const { result, rexCalls, tmuxCalls } = startCopilotLane(fixture);

      expect(result.status, result.stderr).toBe(0);
      expect(rexCalls().some((call) => call.startsWith('split'))).toBe(true);
      expect(tmuxCalls()).toEqual([]);
    });
  });

  it('bases a lane branch on origin/main rather than an unpushed local commit', () => {
    withFixture('lane-base-', (fixture) => {
      const { root, result } = startCopilotLane(fixture, '', (repo) => {
        git(repo, 'checkout', '-q', '-b', 'local-work');
        commitFile(repo, 'local-only.txt', 'unpushed\n', 'local-only commit');
      });
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(join(dir, 'local-only.txt'))).toBe(false);
      expect(git(dir, 'rev-parse', 'HEAD')).toBe(git(root, 'rev-parse', 'origin/main'));
    });
  });

  it('fetches origin/main before resolving the lane base', () => {
    withFixture('lane-base-fetch-', (fixture) => {
      let baseCommit = '';
      const { root, result } = startCopilotLane(fixture, '', (repo) => {
        baseCommit = git(repo, 'rev-parse', 'HEAD');
        commitFile(repo, 'remote-only.txt', 'remote\n', 'new origin main');
        git(repo, 'push', '-q', 'origin', 'main');
        git(repo, 'update-ref', 'refs/remotes/origin/main', baseCommit);
      });
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(git(root, 'rev-parse', 'origin/main')).not.toBe(baseCommit);
      expect(existsSync(join(dir, 'remote-only.txt'))).toBe(true);
    });
  });

  it('refuses to start when local main has unpushed commits and names them', () => {
    withFixture('lane-main-ahead-', (fixture) => {
      const { root, result, ghCalls, rexCalls } = startCopilotLane(fixture, '', (repo) =>
        commitFile(repo, 'local-only.txt', 'unpushed\n', 'unpushed main marker'),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('local main is ahead of origin/main');
      expect(result.stderr).toContain('unpushed main marker');
      expect(ghCalls().filter((call) => call.startsWith('issue develop'))).toEqual([]);
      expect(rexCalls()).toEqual([]);
      expect(existsSync(join(root, '.worktrees'))).toBe(false);
    });
  });

  it('criterion 1: the new lane branch tracks origin/<branch>, never origin/main', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-upstream-'));
    try {
      const { root, result } = startCopilotLane(fixture);
      expect(result.status).toBe(0);
      const dir = join(root, '.worktrees', '640-placeholder-test');
      const branch = git(dir, 'branch', '--show-current');

      expect(branch).toBe('fix/640-placeholder-test');
      expect(git(dir, 'rev-parse', '--abbrev-ref', `${branch}@{upstream}`)).toBe(
        `origin/${branch}`,
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('criterion 2: with push.default=upstream a bare git push cannot update main', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-push-upstream-'));
    try {
      const { root, result } = startCopilotLane(fixture);
      expect(result.status).toBe(0);
      git(root, 'config', 'push.default', 'upstream');
      const dir = join(root, '.worktrees', '640-placeholder-test');
      const branch = git(dir, 'branch', '--show-current');
      const remoteMainBefore = git(root, 'ls-remote', 'origin', 'refs/heads/main');
      writeFileSync(join(dir, 'lane-work.txt'), 'lane commit\n');
      git(dir, 'add', 'lane-work.txt');
      git(dir, 'commit', '-m', 'lane work');
      spawnSync('git', ['-C', dir, 'push'], { encoding: 'utf8' });

      expect(git(root, 'ls-remote', 'origin', 'refs/heads/main')).toBe(remoteMainBefore);
      expect(git(root, 'ls-remote', 'origin', `refs/heads/${branch}`)).toContain(
        git(dir, 'rev-parse', 'HEAD'),
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it.skip('keeps learnings in the lane PR without a foreman follow-up commit', () => {
    expect(foremanGuide).toMatch(/lane's learning file lands in its PR/i);
    expect(foremanGuide).toMatch(/foreman edits no files after merge/i);
    expect(foremanGuide).not.toMatch(/push(?:ing)? (?:the )?LEARNINGS commit/i);
  });

  it('creates the linked branch and worktree and opens a Rex pane', () => {
    withFixture('lane-worktree-', (fixture) => {
      const { root, result, ghCalls, rexCalls } = startCopilotLane(fixture);
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(ghCalls()).toContain('issue develop 640 --name fix/640-placeholder-test --base main');
      expect(existsSync(dir)).toBe(true);
      expect(git(dir, 'branch', '--show-current')).toBe('fix/640-placeholder-test');
      expect(rexCalls().some((call) => call.startsWith('split'))).toBe(true);
    });
  });

  it('reuses an existing remote branch instead of creating a linked branch', () => {
    withFixture('lane-existing-branch-', (fixture) => {
      const { result, ghCalls } = startCopilotLane(fixture, '', (repo) =>
        git(repo, 'push', '-q', 'origin', 'main:refs/heads/fix/640-placeholder-test'),
      );

      expect(result.status, result.stderr).toBe(0);
      expect(ghCalls().filter((call) => call.startsWith('issue develop'))).toEqual([]);
    });
  });

  it('starts the selected agent in a Rex pane and sends the lane prompt', () => {
    withFixture('lane-agent-start-', (fixture) => {
      const { result, rexCalls, rexPrompt } = startCopilotLane(fixture);

      expect(result.status, result.stderr).toBe(0);
      expect(rexCalls().some((call) => call.startsWith('split'))).toBe(true);
      const prompt = existsSync(rexPrompt) ? readFileSync(rexPrompt, 'utf8') : '';
      expect(prompt).toContain('You are a lane.');
      expect(prompt).toContain('work on GitHub issue #640');
    });
  });

  it('preserves the scoped Copilot lane permissions', () => {
    withFixture('lane-permissions-', (fixture) => {
      const { result, rexArgs } = startCopilotLane(fixture, '', undefined, { agent: 'copilot' });
      expect(result.status, result.stderr).toBe(0);
      const args = argsAfterAgentStart(rexArgs);
      for (const tool of ['write', 'shell(npm:*)', 'shell(npx:*)', 'shell(git:*)']) {
        expect(args, tool).toContain(`--allow-tool=${tool}`);
      }
      for (const rule of [
        'shell(git merge)',
        'shell(git rebase)',
        'write(.env.local)',
        'shell(gh pr merge)',
      ]) {
        expect(args, rule).toContain(`--deny-tool=${rule}`);
      }
      expect(args).not.toContain('--sandbox');
    });
  });

  it('copies .env.local from the main checkout into the new worktree', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-env-allowlist-'));
    try {
      const { root, result } = startCopilotLane(
        fixture,
        'SUPABASE_SERVICE_ROLE_KEY=owner-secret\nRESEND_API_KEY=owner-secret\n',
      );
      expect(result.status, result.stderr).toBe(0);
      expect(existsSync(join(root, '.worktrees/640-placeholder-test/.env.local'))).toBe(true);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('starts Copilot lane agents with pass-cli shell access denied', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'lane-pass-cli-denied-'));
    try {
      const { rexArgs, result } = startCopilotLane(fixture, '', undefined, { agent: 'copilot' });
      expect(result.status, result.stderr).toBe(0);
      const args = argsAfterAgentStart(rexArgs);
      expect(args).toContain('--deny-tool=shell(pass-cli:*)');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  describe('Copilot lane read-only shell allow list (#660)', () => {
    const startedArgs = () => {
      const fixture = mkdtempSync(join(tmpdir(), 'lane-readonly-allow-'));
      try {
        const { rexArgs, result } = startCopilotLane(fixture, '', undefined, { agent: 'copilot' });
        expect(result.status, result.stderr).toBe(0);
        return argsAfterAgentStart(rexArgs);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    };
    const allowedShell = (args: string[]) => {
      return args
        .filter((a) => a.startsWith('--allow-tool=shell('))
        .map((a) => a.slice('--allow-tool=shell('.length, -1).replace(/:\*$/, ''));
    };

    it('criterion 1: allows the read-only command set', () => {
      const allowed = allowedShell(startedArgs());
      for (const cmd of [
        'pwd',
        'ls',
        'cat',
        'head',
        'tail',
        'wc',
        'command -v',
        'which',
        'diff',
        'grep',
        'gh pr view',
        'gh pr diff',
        'gh run view',
      ]) {
        expect(allowed, cmd).toContain(cmd);
      }
    });

    it('criterion 2: keeps write and code-running commands off the allow list', () => {
      const allowed = allowedShell(startedArgs());
      for (const cmd of ['sed', 'awk', 'tee', 'xargs', 'bash', 'sh', 'zsh', 'env', 'find', 'rg']) {
        expect(allowed, cmd).not.toContain(cmd);
      }
    });

    it('criterion 3: keeps the existing deny rules', () => {
      const args = startedArgs();
      for (const rule of [
        'shell(git merge)',
        'shell(git rebase)',
        'write(.env.local)',
        'shell(gh pr merge)',
      ]) {
        expect(args, rule).toContain(`--deny-tool=${rule}`);
      }
    });
  });

  it('writes only lane ports and clones dependencies without copying environment files', () => {
    withFixture('lane-ports-', (fixture) => {
      const { root, result } = startCopilotLane(fixture, '', (repo) => {
        mkdirSync(join(repo, 'node_modules/dep'), { recursive: true });
        writeFileSync(join(repo, 'node_modules/dep/index.js'), 'dependency\n');
        for (const file of ['.env', '.env.production', '.env.development.local']) {
          writeFileSync(join(repo, file), 'SUPABASE_PROJECT_ID=leak\n');
        }
      });
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(`lane #640: ${dir} on fix/640-placeholder-test, port 3640`);
      const envLane = readFileSync(join(dir, '.env.lane'), 'utf8');
      expect(envLane).toContain('PORT=3640\n');
      expect(envLane).toContain('PLAYWRIGHT_BASE_URL=http://127.0.0.1:3640\n');
      expect(envLane).toContain(`REX_SESSION_ID=${TEST_REX_SESSION}\n`);
      expect(envLane).toContain(`FOREMAN_BLOCK=${TEST_REX_BLOCK}\n`);
      expect(readFileSync(join(dir, 'node_modules/dep/index.js'), 'utf8')).toBe('dependency\n');
      for (const file of ['.env', '.env.production', '.env.development.local']) {
        expect(existsSync(join(dir, file)), file).toBe(false);
      }
    });
  });

  it('reopens an existing lane via Rex and refuses nested worktrees', () => {
    withFixture('lane-focus-', (fixture) => {
      const { root } = createLaneRepo(fixture);
      const bin = join(fixture, 'bin');
      const rexLog = join(fixture, 'rex.log');
      const dir = join(root, '.worktrees/641-existing');
      git(root, 'worktree', 'add', '-q', '-b', 'fix/641-existing', dir, 'HEAD');
      // Write a minimal .env.lane so the existing-lane path doesn't fail
      writeFileSync(
        join(dir, '.env.lane'),
        `PORT=3641\nPLAYWRIGHT_BASE_URL=http://127.0.0.1:3641\nISSUE=641\nREX_SESSION_ID=${TEST_REX_SESSION}\nFOREMAN_BLOCK=${TEST_REX_BLOCK}\n`,
      );
      writeStub(bin, 'gh', ghStub);
      writeStub(bin, 'herdr', '#!/bin/sh\n');
      writeStub(
        bin,
        'rex',
        `#!/bin/sh
{ printf '%s' "$*" | tr '\\n' ' '; printf '\\n'; } >> "$REX_LOG"
case "$1" in
  split) printf '%s\\n' '{"block_ids":["block:test-123"]}' ;;
  capture) printf '❯\\n' ;;
  send) cat >/dev/null ;;
esac
`,
      );
      const run = (cwd: string, ...args: string[]) =>
        spawnSync('bash', [laneEntrypoint, 'start', ...args], {
          cwd,
          encoding: 'utf8',
          env: testEnv({
            REX_SESSION: TEST_REX_SESSION,
            REX_BLOCK: TEST_REX_BLOCK,
            PATH: `${bin}:${process.env.PATH}`,
            REX_LOG: rexLog,
            REPO_ROOT: root,
          }),
        });

      const focused = run(root, '641');
      expect(focused.status, focused.stderr).toBe(0);
      const rexCalls = existsSync(rexLog)
        ? readFileSync(rexLog, 'utf8').split('\n').filter(Boolean)
        : [];
      expect(rexCalls.some((c) => c.startsWith('split'))).toBe(true);

      const noSlug = run(root, '999');
      expect(noSlug.status).toBe(1);
      expect(noSlug.stderr).toContain('new lane needs a slug');

      const nested = run(dir, '642', 'nested');
      expect(nested.status).toBe(1);
      expect(nested.stderr).toContain('run lane from the main checkout, not a worktree');
    });
  });

  describe('lane done guards', () => {
    it('refuses to clean up a lane whose PR is not merged', () => {
      withFixture('lane-done-open-', (fixture) => {
        const { dir, result, calls } = runLaneDone(fixture, () => {}, { prState: 'OPEN' });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain("PR for fix/636-fixture is 'OPEN', not MERGED");
        expect(calls.filter((call) => call.startsWith('worktree remove'))).toEqual([]);
        expect(existsSync(dir)).toBe(true);
      });
    });

    it('refuses to clean up a lane with uncommitted changes', () => {
      withFixture('lane-done-dirty-', (fixture) => {
        const { dir, result, calls } = runLaneDone(fixture, ({ dir: lane }) =>
          writeFileSync(join(lane, 'wip.txt'), 'wip\n'),
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${dir} has uncommitted changes`);
        expect(calls.filter((call) => call.startsWith('worktree remove'))).toEqual([]);
        expect(existsSync(dir)).toBe(true);
      });
    });

    it('refuses to clean up a lane with unpushed commits', () => {
      withFixture('lane-done-unpushed-', (fixture) => {
        const { dir, result, calls } = runLaneDone(fixture, ({ dir: lane }) =>
          commitFile(lane, 'unpushed.txt', 'local\n', 'unpushed lane work'),
        );

        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`${dir} has unpushed commits`);
        expect(calls.filter((call) => call.startsWith('worktree remove'))).toEqual([]);
        expect(existsSync(dir)).toBe(true);
      });
    });

    it('refuses to clean up a lane whose port still has a listener', () => {
      withFixture('lane-done-listening-', (fixture) => {
        const { dir, result, calls, lsofCalls } = runLaneDone(fixture, () => {}, { lsofStatus: 0 });

        expect(result.status).toBe(1);
        expect(result.stderr).toContain('a process still listens on :3636');
        expect(lsofCalls.join('\n')).toContain('-iTCP:3636');
        expect(calls.filter((call) => call.startsWith('worktree remove'))).toEqual([]);
        expect(existsSync(dir)).toBe(true);
      });
    });

    it('removes the worktree checkout and branch on clean done', () => {
      withFixture('lane-done-clean-', (fixture) => {
        const { root, dir, result } = runLaneDone(fixture, () => {});

        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain('lane #636 removed');
        expect(existsSync(dir)).toBe(false);
        expect(git(root, 'branch', '--list', 'fix/636-fixture')).toBe('');
      });
    });
  });

  it('reports git-based lane worktrees with PR and CI columns', () => {
    withFixture('lane-status-report-', (fixture) => {
      const { root } = createLaneRepo(fixture);
      const bin = join(fixture, 'bin');
      const existing = join(root, '.worktrees/641-existing');
      git(root, 'worktree', 'add', '-q', '-b', 'fix/641-existing', existing, 'HEAD');
      writeStub(bin, 'gh', ghStub);
      const result = spawnSync('bash', [laneEntrypoint, 'status'], {
        cwd: root,
        encoding: 'utf8',
        env: testEnv({ PATH: `${bin}:${process.env.PATH}` }),
      });

      expect(result.status, result.stderr).toBe(0);
      const lines = result.stdout.split('\n').filter(Boolean);
      expect(lines[0]).toBe('WORKTREE\tBRANCH\tPR\tCI');
      expect(lines.some((l) => l.includes('fix/641-existing'))).toBe(true);
    });
  });

  it('records the Herdr notification and environment decisions', () => {
    expect(setupDecisions).toContain('Herdr');
    expect(setupDecisions).toContain('delivery = "system"');
    expect(setupDecisions).toContain('.env.local');
  });

  it.skip('keeps issue-comment reporting in the lane instructions', () => {
    expect(laneGuide).toContain('commenting on the issue');
    expect(foremanGuide).toContain('issue comments');
    withFixture('lane-prompt-comment-', (fixture) => {
      const { herdrCalls } = startCopilotLane(fixture);
      const prompt = herdrCalls().find((call) => call.startsWith('agent prompt'));
      expect(prompt).toContain('comment on the issue');
    });
  });

  it.skip('documents model defaults and scoped permission decisions', () => {
    expect(foremanGuide).toContain('claude-opus-5-5-high');
    expect(setupDecisions).toContain('Ghostty');
    expect(setupDecisions).toContain('trustedFolders');
    expect(setupDecisions).toContain('allow-all-paths');
  });
});
describe('lane worktree git hooks (#655)', { timeout: spawnTestTimeoutMs }, () => {
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
      env: testEnv({ MARKER_DIR: markerDir }),
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

  const withHooksConfig = (
    prepare: (root: string) => void,
    check: (ctx: { root: string; dir: string; stderr: string; entries: string[] }) => void,
  ) =>
    withFixture('lane-hooks-config-', (fixture) => {
      const { root, result } = startCopilotLane(fixture, '', prepare);
      const dir = join(root, '.worktrees/640-placeholder-test');
      expect(result.status, result.stderr).toBe(0);
      check({ root, dir, stderr: result.stderr, entries: readdirSync(dir).sort() });
    });

  it('starts a lane without copying hooks when core.hooksPath is absolute', () => {
    withHooksConfig(
      (root) => {
        const absolute = join(dirname(root), 'abs-hooks');
        mkdirSync(absolute);
        writeFileSync(join(absolute, 'pre-commit'), '#!/bin/sh\n');
        git(root, 'config', 'core.hooksPath', absolute);
      },
      ({ entries }) => expect(entries).toEqual(baseWorktreeEntries),
    );
  });

  it('copies a top-level hooks dir without nesting it', () => {
    withHooksConfig(
      (root) => {
        const gi = join(root, '.gitignore');
        commitFile(root, '.gitignore', readFileSync(gi, 'utf8') + '.githooks\n', 'ignore hooks');
        git(root, 'push', '-q', 'origin', 'main');
        mkdirSync(join(root, '.githooks'));
        writeFileSync(join(root, '.githooks', 'pre-commit'), '#!/bin/sh\n');
        git(root, 'config', 'core.hooksPath', '.githooks');
      },
      ({ dir }) => expect(readdirSync(join(dir, '.githooks'))).toEqual(['pre-commit']),
    );
  });

  it('leaves a hooks dir that already exists in the worktree untouched', () => {
    withHooksConfig(
      (root) => {
        mkdirSync(join(root, '.githooks'));
        commitFile(root, '.githooks/tracked', '#!/bin/sh\n', 'tracked hook');
        const gi = join(root, '.gitignore');
        commitFile(root, '.gitignore', readFileSync(gi, 'utf8') + '.githooks\n', 'ignore hooks');
        git(root, 'push', '-q', 'origin', 'main');
        writeFileSync(join(root, '.githooks', 'untracked-extra'), '#!/bin/sh\n');
        git(root, 'config', 'core.hooksPath', '.githooks');
      },
      ({ dir }) => expect(readdirSync(join(dir, '.githooks'))).toEqual(['tracked']),
    );
  });

  it('starts a lane without copying hooks when the relative hooksPath dir is missing', () => {
    withHooksConfig(
      (root) => git(root, 'config', 'core.hooksPath', 'missing/hooks'),
      ({ entries }) => expect(entries).toEqual(baseWorktreeEntries),
    );
  });

  it('does not touch anything outside the worktree when core.hooksPath contains ..', () => {
    for (const hooksPath of ['..', '.husky/../..']) {
      withHooksConfig(
        (root) => {
          mkdirSync(join(root, '.husky'));
          git(root, 'config', 'core.hooksPath', hooksPath);
        },
        ({ root, dir, stderr, entries }) => {
          expect(stderr, hooksPath).toContain('skipping git hooks copy');
          expect(entries, hooksPath).toEqual(baseWorktreeEntries);
          expect(readdirSync(join(root, '.worktrees')), hooksPath).toEqual([
            '640-placeholder-test',
          ]);
          expect(existsSync(dir)).toBe(true);
        },
      );
    }
  });
});

describe('lane agent options', { timeout: spawnTestTimeoutMs }, () => {
  const startArgs = (options: StartOptions) => {
    let args: string[] = [];
    withFixture('lane-agent-options-', (fixture) => {
      const { result, rexArgs } = startCopilotLane(fixture, '', undefined, options);
      expect(result.status, result.stderr).toBe(0);
      args = argsAfterAgentStart(rexArgs);
    });
    return args;
  };
  const optionValue = (args: string[], flag: string) => args[args.indexOf(flag) + 1];

  it('passes a reasoning effort to a Copilot lane', () => {
    const args = startArgs({ agent: 'copilot', model: 'high' });
    expect(optionValue(args, '--reasoning-effort')).toBe('high');
    expect(args).not.toContain('--model');
  });

  it('passes a model name to a Copilot lane', () => {
    const args = startArgs({ agent: 'copilot', model: 'gpt-5' });
    expect(optionValue(args, '--model')).toBe('gpt-5');
    expect(args).not.toContain('--reasoning-effort');
  });
});

describe('Removed agent paths (#980)', { timeout: spawnTestTimeoutMs }, () => {
  // Built at runtime so this file does not count as a hit itself.
  const removedAgent = ['dev', 'in'].join('');
  const repoRoot = new URL('../..', import.meta.url).pathname;

  it(`git grep -il ${removedAgent} only hits archived history`, () => {
    const result = spawnSync('git', ['grep', '-il', removedAgent], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    // LEARNINGS.md is a dated incident log, archived history like docs/ai/learnings/.
    const archived = [
      'docs/ai/LEARNINGS.md',
      'docs/ai/learnings/',
      'agent-output/',
      'public/animations/',
    ];
    const hits = result.stdout
      .split('\n')
      .filter(Boolean)
      .filter((file) => !archived.some((dir) => file.startsWith(dir)));
    expect(hits).toEqual([]);
  });

  it('scripts/lane foreman no longer exists', () => {
    const result = spawnSync('zsh', ['-f', '-c', `${shellQuote(laneEntrypoint)} foreman`], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('usage:');
    expect(result.stderr).not.toContain('foreman');
  });

  it(`scripts/lane start rejects ${removedAgent} as a lane agent`, () => {
    const result = spawnSync('bash', [laneEntrypoint, 'start', '980', 'x', removedAgent], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('agent must be claude, copilot, or opencode');
  });

  it('git-ignores .lane-notes.md so lane done does not see it as uncommitted', () => {
    const result = spawnSync('git', ['check-ignore', '-q', '.lane-notes.md'], { cwd: repoRoot });
    expect(result.status).toBe(0);
  });
});
