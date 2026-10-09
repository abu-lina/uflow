import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parsePlistDict } from './helpers/plist';
import {
  makeSandbox,
  monitorRecord,
  ndjson,
  removeSandbox,
  type StubSandbox,
} from './helpers/shell-stubs';

const REPO_ROOT = path.resolve(__dirname, '../..');
const DISPATCH = path.join(REPO_ROOT, 'scripts/agent-dispatch.sh');
const FIXTURE_DIR = path.join(__dirname, 'fixtures/agent-dispatch');

/** The dispatcher derives REPO_DIR from the first worktree-list record. */
function seedRepoDir(sb: StubSandbox): void {
  fs.copyFileSync(
    path.join(FIXTURE_DIR, 'worktree-list.txt'),
    path.join(sb.fixtureDir, 'worktree-list.txt'),
  );
}

/** Point the monitor stub at a fixture NDJSON file. */
function useMonitor(sb: StubSandbox, fixtureName: string): Record<string, string> {
  return { MONITOR_NDJSON: path.join(FIXTURE_DIR, fixtureName) };
}

interface RunResult {
  stdout: string;
  stderr: string;
  status: number;
}

function run(
  sb: StubSandbox,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
): RunResult {
  const r = spawnSync(DISPATCH, args, {
    env: { ...process.env, ...sb.env, ...extraEnv },
    encoding: 'utf8',
  });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status ?? -1 };
}

describe('agent-dispatch.sh', () => {
  let sb: StubSandbox;
  beforeEach(() => {
    sb = makeSandbox('uflow-dispatch-');
    seedRepoDir(sb);
  });
  afterEach(() => {
    removeSandbox(sb);
  });

  // --- usage ---------------------------------------------------------------

  it('--help exits 0 and names every flag', () => {
    const { stdout, status } = run(sb, ['--help']);
    expect(status).toBe(0);
    for (const flag of [
      '--launch',
      '--max',
      '--max-per-hour',
      '--max-prep',
      '--max-build',
      '--only',
      '--terminal',
      '--disable',
      '--enable',
      '--install',
      '--uninstall',
      '--print-plist',
      '--interval',
    ]) {
      expect(stdout).toContain(flag);
    }
    // the global caps keep their defaults and stay the hard ceilings
    expect(stdout).toMatch(/--max N.*default 4/);
    expect(stdout).toMatch(/--max-per-hour N.*default 3/);
  });

  it('exits 2 on an unknown flag', () => {
    expect(run(sb, ['--bogus']).status).toBe(2);
  });

  it('--terminal accepts only terminal; ghostty exits 2 with the documented message', () => {
    const { status, stderr, stdout } = run(sb, ['--terminal', 'ghostty']);
    expect(status).toBe(2);
    expect(stderr + stdout).toContain(
      "only Terminal.app is supported; Ghostty has no 'do script' equivalent",
    );
  });

  it('combining a terminal mode with --launch exits 2', () => {
    expect(run(sb, ['--print-plist', '--launch']).status).toBe(2);
    expect(run(sb, ['--disable', '--launch']).status).toBe(2);
  });

  it('exits 2, not 1, when a flag is missing its argument', () => {
    for (const flag of [
      '--max',
      '--max-per-hour',
      '--max-prep',
      '--max-build',
      '--only',
      '--terminal',
      '--interval',
    ]) {
      const { status, stderr } = run(sb, [flag]);
      expect(status, `${flag} with no argument`).toBe(2);
      expect(stderr, `${flag} with no argument`).toContain(flag);
    }
  });

  it('exits 2 when a numeric flag gets a non-number', () => {
    for (const flag of [
      '--max',
      '--max-per-hour',
      '--max-prep',
      '--max-build',
      '--only',
      '--interval',
    ]) {
      const { status, stderr } = run(sb, [flag, 'abc']);
      expect(status, `${flag} abc`).toBe(2);
      expect(stderr, `${flag} abc`).toContain(flag);
    }
  });

  it('--only cannot be combined with a terminal mode', () => {
    const { status, stderr } = run(sb, ['--only', '5', '--disable']);
    expect(status).toBe(2);
    expect(stderr).toContain('--only');
  });

  it('fails with a readable jq message when jq is not on PATH', () => {
    const { status, stderr, stdout } = run(sb, ['--launch'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      JQ_BIN: '/nonexistent/jq-definitely-missing',
    });
    expect(status).toBe(1);
    expect(stderr + stdout).toContain('jq');
    expect(stderr + stdout).toMatch(/brew install jq/);
    // the guard fires before the lock is taken
    expect(fs.existsSync(lockDir())).toBe(false);
  });

  it('--print-plist still works when jq is missing (terminal modes need none)', () => {
    const { status } = run(sb, ['--print-plist'], {
      JQ_BIN: '/nonexistent/jq-definitely-missing',
    });
    expect(status).toBe(0);
  });

  // --- dry run -------------------------------------------------------------

  it('with no flags prints the plan and launches nothing', () => {
    // --max-build 4: the fixture's three stage-less occupied records count as
    // build work under the stage cap, so at the default 3 the plan would be
    // "build cap reached" instead of "would launch" — the point here is the
    // dry-run plan, not stage budgets.
    const { stdout, status } = run(
      sb,
      ['--max-build', '4'],
      useMonitor(sb, 'monitor-one-free-slot.ndjson'),
    );
    expect(status).toBe(0);
    expect(stdout).toContain('occupied 3/4 slots');
    expect(stdout).toContain('would launch #700');
    expect(sb.called('osascript')).toBe(false);
    expect(fs.existsSync(path.join(sb.stateDir, 'launches.log'))).toBe(false);
  });

  it('prints "<n> slot free; no eligible candidates" when nothing qualifies', () => {
    const { stdout, status } = run(sb, [], useMonitor(sb, 'monitor-live-2026-xx.ndjson'));
    expect(status).toBe(0);
    // live replay: 3 occupied of 4, and the only ready issue (#528) is no-parallel
    expect(stdout).toContain('occupied 3/4 slots');
    expect(stdout).toContain('skip #528: labeled no-parallel');
    expect(stdout).toContain('1 slot free; no eligible candidates');
  });

  // --- plist modes ---------------------------------------------------------

  it('--print-plist carries the pinned fields', () => {
    const { stdout, status } = run(sb, ['--print-plist']);
    expect(status).toBe(0);
    // parsed in-process (helpers/plist.ts): this assertion is cross-platform
    const plist = parsePlistDict(stdout);
    expect(plist.Label).toBe('com.uflow.agent-dispatch');
    expect(plist.StartInterval).toBe(600);
    expect(plist.RunAtLoad).toBe(false);
    expect(plist.ProgramArguments).toEqual([
      '/usr/bin/env',
      'bash',
      '/fake/uflow/scripts/agent-dispatch.sh',
      '--launch',
    ]);
    expect(plist.WorkingDirectory).toBe('/fake/uflow');
    expect(plist.StandardOutPath).toBe(sb.dispatchLog);
    expect(plist.StandardErrorPath).toBe(sb.dispatchLog);
    // writing nothing is part of the contract
    expect(fs.readdirSync(sb.launchAgentsDir)).toEqual([]);
  });

  // Platform gate, not a disabled test: plutil ships only with macOS, so the
  // real-binary lint cannot run on the Ubuntu CI runner. The field
  // assertions above and below parse the XML in-process and run everywhere.
  it.skipIf(process.platform !== 'darwin')(
    'plutil -lint accepts the --print-plist and --install output (macOS-only binary)',
    () => {
      const printed = run(sb, ['--print-plist']);
      expect(printed.status).toBe(0);
      const printedPath = path.join(sb.dir, 'printed.plist');
      fs.writeFileSync(printedPath, printed.stdout);
      const lintPrinted = spawnSync('plutil', ['-lint', printedPath], { encoding: 'utf8' });
      expect(lintPrinted.status).toBe(0);

      run(sb, ['--install']);
      const installedPath = path.join(sb.launchAgentsDir, 'com.uflow.agent-dispatch.plist');
      const lintInstalled = spawnSync('plutil', ['-lint', installedPath], {
        encoding: 'utf8',
      });
      expect(lintInstalled.status).toBe(0);
    },
  );

  it('--interval overrides StartInterval', () => {
    const { stdout } = run(sb, ['--print-plist', '--interval', '900']);
    expect(parsePlistDict(stdout).StartInterval).toBe(900);
  });

  it('--install writes the plist and prints the manual bootstrap instructions', () => {
    const { stdout, status } = run(sb, ['--install']);
    expect(status).toBe(0);
    const plistPath = path.join(sb.launchAgentsDir, 'com.uflow.agent-dispatch.plist');
    expect(fs.existsSync(plistPath)).toBe(true);
    // written file is a real plist dict with the label launchd will register
    expect(parsePlistDict(fs.readFileSync(plistPath, 'utf8')).Label).toBe(
      'com.uflow.agent-dispatch',
    );
    expect(stdout).toContain('The agent is NOT loaded');
    expect(stdout).toContain('launchctl bootstrap');
    expect(stdout).toContain('launchctl bootout');
  });

  it('--uninstall removes the plist and is idempotent', () => {
    run(sb, ['--install']);
    const plistPath = path.join(sb.launchAgentsDir, 'com.uflow.agent-dispatch.plist');
    const first = run(sb, ['--uninstall']);
    expect(first.status).toBe(0);
    expect(first.stdout).toContain(`removed ${plistPath}`);
    expect(fs.existsSync(plistPath)).toBe(false);
    const second = run(sb, ['--uninstall']);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain(`nothing to remove at ${plistPath}`);
  });

  it('derives REPO_DIR from a worktree list larger than the pipe buffer', () => {
    // >64KB of worktree output defeats `| head -n 1` under pipefail: once head
    // exits, the writer takes SIGPIPE and the pipeline fails. The derivation
    // must drain the whole stream.
    const pad = Array.from(
      { length: 4000 },
      (_, i) => `worktree /fake/uflow-wt/pad-${i}\nHEAD ${String(i).padStart(40, '0')}\n\n`,
    ).join('');
    fs.writeFileSync(
      path.join(sb.fixtureDir, 'worktree-list.txt'),
      `worktree /fake/uflow\nHEAD ${'0'.repeat(40)}\nbranch refs/heads/main\n\n${pad}`,
    );
    const { stdout, status } = run(sb, ['--print-plist']);
    expect(status).toBe(0);
    expect(stdout).toContain('/fake/uflow/scripts/agent-dispatch.sh');
  });

  // --- selection: cap and skip reasons --------------------------------------

  function occupiedRecord(n: number, extra: object = {}): string {
    return monitorRecord({
      issue: n,
      title: `in-flight ${n}`,
      state: 'in-flight',
      issue_state: 'OPEN',
      labels: ['ready-for-agent'],
      worktree: `/fake/uflow-wt/${n}-x`,
      branch: `fix/${n}-x`,
      commits_ahead: 1,
      pr: null,
      phases: 1,
      occupies_slot: true,
      ...extra,
    });
  }

  function readyRecord(n: number, labels = ['ready-for-agent'], extra: object = {}): string {
    return monitorRecord({
      issue: n,
      title: `ready ${n} title`,
      state: 'ready',
      issue_state: 'OPEN',
      labels,
      worktree: null,
      branch: null,
      commits_ahead: 0,
      pr: null,
      phases: 0,
      occupies_slot: false,
      ...extra,
    });
  }

  /** A ready record carrying the no-parallel label — the serial-slot input. */
  function serialRecord(n: number, extra: object = {}): string {
    return monitorRecord({
      issue: n,
      title: `serial ${n} title`,
      state: 'ready',
      issue_state: 'OPEN',
      labels: ['ready-for-agent', 'no-parallel'],
      worktree: null,
      branch: null,
      commits_ahead: 0,
      pr: null,
      phases: 0,
      occupies_slot: false,
      ...extra,
    });
  }

  function feedMonitor(sb: StubSandbox, records: string[]): Record<string, string> {
    const p = sb.writeFixture('monitor.ndjson', ndjson(records));
    return { MONITOR_NDJSON: p };
  }

  /** Read the prompt out of the single launcher a run wrote. */
  function launchedPrompt(sb: StubSandbox): string {
    const dir = path.join(sb.stateDir, 'launchers');
    const launcher = path.join(dir, fs.readdirSync(dir)[0]);
    return spawnSync('bash', [launcher], { encoding: 'utf8' }).stdout;
  }

  it('at cap (4/4) launches nothing and prints the cap skip', () => {
    const { stdout, status } = run(sb, ['--launch'], useMonitor(sb, 'monitor-at-cap.ndjson'));
    expect(status).toBe(0);
    expect(stdout).toContain('occupied 4/4 slots');
    expect(stdout).toContain('skip #700: concurrency cap reached (4/4 slots occupied)');
    expect(sb.called('osascript')).toBe(false);
  });

  it('re-checked cap: a second --launch against the post-launch state does not overshoot', () => {
    const first = run(
      sb,
      ['--launch', '--max-build', '4'],
      useMonitor(sb, 'monitor-one-free-slot.ndjson'),
    );
    expect(first.status).toBe(0);
    expect(first.stdout).toContain('launched #700');
    // after the launch, #700 occupies: second run sees 4/4
    const after = ndjson([
      occupiedRecord(541),
      occupiedRecord(542),
      occupiedRecord(543),
      monitorRecord({
        issue: 700,
        title: 'now in-flight',
        state: 'in-flight',
        issue_state: 'OPEN',
        labels: ['ready-for-agent'],
        worktree: '/fake/uflow-wt/700-x',
        branch: 'fix/700-x',
        commits_ahead: 0,
        pr: null,
        phases: 0,
        occupies_slot: true,
      }),
    ]);
    const second = run(sb, ['--launch'], { MONITOR_NDJSON: sb.writeFixture('m2.ndjson', after) });
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('occupied 4/4 slots');
    expect(second.stdout).not.toContain('launched #');
  });

  it('multiple candidates with one free slot: first launches, the rest get the cap skip', () => {
    const env = feedMonitor(sb, [
      occupiedRecord(541),
      occupiedRecord(542),
      occupiedRecord(543),
      readyRecord(700),
      readyRecord(701),
    ]);
    const { stdout, status } = run(sb, ['--launch', '--max-build', '4'], env);
    expect(status).toBe(0);
    expect(stdout).toContain('launched #700');
    expect(stdout).toContain('skip #701: concurrency cap reached (4/4 slots occupied)');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('skips a ready record that lost the ready-for-agent label', () => {
    const env = feedMonitor(sb, [readyRecord(700, ['bug'])]);
    const { stdout } = run(sb, [], env);
    expect(stdout).toContain('skip #700: not labeled ready-for-agent');
  });

  it('skips a ready record that already has a worktree', () => {
    const env = feedMonitor(sb, [
      monitorRecord({
        issue: 700,
        title: 't',
        state: 'ready',
        issue_state: 'OPEN',
        labels: ['ready-for-agent'],
        worktree: '/fake/uflow-wt/700-x',
        branch: null,
        commits_ahead: 0,
        pr: null,
        phases: 0,
        occupies_slot: false,
      }),
    ]);
    const { stdout } = run(sb, [], env);
    expect(stdout).toContain('skip #700: worktree exists at /fake/uflow-wt/700-x');
  });

  it('skips a ready record that already has a branch', () => {
    const env = feedMonitor(sb, [
      monitorRecord({
        issue: 700,
        title: 't',
        state: 'ready',
        issue_state: 'OPEN',
        labels: ['ready-for-agent'],
        worktree: null,
        branch: 'fix/700-x',
        commits_ahead: 0,
        pr: null,
        phases: 0,
        occupies_slot: false,
      }),
    ]);
    const { stdout } = run(sb, [], env);
    expect(stdout).toContain('skip #700: branch fix/700-x exists');
  });

  it('skips a no-parallel issue by label (#528 in the frozen fixture)', () => {
    const { stdout } = run(sb, ['--launch'], useMonitor(sb, 'monitor-live-2026-xx.ndjson'));
    expect(stdout).toContain('skip #528: labeled no-parallel');
    expect(sb.called('osascript')).toBe(false);
  });

  it('reports a stalled record and never dispatches it', () => {
    const env = feedMonitor(sb, [
      monitorRecord({
        issue: 700,
        title: 'stalled work',
        state: 'stalled',
        issue_state: 'OPEN',
        labels: ['ready-for-agent'],
        worktree: '/fake/uflow-wt/700-x',
        branch: 'fix/700-x',
        commits_ahead: 0,
        pr: null,
        phases: 0,
        occupies_slot: true,
      }),
    ]);
    const { stdout, status } = run(sb, ['--launch'], env);
    expect(status).toBe(0);
    expect(stdout).toContain('skip #700: stalled, never auto-dispatched');
    expect(sb.called('osascript')).toBe(false);
  });

  // --- stage axis: blockers, per-stage caps, serial slot, --only --------------

  it('skips a candidate with an open blocker', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:build'], {
        stage: 'build',
        blocked_by: [588],
      }),
    ]);
    const { stdout, status } = run(sb, ['--launch'], env);
    expect(status).toBe(0);
    expect(stdout).toContain('skip #700: blocked by #588');
    expect(sb.called('osascript')).toBe(false);
  });

  it('lists every open blocker in the skip line', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent'], { blocked_by: [588, 592] }),
    ]);
    const { stdout } = run(sb, [], env);
    expect(stdout).toContain('skip #700: blocked by #588, #592');
  });

  it('does not skip when every blocker is closed (blocked_by is empty)', () => {
    const env = feedMonitor(sb, [readyRecord(700, ['ready-for-agent'], { blocked_by: [] })]);
    const { stdout } = run(sb, [], env);
    expect(stdout).toContain('would launch #700');
    expect(stdout).not.toContain('blocked by');
  });

  it('the global concurrency cap fires in preference to the per-stage cap', () => {
    const env = feedMonitor(sb, [
      occupiedRecord(541),
      occupiedRecord(542),
      occupiedRecord(543),
      occupiedRecord(544),
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
    ]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('skip #700: concurrency cap reached (4/4 slots occupied)');
    expect(stdout).not.toContain('prep cap');
  });

  it('prep cap reached while build slots remain free', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
      readyRecord(701, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
      readyRecord(702, ['ready-for-agent', 'stage:build'], { stage: 'build' }),
    ]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('launched #700');
    expect(stdout).toContain('skip #701: prep cap reached (1/1)');
    expect(stdout).toContain('launched #702');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('--max-prep raises the prep launch cap for the run', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
      readyRecord(701, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
    ]);
    const { stdout } = run(sb, ['--launch', '--max-prep', '2'], env);
    expect(stdout).toContain('launched #700');
    expect(stdout).toContain('launched #701');
    expect(stdout).not.toContain('prep cap');
  });

  // Per-stage caps are true concurrency limits, not launch counters: a stage
  // slot is occupied while the issue has a worktree or branch AND has not hit
  // the stage's exit condition (prep: flipped to needs-info; build: a PR
  // exists for the branch). Both pairs below pin the exit conditions.

  it('a finished prep session (needs-info flipped, worktree surviving) frees the prep slot', () => {
    const env = feedMonitor(sb, [
      occupiedRecord(541, {
        stage: 'prep',
        labels: ['stage:prep', 'needs-info'],
      }),
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
      readyRecord(701, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
    ]);
    const { stdout } = run(sb, ['--launch'], env);
    // anti-deadlock: #541's leftover worktree does not hold the prep slot
    expect(stdout).toContain('launched #700');
    // and the cap still binds inside the same run
    expect(stdout).toContain('skip #701: prep cap reached (1/1)');
  });

  it('a live prep session (worktree, still stage:prep, no needs-info) occupies the prep slot', () => {
    const env = feedMonitor(sb, [
      occupiedRecord(541, { stage: 'prep', labels: ['stage:prep'] }),
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
    ]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('skip #700: prep cap reached (1/1)');
    expect(sb.called('osascript')).toBe(false);
  });

  it('a finished build session (PR exists for the branch) frees the build slot', () => {
    const env = feedMonitor(sb, [
      monitorRecord({
        issue: 541,
        title: 'build gone to review',
        state: 'awaiting-review',
        issue_state: 'OPEN',
        labels: ['stage:build'],
        worktree: '/fake/uflow-wt/541-b',
        branch: 'fix/541-b',
        commits_ahead: 3,
        pr: 555,
        phases: 2,
        occupies_slot: false,
        stage: 'build',
      }),
      readyRecord(700, ['ready-for-agent', 'stage:build'], { stage: 'build' }),
    ]);
    const { stdout } = run(sb, ['--launch', '--max-build', '1'], env);
    expect(stdout).toContain('launched #700');
  });

  it('a live build session (worktree, no PR yet) occupies the build slot', () => {
    const env = feedMonitor(sb, [
      occupiedRecord(541, { stage: 'build', labels: ['stage:build'] }),
      readyRecord(700, ['ready-for-agent', 'stage:build'], { stage: 'build' }),
    ]);
    const { stdout } = run(sb, ['--launch', '--max-build', '1'], env);
    expect(stdout).toContain('skip #700: build cap reached (1/1)');
    expect(sb.called('osascript')).toBe(false);
  });

  // the frozen live fixture is the AC8 third case: 3/4 slots occupied
  it('serial slot: launches a no-parallel issue when nothing occupies a slot and nothing else is queued', () => {
    const env = feedMonitor(sb, [serialRecord(528)]);
    const { stdout, status } = run(sb, ['--launch'], env);
    expect(status).toBe(0);
    expect(stdout).toContain('occupied 0/4 slots');
    expect(stdout).toContain('launched #528');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('serial slot: defers while parallel work is queued', () => {
    const env = feedMonitor(sb, [serialRecord(528), readyRecord(700)]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('skip #528: serial, deferred while parallel work is queued');
    expect(stdout).toContain('launched #700');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('serial slot: still refuses when a slot is occupied', () => {
    const env = feedMonitor(sb, [occupiedRecord(541), serialRecord(528)]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('skip #528: labeled no-parallel');
    expect(sb.called('osascript')).toBe(false);
  });

  it('serial slot: after a serial launch the run launches nothing else', () => {
    const env = feedMonitor(sb, [serialRecord(528), serialRecord(529)]);
    const { stdout } = run(sb, ['--launch'], env);
    expect(stdout).toContain('launched #528');
    expect(stdout).not.toContain('launched #529');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('--only N dispatches exactly that issue and nothing else', () => {
    const env = feedMonitor(sb, [readyRecord(700), readyRecord(701)]);
    const { stdout } = run(sb, ['--launch', '--only', '701'], env);
    expect(stdout).toContain('launched #701');
    expect(stdout).not.toContain('would launch #700');
    expect(stdout).not.toContain('launched #700');
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('--only without --launch launches nothing', () => {
    const env = feedMonitor(sb, [readyRecord(700)]);
    const { stdout, status } = run(sb, ['--only', '700'], env);
    expect(status).toBe(0);
    expect(stdout).toContain('would launch #700');
    expect(sb.called('osascript')).toBe(false);
  });

  it('--only is the serial escape hatch: launches a no-parallel issue even with parallel work queued', () => {
    const env = feedMonitor(sb, [serialRecord(528), readyRecord(700)]);
    const { stdout } = run(sb, ['--launch', '--only', '528'], env);
    expect(stdout).toContain('launched #528');
    expect(stdout).not.toContain('would launch #700');
    expect(stdout).not.toContain('launched #700');
  });

  it('--only still respects every refusal line (kill switch shown here)', () => {
    const env = feedMonitor(sb, [readyRecord(700)]);
    const { stdout, status } = run(sb, ['--launch', '--only', '700'], {
      ...env,
      UFLOW_DISPATCH_DISABLED: '1',
    });
    expect(status).toBe(0);
    expect(stdout).toContain('refusing to dispatch: disabled by UFLOW_DISPATCH_DISABLED=1');
    expect(sb.called('osascript')).toBe(false);
  });

  it('--only cannot force a serial launch while a slot is occupied', () => {
    const env = feedMonitor(sb, [occupiedRecord(541), serialRecord(528)]);
    const { stdout } = run(sb, ['--launch', '--only', '528'], env);
    expect(stdout).toContain('skip #528: labeled no-parallel');
    expect(sb.called('osascript')).toBe(false);
  });

  // --- launcher and prompt ---------------------------------------------------

  it('--launch writes a launcher under the state dir and calls osascript once', () => {
    const before = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain'], {
      encoding: 'utf8',
    }).stdout;
    const { stdout, status } = run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_REPO_DIR: sb.dir,
    });
    expect(status).toBe(0);
    const osaLog = sb.readLog('osascript').split('\n').filter(Boolean);
    expect(osaLog).toHaveLength(1);
    expect(osaLog[0]).toContain('tell application "Terminal" to do script');
    const launchers = fs.readdirSync(path.join(sb.stateDir, 'launchers'));
    expect(launchers).toHaveLength(1);
    const launcher = path.join(sb.stateDir, 'launchers', launchers[0]);
    expect(launchers[0]).toMatch(/^issue-700-\d+\.sh$/);
    expect(osaLog[0]).toContain(launcher);
    expect(fs.statSync(launcher).mode & 0o777).toBe(0o700);
    expect(stdout).toContain(`launched #700 in a new Terminal window (${launcher})`);
    // nothing was written into the repo
    const after = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain'], {
      encoding: 'utf8',
    }).stdout;
    expect(after).toBe(before);
  });

  it('launcher content: quoted heredoc delimiter, devin -- "$PROMPT", never devin -p', () => {
    run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_REPO_DIR: sb.dir,
    });
    const launcher = path.join(
      sb.stateDir,
      'launchers',
      fs.readdirSync(path.join(sb.stateDir, 'launchers'))[0],
    );
    const body = fs.readFileSync(launcher, 'utf8');
    expect(body).toContain("<<'UFLOW_PROMPT_EOF'");
    const execLine = body.split('\n').find((l) => l.startsWith('exec ')) ?? '';
    expect(execLine).toBe(`exec "${sb.binDir}/devin" -- "$PROMPT"`);
    expect(execLine).not.toMatch(/-p\b/);
    // round-trip: a literal $ in the title must survive into the launched prompt
    const out = spawnSync('bash', [launcher], { encoding: 'utf8' });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain('cost is $5 flat'); // the fixture title carries a literal $
  });

  it('prompt names resume, Step 1 setup, write scope and the other in-flight issues', () => {
    run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_REPO_DIR: sb.dir,
    });
    const launcher = path.join(
      sb.stateDir,
      'launchers',
      fs.readdirSync(path.join(sb.stateDir, 'launchers'))[0],
    );
    const prompt = spawnSync('bash', [launcher], { encoding: 'utf8' }).stdout;
    expect(prompt).toContain('/orchestrator resume 700');
    expect(prompt).toContain('Step 1 setup has not run');
    expect(prompt).toContain('write scope');
    expect(prompt).toContain('uflow-wt');
    expect(prompt).toContain('orchestrator rule 5');
    for (const other of ['541', '542', '543']) {
      expect(prompt).toContain(other);
    }
    expect(prompt).toContain('Do not touch');
  });

  it('prompt says "No other issues are currently in flight." when none occupy slots', () => {
    const env = feedMonitor(sb, [readyRecord(700)]);
    run(sb, ['--launch'], { ...env, UFLOW_REPO_DIR: sb.dir });
    const launcher = path.join(
      sb.stateDir,
      'launchers',
      fs.readdirSync(path.join(sb.stateDir, 'launchers'))[0],
    );
    const prompt = spawnSync('bash', [launcher], { encoding: 'utf8' }).stdout;
    expect(prompt).toContain('No other issues are currently in flight.');
  });

  it('a stage:prep launch names the prep flow in the prompt', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
    ]);
    run(sb, ['--launch'], { ...env, UFLOW_REPO_DIR: sb.dir });
    const prompt = launchedPrompt(sb);
    expect(prompt).toContain('stage:prep');
    expect(prompt).toContain('flows/prep.md');
  });

  it('a stage:build launch keeps the build prompt, with no prep wording', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:build'], { stage: 'build' }),
    ]);
    run(sb, ['--launch'], { ...env, UFLOW_REPO_DIR: sb.dir });
    const prompt = launchedPrompt(sb);
    expect(prompt).toContain('/orchestrator resume 700');
    expect(prompt).toContain('Step 1 setup has not run');
    expect(prompt).not.toContain('flows/prep.md');
  });

  // --- rate limit ledger -------------------------------------------------------

  const NOW = 1_800_000_000;

  function seedLedger(lines: string[]): void {
    fs.writeFileSync(path.join(sb.stateDir, 'launches.log'), lines.join('\n') + '\n');
  }

  function ledgerLines(): string[] {
    const p = path.join(sb.stateDir, 'launches.log');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean) : [];
  }

  it('three launches inside the hour block the next one', () => {
    seedLedger([`${NOW - 100} 1`, `${NOW - 200} 2`, `${NOW - 300} 3`]);
    const { stdout, status } = run(sb, ['--launch'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(stdout).toContain('skip #700: hourly launch limit reached (3 in the last hour)');
    expect(sb.called('osascript')).toBe(false);
  });

  it('ledger entries older than one hour do not count', () => {
    seedLedger([`${NOW - 4000} 1`, `${NOW - 4000} 2`, `${NOW - 4000} 3`]);
    const { stdout, status } = run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(stdout).toContain('launched #700');
  });

  it('prunes ledger lines older than 24h, keeps newer ones', () => {
    seedLedger([`${NOW - 90000} 1`, `${NOW - 4000} 2`]);
    run(sb, [], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(ledgerLines()).toEqual([`${NOW - 4000} 2`]);
  });

  it('ignores malformed ledger lines instead of dying', () => {
    seedLedger(['garbage', `${NOW - 100} notanumber`, '', `${NOW - 50} 9`]);
    const { status } = run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(sb.called('osascript')).toBe(true);
  });

  it('writes the stage as the ledger third field', () => {
    const env = feedMonitor(sb, [
      readyRecord(700, ['ready-for-agent', 'stage:prep'], { stage: 'prep' }),
      readyRecord(701, ['ready-for-agent'], { stage: 'build' }),
    ]);
    run(sb, ['--launch', '--max-prep', '2'], { ...env, UFLOW_NOW: String(NOW) });
    expect(ledgerLines()).toEqual([`${NOW} 700 prep`, `${NOW} 701 build`]);
  });

  // --- kill switch -------------------------------------------------------------

  it('--disable then --launch refuses with the sentinel path and exits 0', () => {
    const dis = run(sb, ['--disable']);
    expect(dis.status).toBe(0);
    const sentinel = path.join(sb.stateDir, 'DISABLED');
    expect(fs.existsSync(sentinel)).toBe(true);
    const { stdout, status } = run(
      sb,
      ['--launch'],
      useMonitor(sb, 'monitor-one-free-slot.ndjson'),
    );
    expect(status).toBe(0);
    expect(stdout).toContain(`refusing to dispatch: disabled by ${sentinel}`);
    expect(sb.called('osascript')).toBe(false);
    // refused before the lock: no lockdir was created
    expect(fs.existsSync(path.join(sb.stateDir, 'dispatch.lock'))).toBe(false);
    // --enable removes it and the launch proceeds
    const en = run(sb, ['--enable']);
    expect(en.status).toBe(0);
    expect(fs.existsSync(sentinel)).toBe(false);
    const relaunch = run(
      sb,
      ['--launch', '--max-build', '4'],
      useMonitor(sb, 'monitor-one-free-slot.ndjson'),
    );
    expect(relaunch.stdout).toContain('launched #700');
  });

  it('UFLOW_DISPATCH_DISABLED=1 refuses before the lockdir is created', () => {
    const { stdout, status } = run(sb, ['--launch'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_DISPATCH_DISABLED: '1',
    });
    expect(status).toBe(0);
    expect(stdout).toContain('refusing to dispatch: disabled by UFLOW_DISPATCH_DISABLED=1');
    expect(fs.existsSync(path.join(sb.stateDir, 'dispatch.lock'))).toBe(false);
  });

  // --- the lock -----------------------------------------------------------------

  function lockDir(): string {
    return path.join(sb.stateDir, 'dispatch.lock');
  }

  it('two concurrent --launch runs resolve to exactly one launch', async () => {
    const env = {
      ...process.env,
      ...sb.env,
      MONITOR_NDJSON: path.join(FIXTURE_DIR, 'monitor-one-free-slot.ndjson'),
      MONITOR_SLEEP: '0.6', // hold the critical section long enough to overlap
    };
    const spawnOne = () =>
      new Promise<RunResult>((resolve) => {
        const p = spawn(DISPATCH, ['--launch', '--max-build', '4'], { env });
        let stdout = '';
        let stderr = '';
        p.stdout.on('data', (d) => (stdout += d));
        p.stderr.on('data', (d) => (stderr += d));
        p.on('close', (status) => resolve({ stdout, stderr, status: status ?? -1 }));
      });
    const a = spawnOne();
    await new Promise((r) => setTimeout(r, 150));
    const b = spawnOne();
    const [ra, rb] = await Promise.all([a, b]);

    expect(ra.status).toBe(0);
    expect(rb.status).toBe(0);
    const refused = [ra, rb].filter((r) =>
      r.stdout.includes('refusing to dispatch: another dispatch is in progress'),
    );
    expect(refused).toHaveLength(1);
    const launched = [ra, rb].filter((r) => r.stdout.includes('launched #700'));
    expect(launched).toHaveLength(1);
    expect(sb.readLog('osascript').split('\n').filter(Boolean)).toHaveLength(1);
    expect(ledgerLines()).toHaveLength(1);
  });

  it('breaks a stale lock whose pid is dead and older than 300s', () => {
    fs.mkdirSync(lockDir(), { recursive: true });
    fs.writeFileSync(path.join(lockDir(), 'pid'), '999999\n');
    fs.writeFileSync(path.join(lockDir(), 'started'), `${NOW - 400}\n`);
    const { stdout, status } = run(sb, ['--launch', '--max-build', '4'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(stdout).toContain('launched #700');
  });

  it('respects a lock held by a live pid with a fresh timestamp', () => {
    fs.mkdirSync(lockDir(), { recursive: true });
    fs.writeFileSync(path.join(lockDir(), 'pid'), `${process.pid}\n`); // this test process is alive
    fs.writeFileSync(path.join(lockDir(), 'started'), `${NOW}\n`);
    const { stdout, status } = run(sb, ['--launch'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(stdout).toContain('refusing to dispatch: another dispatch is in progress');
    expect(sb.called('osascript')).toBe(false);
  });

  it('releases the lock after a normal run', () => {
    run(sb, [], useMonitor(sb, 'monitor-one-free-slot.ndjson'));
    expect(fs.existsSync(lockDir())).toBe(false);
  });

  it('traps INT and TERM for lock release, not only EXIT (spec: EXIT INT TERM)', () => {
    // A trapped signal must still kill the run: a bare
    // `trap release_lock EXIT INT TERM` releases the lock and then CONTINUES
    // the script (bash 3.2 treats a caught TERM as handled, not fatal), which
    // would dispatch windows after being told to die. The correct form exits
    // on INT/TERM so the EXIT trap releases the lock.
    const body = fs.readFileSync(DISPATCH, 'utf8');
    const trapLines = body.split('\n').filter((l) => /^\s*trap\b/.test(l));
    expect(trapLines.length).toBeGreaterThan(0);
    const joined = trapLines.join('\n');
    expect(/\bINT\b/.test(joined)).toBe(true);
    expect(/\bTERM\b/.test(joined)).toBe(true);
    // every INT/TERM trap must exit — a trap that only released the lock
    // would leave the run continuing inside the critical section
    for (const l of trapLines) {
      if (/\b(INT|TERM)\b/.test(l)) expect(l).toMatch(/exit/);
    }
  });

  it('SIGTERM mid-run kills the run and releases the lock', async () => {
    const env = {
      ...process.env,
      ...sb.env,
      MONITOR_NDJSON: path.join(FIXTURE_DIR, 'monitor-one-free-slot.ndjson'),
      MONITOR_SLEEP: '2', // hold the critical section so the signal lands mid-run
    };
    const p = spawn(DISPATCH, ['--launch'], { env });
    // wait until the lock is actually held before signalling
    const deadline = Date.now() + 10_000;
    while (!fs.existsSync(lockDir()) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(fs.existsSync(lockDir())).toBe(true);
    p.kill('SIGTERM');
    const code = await new Promise<number | null>((resolve) => p.on('close', (c) => resolve(c)));
    // the signal must not be swallowed: no exit 0, and no launch after it
    expect(code).not.toBe(0);
    expect(sb.called('osascript')).toBe(false);
    // a wedged lockdir would block the queue for the 300s stale window
    expect(fs.existsSync(lockDir())).toBe(false);
  }, 15_000);

  it('SIGINT to the process group (Ctrl-C) kills the run and releases the lock', async () => {
    const env = {
      ...process.env,
      ...sb.env,
      MONITOR_NDJSON: path.join(FIXTURE_DIR, 'monitor-one-free-slot.ndjson'),
      MONITOR_SLEEP: '2',
    };
    // detached: the dispatcher gets its own process group so we can signal it
    // the way Ctrl-C does — every member, not just the shell's pid. A lone
    // SIGINT to the bash pid leaves the monitor child alive, and bash then
    // continues the script (its child was not killed by SIGINT).
    const p = spawn(DISPATCH, ['--launch'], { env, detached: true });
    const deadline = Date.now() + 10_000;
    while (!fs.existsSync(lockDir()) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(fs.existsSync(lockDir())).toBe(true);
    process.kill(-(p.pid as number), 'SIGINT');
    const code = await new Promise<number | null>((resolve) => p.on('close', (c) => resolve(c)));
    expect(code).not.toBe(0);
    expect(sb.called('osascript')).toBe(false);
    expect(fs.existsSync(lockDir())).toBe(false);
  }, 15_000);

  it('prints "monitor failed", exits 1 and still releases the lock', () => {
    const { stdout, status } = run(sb, [], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      MONITOR_EXIT: '1',
    });
    expect(status).toBe(1);
    expect(stdout).toContain('monitor failed');
    expect(fs.existsSync(lockDir())).toBe(false);
  });

  // --- safety invariants (static) ---------------------------------------------

  describe('safety invariants', () => {
    const SCRIPTS = [
      path.join(REPO_ROOT, 'scripts/agent-monitor.sh'),
      path.join(REPO_ROOT, 'scripts/agent-dispatch.sh'),
    ];

    const FORBIDDEN = [
      /gh\s+pr\s+merge/,
      /gh\s+pr\s+review/,
      /gh\s+pr\s+close/,
      /gh\s+issue\s+close/,
      /gh\s+issue\s+edit/,
      /gh\s+api[^\n]*--method\s+(POST|PATCH|PUT|DELETE)/,
      /gh\s+api\s+.*\s-(X|method)\s+(POST|PATCH|PUT|DELETE)/,
      /git\s+push/,
      /git\s+commit/,
      /git\s+merge/,
      /git\s+rebase/,
      /git\s+worktree\s+(add|remove)/,
      /git\s+branch\s+-[dD]/,
    ];

    it('neither script merges, approves, closes, pushes or commits anything', () => {
      for (const script of SCRIPTS) {
        const body = fs.readFileSync(script, 'utf8');
        for (const pattern of FORBIDDEN) {
          expect(body, `${path.basename(script)} matches ${pattern}`).not.toMatch(pattern);
        }
      }
    });

    it('every committed fixture is referenced by a test or a stub', () => {
      // a fixture nobody loads drifts silently; commit only what the suite uses
      const dir = FIXTURE_DIR;
      const sources = [
        path.join(__dirname, 'agent-dispatch.test.ts'),
        path.join(__dirname, 'agent-monitor.test.ts'),
        path.join(__dirname, 'helpers/shell-stubs.ts'),
      ]
        .map((f) => fs.readFileSync(f, 'utf8'))
        .join('\n');
      for (const f of fs.readdirSync(dir)) {
        expect(sources, `unreferenced fixture: ${f}`).toContain(f);
      }
    });

    it('neither script executes launchctl and neither hardcodes the repo path', () => {
      for (const script of SCRIPTS) {
        const lines = fs.readFileSync(script, 'utf8').split('\n');
        // track heredoc bodies: a line containing <<EOF / <<'EOF' opens one,
        // a line equal to the delimiter closes it. `launchctl` may only ever
        // appear inside a heredoc (printed instructions) or a comment.
        let heredocEnd: string | null = null;
        for (const line of lines) {
          if (heredocEnd !== null) {
            if (line === heredocEnd) heredocEnd = null;
            continue;
          }
          const open = line.match(/<<\s*'?([A-Z_]+)'?/);
          if (open) {
            heredocEnd = open[1];
            continue;
          }
          if (/^\s*#/.test(line)) continue;
          expect(
            line,
            `${path.basename(script)}: live line contains launchctl: ${line}`,
          ).not.toContain('launchctl');
        }
      }
      for (const script of SCRIPTS) {
        expect(fs.readFileSync(script, 'utf8')).not.toContain('/Users/NARAFIQ/Projects/uflow');
      }
    });
  });
});
