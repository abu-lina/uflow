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
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createLaneRepo,
  ghStub,
  git,
  herdrWorktreeCreateCase,
  laneEntrypoint,
  laneSh,
  shellQuote,
  writeStub,
} from './helpers/lane';

const ciWorkflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');
const setupDecisions = readFileSync(
  new URL('../../docs/agents/setup-decisions.md', import.meta.url),
  'utf8',
);

const herdrFixtureDir = new URL('../fixtures/herdr/', import.meta.url).pathname;
const herdrFixture = (name: string) => readFileSync(join(herdrFixtureDir, name), 'utf8');

const ciBuildPlaceholder = (key: string) => {
  const match = ciWorkflow.match(
    new RegExp(`echo "${key}=\\$\\{${key}:-([^}]+)\\}" >> \\$GITHUB_ENV`),
  );
  if (!match) throw new Error(`Could not find ${key} CI build placeholder`);
  return match[1];
};

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
  agent?: 'copilot' | 'devin';
  model?: string;
  issue?: string;
  slug?: string;
};

const startCopilotLane = (
  fixture: string,
  rootEnv = '',
  prepareRoot?: (root: string) => void,
  options: StartOptions = {},
) => {
  const bin = join(fixture, 'bin');
  const herdrLog = join(fixture, 'herdr.log');
  const herdrCalls = join(fixture, 'herdr-calls.log');
  const ghCalls = join(fixture, 'gh-calls.log');
  const tmuxLog = join(fixture, 'tmux.log');
  const { root } = createLaneRepo(fixture);
  mkdirSync(bin);
  if (rootEnv) writeFileSync(join(root, '.env.local'), rootEnv);
  prepareRoot?.(root);
  writeStub(bin, 'gh', ghStub);
  writeStub(bin, 'tmux', `#!/bin/sh\nprintf '%s\\n' "$*" >> "$TMUX_LOG"\n`);
  writeStub(
    bin,
    'herdr',
    `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_CALLS"
case "$1 $2" in
${herdrWorktreeCreateCase}  "agent start")
    printf '%s\\n' 'agent start' >> "$HERDR_LOG"
    shift 2
    for arg do printf '%s\\n' "$arg" >> "$HERDR_LOG"; done
    ;;
  "agent prompt") printf '%s\\n' 'agent prompt' >> "$HERDR_LOG" ;;
esac
`,
  );
  const { agent, model, issue = '640', slug = 'placeholder-test' } = options;
  const args = ['start', issue, slug, ...(agent ? [agent] : []), ...(model ? [model] : [])];
  const result = spawnSync('bash', [laneEntrypoint, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: herdrLog,
      HERDR_CALLS: herdrCalls,
      GH_CALLS: ghCalls,
      TMUX_LOG: tmuxLog,
      REPO_ROOT: root,
    },
  });
  const lines = (file: string) =>
    existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  return {
    root,
    herdrLog,
    result,
    herdrCalls: () => lines(herdrCalls),
    ghCalls: () => lines(ghCalls),
    tmuxCalls: () => lines(tmuxLog),
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

const baseWorktreeEntries = ['.env.lane', '.env.local', '.git', 'README.md'];

const commitFile = (root: string, file: string, contents: string, message: string) => {
  writeFileSync(join(root, file), contents);
  git(root, 'add', file);
  git(root, 'commit', '-m', message);
};

const argsAfterAgentStart = (herdrLog: string) => {
  const logged = readFileSync(herdrLog, 'utf8').split('\n');
  const start = logged.indexOf('agent start');
  return logged.slice(start + 1, logged.indexOf('agent prompt', start));
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
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: herdrLog,
      LSOF_LOG: lsofLog,
      LANE_DIR: dir,
      PR_STATE: prState,
    },
  });
  const calls = existsSync(herdrLog)
    ? readFileSync(herdrLog, 'utf8').split('\n').filter(Boolean)
    : [];
  const lsofCalls = existsSync(lsofLog)
    ? readFileSync(lsofLog, 'utf8').split('\n').filter(Boolean)
    : [];
  return { root, dir, result, calls, lsofCalls };
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
          `source ${shellQuote(laneSh)}
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
    withFixture('lane-zsh-', (fixture) => {
      const { root } = createLaneRepo(fixture);
      const bin = join(fixture, 'bin');
      const herdrLog = join(fixture, 'herdr.log');
      mkdirSync(join(root, '.worktrees', '636-fixture'), { recursive: true });
      writeStub(bin, 'jq', '#!/bin/sh\nprintf "workspace-636\\n"\n');
      writeStub(bin, 'herdr', `#!/bin/sh\nprintf '%s\\n' "$*" >> "$HERDR_LOG"\n`);
      const result = spawnSync('zsh', ['-c', `${shellQuote(laneEntrypoint)} start 636`], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:/usr/bin:/bin`, HERDR_LOG: herdrLog },
      });

      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(herdrLog, 'utf8')).toContain('workspace focus workspace-636');
    });
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

      const env = {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        HERDR_LOG: herdrLog,
        HERDR_STATE: herdrState,
        LANE_WORKTREE: worktree,
      };
      const done = spawnSync('bash', [laneEntrypoint, 'done', '636', '--force'], {
        cwd: root,
        encoding: 'utf8',
        env,
      });
      const output = `${done.stdout}${done.stderr}`;
      const remaining = execFileSync(join(bin, 'herdr'), ['workspace', 'list'], {
        encoding: 'utf8',
        env,
      });

      expect(done.status, output).toBe(0);
      expect(readFileSync(herdrLog, 'utf8')).toContain('workspace close workspace-636');
      expect(output).toMatch(
        /Herdr could not remove .*; closing its workspace and completing local cleanup/,
      );
      expect(output).toContain('lane #636 removed');
      expect(JSON.parse(remaining).result.workspaces).toEqual([]);
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
    for (const file of [laneGuide, foremanGuide]) {
      expect(file).not.toContain('tmux');
    }
    withFixture('lane-no-tmux-', (fixture) => {
      const { result, herdrCalls, tmuxCalls } = startCopilotLane(fixture);

      expect(result.status, result.stderr).toBe(0);
      expect(herdrCalls().some((call) => call.startsWith('agent start lane-640'))).toBe(true);
      expect(tmuxCalls()).toEqual([]);
    });
  });

  it('bases a lane branch on origin/main rather than an unpushed local commit', () => {
    withFixture('lane-base-', (fixture) => {
      const { root, result, herdrCalls } = startCopilotLane(fixture, '', (repo) => {
        git(repo, 'checkout', '-q', '-b', 'local-work');
        commitFile(repo, 'local-only.txt', 'unpushed\n', 'local-only commit');
      });
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(herdrCalls().find((call) => call.startsWith('worktree create'))).toContain(
        '--base origin/main',
      );
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
      const { root, result, ghCalls, herdrCalls } = startCopilotLane(fixture, '', (repo) =>
        commitFile(repo, 'local-only.txt', 'unpushed\n', 'unpushed main marker'),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('local main is ahead of origin/main');
      expect(result.stderr).toContain('unpushed main marker');
      expect(ghCalls().filter((call) => call.startsWith('issue develop'))).toEqual([]);
      expect(herdrCalls()).toEqual([]);
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

  it('keeps learnings in the lane PR without a foreman follow-up commit', () => {
    expect(foremanGuide).toMatch(/lane's learning file lands in its PR/i);
    expect(foremanGuide).toMatch(/foreman edits no files after merge/i);
    expect(foremanGuide).not.toMatch(/push(?:ing)? (?:the )?LEARNINGS commit/i);
  });

  it('creates the linked branch and Herdr worktree with its root pane', () => {
    withFixture('lane-worktree-', (fixture) => {
      const { root, result, ghCalls, herdrCalls } = startCopilotLane(fixture);
      const dir = join(root, '.worktrees/640-placeholder-test');

      expect(result.status, result.stderr).toBe(0);
      expect(ghCalls()).toContain('issue develop 640 --name fix/640-placeholder-test --base main');
      expect(herdrCalls()).toContain(
        `worktree create --cwd ${root} --branch fix/640-placeholder-test --base origin/main --path ${dir} --label #640 placeholder-test --focus`,
      );
      expect(git(dir, 'branch', '--show-current')).toBe('fix/640-placeholder-test');
      expect(herdrCalls().find((call) => call.startsWith('agent start'))).toContain(
        '--pane pane-lane',
      );
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

  it('starts the selected agent in the returned pane and submits the lane prompt', () => {
    withFixture('lane-agent-start-', (fixture) => {
      const { result, herdrCalls } = startCopilotLane(fixture);
      const calls = herdrCalls();
      const start = calls.findIndex((call) =>
        call.startsWith('agent start lane-640 --kind copilot --pane pane-lane -- '),
      );
      const prompt = calls.findIndex((call) =>
        call.startsWith('agent prompt lane-640 You are a lane.'),
      );

      expect(result.status, result.stderr).toBe(0);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(prompt).toBeGreaterThan(start);
      expect(calls[prompt]).toContain('work on GitHub issue #640');
    });
  });

  it('preserves the scoped Copilot and Devin lane permissions', () => {
    withFixture('lane-permissions-', (fixture) => {
      const { result, herdrLog } = startCopilotLane(fixture);
      expect(result.status, result.stderr).toBe(0);
      const args = argsAfterAgentStart(herdrLog);
      for (const tool of [
        '--allow-tool=write',
        '--allow-tool=shell(npm:*)',
        '--allow-tool=shell(npx:*)',
        '--allow-tool=shell(git:*)',
        '--allow-tool=shell(gh issue:*)',
        '--allow-tool=shell(gh pr create)',
        '--allow-tool=shell(gh pr checks)',
        '--deny-tool=shell(git merge)',
        '--deny-tool=shell(git rebase)',
        '--deny-tool=write(.env.local)',
        '--deny-tool=shell(gh pr merge)',
      ]) {
        expect(args, tool).toContain(tool);
      }
      expect(args).not.toContain('--sandbox');
    });
    withFixture('lane-devin-permissions-', (fixture) => {
      const { result, herdrLog } = startCopilotLane(fixture, '', undefined, { agent: 'devin' });
      expect(result.status, result.stderr).toBe(0);
      const args = argsAfterAgentStart(herdrLog);
      expect(args.join(' ')).toContain('--permission-mode accept-edits --sandbox');
      expect(args.filter((arg) => arg.startsWith('--allow-tool'))).toEqual([]);
    });
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

  describe('Copilot lane read-only shell allow list (#660)', () => {
    const startedArgs = () => {
      const fixture = mkdtempSync(join(tmpdir(), 'lane-readonly-allow-'));
      try {
        const { herdrLog, result } = startCopilotLane(fixture);
        expect(result.status, result.stderr).toBe(0);
        return readFileSync(herdrLog, 'utf8').split('\n').filter(Boolean);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    };
    const allowedShell = (args: string[]) =>
      args
        .filter((arg) => arg.startsWith('--allow-tool=shell('))
        .map((arg) => arg.slice('--allow-tool=shell('.length, -1).replace(/:\*$/, ''));

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
        '--deny-tool=shell(git merge)',
        '--deny-tool=shell(git rebase)',
        '--deny-tool=write(.env.local)',
        '--deny-tool=shell(gh pr merge)',
      ]) {
        expect(args).toContain(rule);
      }
    });
  });

  it('grants Devin lanes only the shared git directory and approved gh commands', () => {
    withFixture('lane-devin-sandbox-', (fixture) => {
      const { root, herdrLog, result } = startCopilotLane(fixture, '', undefined, {
        agent: 'devin',
        issue: '659',
        slug: 'devin-sandbox',
      });

      expect(result.status, result.stderr).toBe(0);
      const args = argsAfterAgentStart(herdrLog);
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
      expect(readFileSync(join(dir, '.env.lane'), 'utf8')).toBe(
        'PORT=3640\nPLAYWRIGHT_BASE_URL=http://127.0.0.1:3640\n',
      );
      expect(readFileSync(join(dir, 'node_modules/dep/index.js'), 'utf8')).toBe('dependency\n');
      for (const file of ['.env', '.env.production', '.env.development.local']) {
        expect(existsSync(join(dir, file)), file).toBe(false);
      }
    });
  });

  it('focuses an existing Herdr lane and refuses nested worktrees', () => {
    withFixture('lane-focus-', (fixture) => {
      const { root } = createLaneRepo(fixture);
      const bin = join(fixture, 'bin');
      const log = join(fixture, 'herdr.log');
      const dir = join(root, '.worktrees/641-existing');
      git(root, 'worktree', 'add', '-q', '-b', 'fix/641-existing', dir, 'HEAD');
      writeStub(
        bin,
        'herdr',
        `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_LOG"
case "$1 $2" in
  "workspace list")
    printf '{"result":{"workspaces":[{"workspace_id":"workspace-641","worktree":{"checkout_path":"%s"}}]}}\\n' "$LANE_DIR"
    ;;
esac
`,
      );
      const run = (cwd: string, laneDir: string, ...args: string[]) =>
        spawnSync('bash', [laneEntrypoint, 'start', ...args], {
          cwd,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            HERDR_LOG: log,
            LANE_DIR: laneDir,
          },
        });
      const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean);

      const focused = run(root, dir, '641');
      expect(focused.status, focused.stderr).toBe(0);
      expect(calls()).toEqual(['workspace list', 'workspace focus workspace-641']);

      const unknown = run(root, join(fixture, 'elsewhere'), '641');
      expect(unknown.status).toBe(1);
      expect(unknown.stderr).toContain('no Herdr workspace found');

      const callsBefore = calls();
      const nested = run(dir, dir, '642', 'nested');
      expect(nested.status).toBe(1);
      expect(nested.stderr).toContain('run lane from the main checkout, not a worktree');
      expect(calls()).toEqual(callsBefore);
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

    it('removes the Herdr worktree before deleting the checkout and branch', () => {
      withFixture('lane-done-clean-', (fixture) => {
        const { root, dir, result, calls } = runLaneDone(fixture, () => {});

        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain('lane #636 removed');
        const removeIndex = calls.indexOf('worktree remove --workspace workspace-636 --force');
        expect(removeIndex).toBeGreaterThanOrEqual(0);
        expect(calls[removeIndex + 1]).toBe('checkout still present');
        expect(calls.filter((call) => call.startsWith('workspace close'))).toEqual([]);
        expect(existsSync(dir)).toBe(false);
        expect(git(root, 'branch', '--list', 'fix/636-fixture')).toBe('');
      });
    });
  });

  it('reports lane agents and orphaned Herdr workspaces', () => {
    withFixture('lane-status-report-', (fixture) => {
      const { root } = createLaneRepo(fixture);
      const bin = join(fixture, 'bin');
      const existing = join(root, '.worktrees/641-existing');
      const missing = join(fixture, 'missing-checkout');
      git(root, 'worktree', 'add', '-q', '-b', 'fix/641-existing', existing, 'HEAD');
      const agents = {
        result: {
          agents: [
            {
              name: 'lane-640',
              agent_status: 'working',
              workspace_id: 'w640',
              branch: 'fix/640-a',
            },
            { name: 'lane-641', agent_status: 'idle', workspace_id: 'w641' },
            { name: 'foreman', agent_status: 'idle', workspace_id: 'w0' },
          ],
        },
      };
      const workspaces = {
        result: {
          workspaces: [
            { workspace_id: 'w640', label: '#640 a', worktree: { checkout_path: root } },
            { workspace_id: 'w641', label: '#641 existing', worktree: { checkout_path: existing } },
            { workspace_id: 'w999', label: 'Gone', worktree: { checkout_path: missing } },
          ],
        },
      };
      writeStub(
        bin,
        'herdr',
        `#!/bin/sh
case "$1 $2" in
  "agent list") printf '%s\\n' ${shellQuote(JSON.stringify(agents))} ;;
  "workspace list") printf '%s\\n' ${shellQuote(JSON.stringify(workspaces))} ;;
esac
`,
      );
      const result = spawnSync('bash', [laneEntrypoint, 'status'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      });

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe(
        'AGENT\tSTATUS\tWORKSPACE LABEL\tBRANCH\n' +
          'lane-640\tworking\t#640 a\tfix/640-a\n' +
          'lane-641\tidle\t#641 existing\tfix/641-existing\n' +
          `STALE WORKSPACE\tw999\tGone\tcheckout path does not exist: ${missing}\n`,
      );
    });
  });

  it('starts the default Devin foreman with Herdr skill context', () => {
    const { result, calls, prompt } = runForeman('bash', { agentGet: 'dead' });
    const [start] = callsMatching(calls, 'agent start foreman');

    expect(result.status, result.stderr).toBe(0);
    expect(start).toContain('--kind devin');
    expect(start).toContain('--model claude-opus-5-5-high');
    expect(prompt).toContain('HERDR-SKILL-TEXT');
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

        const result = spawnSync(shell, [...shellArgs, `source ${shellQuote(laneSh)}\nforeman`], {
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
        });

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

  it('tells the foreman to wait for blocked or completed lanes', () => {
    const { prompt } = runForeman('bash', { agentGet: 'dead' });
    expect(prompt).toContain('herdr agent wait <lane> --until blocked --until done');
  });

  it('keeps issue-comment reporting in the lane instructions', () => {
    expect(laneGuide).toContain('comment on the issue');
    expect(foremanGuide).toContain('issue comments');
    withFixture('lane-prompt-comment-', (fixture) => {
      const { herdrCalls } = startCopilotLane(fixture);
      const prompt = herdrCalls().find((call) => call.startsWith('agent prompt'));
      expect(prompt).toContain('comment on the issue');
    });
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
  args?: string[];
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
    const result =
      shell === 'bash'
        ? spawnSync('bash', [laneEntrypoint, 'foreman', ...(scenario.args ?? [])], {
            cwd: root,
            encoding: 'utf8',
            env,
          })
        : spawnSync(
            'zsh',
            [
              '-f',
              '-c',
              `source ${shellQuote(laneSh)}\nprintf '%s' "$PATH" > ${shellQuote(pathBefore)}\nforeman\nrc=$?\nprintf '%s' "$PATH" > ${shellQuote(pathAfter)}\nexit $rc`,
            ],
            { cwd: root, encoding: 'utf8', env },
          );
    const expectedPrompt = spawnSync(
      'bash',
      ['-c', `source ${shellQuote(laneSh)}\n_foreman_prompt`],
      {
        cwd: root,
        encoding: 'utf8',
        env,
      },
    ).stdout.replace(/\n+$/, '');
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

describe('lane and foreman agent options', () => {
  const startArgs = (options: StartOptions) => {
    let args: string[] = [];
    withFixture('lane-agent-options-', (fixture) => {
      const { result, herdrLog } = startCopilotLane(fixture, '', undefined, options);
      expect(result.status, result.stderr).toBe(0);
      args = argsAfterAgentStart(herdrLog);
    });
    return args;
  };
  const foremanStart = (args: string[]) => {
    const { result, calls } = runForeman('bash', { agentGet: 'dead', args });
    expect(result.status, result.stderr).toBe(0);
    return callsMatching(calls, 'agent start foreman')[0].split(' ');
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

  it('passes a model name to a Devin lane', () => {
    const args = startArgs({ agent: 'devin', model: 'claude-test' });
    expect(optionValue(args, '--model')).toBe('claude-test');
  });

  it('passes a reasoning effort to a Copilot foreman', () => {
    const args = foremanStart(['copilot', 'xhigh']);
    expect(args[args.indexOf('--kind') + 1]).toBe('copilot');
    expect(optionValue(args, '--reasoning-effort')).toBe('xhigh');
    expect(args).toContain('--no-remote');
  });

  it('passes a model name to a Copilot foreman', () => {
    expect(optionValue(foremanStart(['copilot', 'gpt-5']), '--model')).toBe('gpt-5');
  });

  it('lets a Devin foreman override the default model', () => {
    expect(optionValue(foremanStart(['devin', 'claude-test']), '--model')).toBe('claude-test');
  });

  it('rejects an unknown foreman agent without calling Herdr', () => {
    const { result, calls } = runForeman('bash', { agentGet: 'dead', args: ['bogus'] });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('agent must be copilot or devin');
    expect(calls).toEqual([]);
  });

  it('keeps the foreman read-only and approval-first', () => {
    const { prompt } = runForeman('bash', { agentGet: 'dead' });
    expect(prompt).toMatch(/never write code/i);
    expect(prompt).toMatch(/wait for approval/);
  });
});
