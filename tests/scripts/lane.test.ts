import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');
const laneEntrypoint = new URL('../../scripts/lane', import.meta.url).pathname;
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
    for (const command of ['', 'foreman']) {
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
    }

    const cleanFixture = join(root, 'tests/fixtures/shell/clean.sh');
    const cleanResult = spawnSync('npm', ['run', 'lint:shell', '--', cleanFixture], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(cleanResult.status, cleanFixture).toBe(0);
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

  it('requires pushing the LEARNINGS commit before starting another lane', () => {
    expect(foremanGuide).toMatch(
      /push(?:ing)? (?:the )?LEARNINGS commit before (?:starting|the next lane)/i,
    );
    expect(foremanGuide).toMatch(/unpushed.*(?:lane|commit)|(?:lane|commit).*unpushed/i);
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

  it('starts the default Devin foreman in the main workspace pane with Herdr skill context', () => {
    expect(laneScript).toMatch(/foreman\(\)[\s\S]*?agent="\$\{1:-devin\}"/);
    expect(laneScript).toContain('claude-opus-5-5-high');
    expect(laneScript).toContain('herdr --skill');
    expect(laneScript).toContain('herdr agent start foreman');
    expect(laneScript).toContain('herdr pane current');
  });

  it('uses a non-prompting foreman permission mode and explains the choice', () => {
    expect(laneScript).toContain('--permission-mode dangerous');
    expect(laneScript).toContain('auto mode prompts for generic shell reads');
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
