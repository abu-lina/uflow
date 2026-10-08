import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  // --- dry run -------------------------------------------------------------

  it('with no flags prints the plan and launches nothing', () => {
    const { stdout, status } = run(sb, [], useMonitor(sb, 'monitor-one-free-slot.ndjson'));
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

  function plistAsJson(plistXml: string, dir: string): Record<string, unknown> {
    const plistPath = path.join(dir, 'agent.plist');
    fs.writeFileSync(plistPath, plistXml);
    const lint = spawnSync('plutil', ['-lint', plistPath], { encoding: 'utf8' });
    expect(lint.status).toBe(0);
    const conv = spawnSync('plutil', ['-convert', 'json', '-o', '-', plistPath], {
      encoding: 'utf8',
    });
    expect(conv.status).toBe(0);
    return JSON.parse(conv.stdout);
  }

  it('--print-plist passes plutil -lint and carries the pinned fields', () => {
    const { stdout, status } = run(sb, ['--print-plist']);
    expect(status).toBe(0);
    const plist = plistAsJson(stdout, sb.dir);
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

  it('--interval overrides StartInterval', () => {
    const { stdout } = run(sb, ['--print-plist', '--interval', '900']);
    expect(plistAsJson(stdout, sb.dir).StartInterval).toBe(900);
  });

  it('--install writes the plist and prints the manual bootstrap instructions', () => {
    const { stdout, status } = run(sb, ['--install']);
    expect(status).toBe(0);
    const plistPath = path.join(sb.launchAgentsDir, 'com.uflow.agent-dispatch.plist');
    expect(fs.existsSync(plistPath)).toBe(true);
    const lint = spawnSync('plutil', ['-lint', plistPath], { encoding: 'utf8' });
    expect(lint.status).toBe(0);
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

  // --- selection: cap and skip reasons --------------------------------------

  function occupiedRecord(n: number): string {
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

  function feedMonitor(sb: StubSandbox, records: string[]): Record<string, string> {
    const p = sb.writeFixture('monitor.ndjson', ndjson(records));
    return { MONITOR_NDJSON: p };
  }

  it('at cap (4/4) launches nothing and prints the cap skip', () => {
    const { stdout, status } = run(sb, ['--launch'], useMonitor(sb, 'monitor-at-cap.ndjson'));
    expect(status).toBe(0);
    expect(stdout).toContain('occupied 4/4 slots');
    expect(stdout).toContain('skip #700: concurrency cap reached (4/4 slots occupied)');
    expect(sb.called('osascript')).toBe(false);
  });

  it('re-checked cap: a second --launch against the post-launch state does not overshoot', () => {
    const first = run(sb, ['--launch'], useMonitor(sb, 'monitor-one-free-slot.ndjson'));
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
    const { stdout, status } = run(sb, ['--launch'], env);
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

  // --- launcher and prompt ---------------------------------------------------

  it('--launch writes a launcher under the state dir and calls osascript once', () => {
    const before = spawnSync('git', ['-C', REPO_ROOT, 'status', '--porcelain'], {
      encoding: 'utf8',
    }).stdout;
    const { stdout, status } = run(sb, ['--launch'], {
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
    run(sb, ['--launch'], {
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
    run(sb, ['--launch'], {
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
    const { stdout, status } = run(sb, ['--launch'], {
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
    const { status } = run(sb, ['--launch'], {
      ...useMonitor(sb, 'monitor-one-free-slot.ndjson'),
      UFLOW_NOW: String(NOW),
    });
    expect(status).toBe(0);
    expect(sb.called('osascript')).toBe(true);
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
    const relaunch = run(sb, ['--launch'], useMonitor(sb, 'monitor-one-free-slot.ndjson'));
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
        const p = spawn(DISPATCH, ['--launch'], { env });
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
    const { stdout, status } = run(sb, ['--launch'], {
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
