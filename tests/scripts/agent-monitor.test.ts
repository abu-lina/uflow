import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeSandbox, removeSandbox, type StubSandbox } from './helpers/shell-stubs';

const REPO_ROOT = path.resolve(__dirname, '../..');
const MONITOR = path.join(REPO_ROOT, 'scripts/agent-monitor.sh');

/** Minimal empty-state fixtures: a lone main worktree and no branches/issues. */
function seedEmpty(sb: StubSandbox): void {
  sb.writeFixture(
    'worktree-list.txt',
    'worktree /fake/uflow\nHEAD 0000000000000000000000000000000000000001\nbranch refs/heads/main\n\n',
  );
  sb.writeFixture('refs.txt', 'main\norigin/main\n');
  sb.writeFixture('ready-agent.json', '[]');
  sb.writeFixture('ready-human.json', '[]');
  sb.writeFixture('pr-list.json', '[]');
}

function run(
  sb: StubSandbox,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync(MONITOR, args, {
      env: { ...process.env, ...sb.env, ...extraEnv },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', status: 0 };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', status: err.status ?? -1 };
  }
}

describe('agent-monitor.sh', () => {
  let sb: StubSandbox;
  beforeEach(() => {
    sb = makeSandbox('uflow-monitor-');
  });
  afterEach(() => {
    removeSandbox(sb);
  });

  it('--help exits 0 and names every flag', () => {
    const { stdout, status } = run(sb, ['--help']);
    expect(status).toBe(0);
    for (const flag of ['--json', '--max', '--repo', '--help']) {
      expect(stdout).toContain(flag);
    }
  });

  it('exits 2 on an unknown flag', () => {
    const { status } = run(sb, ['--bogus']);
    expect(status).toBe(2);
  });

  it('exits 2, not 1, when a flag is missing its argument', () => {
    expect(run(sb, ['--max']).status).toBe(2);
    expect(run(sb, ['--repo']).status).toBe(2);
    const { stderr, status } = run(sb, ['--max']);
    expect(stderr).toContain('--max');
  });

  it('exits 2 when --max is not a number', () => {
    const { status, stderr } = run(sb, ['--max', 'abc']);
    expect(status).toBe(2);
    expect(stderr).toContain('--max');
  });

  it('fails with a readable jq message when jq is not on PATH', () => {
    seedEmpty(sb);
    const { status, stderr } = run(sb, [], { JQ_BIN: '/nonexistent/jq-definitely-missing' });
    expect(status).toBe(1);
    expect(stderr).toContain('jq');
    expect(stderr).toMatch(/brew install jq/);
  });

  it('--help still exits 0 when jq is missing', () => {
    const { status } = run(sb, ['--help'], { JQ_BIN: '/nonexistent/jq-definitely-missing' });
    expect(status).toBe(0);
  });

  it('handles a worktree list larger than the pipe buffer (no head -1 SIGPIPE race)', () => {
    // >64KB of worktree output defeats `| head -n 1` under pipefail: once head
    // exits, the writer takes SIGPIPE and the pipeline fails. The derivation
    // must drain the whole stream.
    // pad records sit outside the uflow-wt parent so the candidate loop
    // skips them by a pure string match — the point is output volume, not
    // 4000 basename forks
    const pad = Array.from(
      { length: 4000 },
      (_, i) => `worktree /fake/other-wt/pad-${i}\nHEAD ${String(i).padStart(40, '0')}\n\n`,
    ).join('');
    sb.writeFixture(
      'worktree-list.txt',
      `worktree /fake/uflow\nHEAD ${'0'.repeat(40)}\nbranch refs/heads/main\n\n${pad}`,
    );
    sb.writeFixture('refs.txt', 'main\norigin/main\n');
    sb.writeFixture('ready-agent.json', '[]');
    sb.writeFixture('ready-human.json', '[]');
    sb.writeFixture('pr-list.json', '[]');
    const { stdout, status } = run(sb);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe('no in-flight requests');
  });

  it('prints "no in-flight requests" and exits 0 when nothing is in flight', () => {
    seedEmpty(sb);
    const { stdout, status } = run(sb);
    expect(status).toBe(0);
    expect(stdout.trim()).toBe('no in-flight requests');
  });

  // --- state classification ------------------------------------------------

  interface ScenarioIssue {
    state: 'OPEN' | 'CLOSED';
    title?: string;
    labels?: string[];
    comments?: string[];
  }
  interface Scenario {
    worktrees?: Record<number, string>; // issue -> worktree slug
    branches?: Record<number, string>; // issue -> branch name
    ahead?: Record<number, number>; // issue -> commits ahead of origin/main
    issues?: Record<number, ScenarioIssue>;
    prs?: { number: number; headRefName: string }[];
    readyAgent?: number[];
    readyHuman?: number[];
    stagePrep?: number[];
    stageBuild?: number[];
  }

  const PHASE_COMMENT = '### Phase: Grill — Done\n\n- Issue: #N\n';
  const PLAIN_COMMENT = 'looks fine';

  function seedScenario(s: Scenario): void {
    let wt =
      'worktree /fake/uflow\nHEAD 0000000000000000000000000000000000000001\nbranch refs/heads/main\n\n';
    for (const [n, slug] of Object.entries(s.worktrees ?? {})) {
      wt += `worktree /fake/uflow-wt/${n}-${slug}\nHEAD 000000000000000000000000000000000000000${n}\nbranch refs/heads/${s.branches?.[Number(n)] ?? `fix/${n}-${slug}`}\n\n`;
    }
    sb.writeFixture('worktree-list.txt', wt);
    sb.writeFixture(
      'refs.txt',
      ['main', 'origin/main', ...Object.values(s.branches ?? {})].join('\n') + '\n',
    );
    sb.writeFixture(
      'ahead.txt',
      Object.entries(s.ahead ?? {})
        .map(([n, c]) => `${s.branches?.[Number(n)] ?? ''} ${c}`)
        .join('\n') + '\n',
    );
    for (const [n, issue] of Object.entries(s.issues ?? {})) {
      sb.writeFixture(
        `issue-${n}.json`,
        JSON.stringify({
          number: Number(n),
          state: issue.state,
          title: issue.title ?? `issue ${n} title`,
          labels: (issue.labels ?? []).map((name) => ({ name })),
          comments: (issue.comments ?? []).map((body) => ({ body })),
        }),
      );
    }
    sb.writeFixture('pr-list.json', JSON.stringify(s.prs ?? []));
    sb.writeFixture(
      'ready-agent.json',
      JSON.stringify((s.readyAgent ?? []).map((number) => ({ number }))),
    );
    sb.writeFixture(
      'ready-human.json',
      JSON.stringify((s.readyHuman ?? []).map((number) => ({ number }))),
    );
    sb.writeFixture(
      'stage-prep.json',
      JSON.stringify((s.stagePrep ?? []).map((number) => ({ number }))),
    );
    sb.writeFixture(
      'stage-build.json',
      JSON.stringify((s.stageBuild ?? []).map((number) => ({ number }))),
    );
  }

  function jsonRecords(args: string[] = ['--json']): Record<string, unknown>[] {
    const { stdout, status } = run(sb, args);
    expect(status).toBe(0);
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  it('classifies cleanup-pending: closed issue with worktree still present', () => {
    seedScenario({
      worktrees: { 101: 'x' },
      branches: { 101: 'fix/101-x' },
      ahead: { 101: 1 },
      issues: { 101: { state: 'CLOSED', comments: [PHASE_COMMENT, PHASE_COMMENT] } },
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 101, state: 'cleanup-pending', occupies_slot: false });
  });

  it('classifies stalled: open, worktree+branch, 0 commits ahead, 0 phases', () => {
    seedScenario({
      worktrees: { 102: 'x' },
      branches: { 102: 'fix/102-x' },
      ahead: { 102: 0 },
      issues: { 102: { state: 'OPEN', labels: ['ready-for-agent'], comments: [] } },
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 102, state: 'stalled', occupies_slot: true });
  });

  it('classifies awaiting-review: open, worktree, open PR — does not occupy a slot', () => {
    seedScenario({
      worktrees: { 103: 'x' },
      branches: { 103: 'fix/103-x' },
      ahead: { 103: 3 },
      issues: { 103: { state: 'OPEN', comments: [PHASE_COMMENT] } },
      prs: [{ number: 555, headRefName: 'fix/103-x' }],
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({
      issue: 103,
      state: 'awaiting-review',
      pr: 555,
      occupies_slot: false,
    });
  });

  it('classifies in-flight: open, worktree, no open PR, progress exists', () => {
    seedScenario({
      worktrees: { 104: 'x' },
      branches: { 104: 'fix/104-x' },
      ahead: { 104: 2 },
      issues: { 104: { state: 'OPEN', comments: [PHASE_COMMENT] } },
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 104, state: 'in-flight', occupies_slot: true });
  });

  it('turns a ready-for-agent list entry into a ready record (committed issues-ready fixture)', () => {
    // the fixture is the gh 'issue list --label ready-for-agent' answer
    fs.copyFileSync(
      path.join(FIXTURE_DIR, 'issues-ready.json'),
      path.join(sb.fixtureDir, 'ready-agent.json'),
    );
    sb.writeFixture(
      'worktree-list.txt',
      `worktree /fake/uflow\nHEAD ${'0'.repeat(40)}\nbranch refs/heads/main\n\n`,
    );
    sb.writeFixture('refs.txt', 'main\norigin/main\n');
    sb.writeFixture('ready-human.json', '[]');
    sb.writeFixture('pr-list.json', '[]');
    sb.writeFixture(
      'issue-700.json',
      JSON.stringify({
        number: 700,
        state: 'OPEN',
        title: 'dispatchable work',
        labels: [{ name: 'ready-for-agent' }],
        comments: [],
      }),
    );
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 700, state: 'ready', occupies_slot: false });
  });

  it('classifies ready: open, ready-for-agent, no worktree or branch', () => {
    seedScenario({
      issues: { 105: { state: 'OPEN', labels: ['ready-for-agent'], comments: [] } },
      readyAgent: [105],
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 105, state: 'ready', occupies_slot: false });
  });

  it('classifies blocked-on-human: open, ready-for-human, no worktree or branch', () => {
    seedScenario({
      issues: { 106: { state: 'OPEN', labels: ['ready-for-human'], comments: [] } },
      readyHuman: [106],
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 106, state: 'blocked-on-human', occupies_slot: false });
  });

  it('classifies needs-info (no worktree) as blocked-on-human too: it is the decision queue', () => {
    seedScenario({
      issues: {
        106: { state: 'OPEN', labels: ['needs-info', 'stage:prep'], comments: [] },
      },
      stagePrep: [106],
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 106, state: 'blocked-on-human', stage: 'prep' });
  });

  it('widens the candidate set to the stage labels: a stage:prep-only issue appears in --json', () => {
    // AC3: stage labels feed the candidate union on their own, so an issue
    // labelled stage:prep (with no ready-for-agent, no worktree, no branch)
    // is still a candidate the dispatcher can then refuse or take.
    seedScenario({
      issues: { 105: { state: 'OPEN', labels: ['stage:prep'], comments: [] } },
      stagePrep: [105],
    });
    const [r] = jsonRecords();
    expect(r).toMatchObject({ issue: 105, state: 'ready', stage: 'prep' });
  });

  it('emits stage and blocked_by on every record; blocked_by keeps only open blockers', () => {
    seedScenario({
      issues: {
        105: { state: 'OPEN', labels: ['ready-for-agent', 'stage:prep'], comments: [] },
        107: { state: 'OPEN', labels: ['ready-for-agent', 'stage:build'], comments: [] },
        109: { state: 'OPEN', labels: ['ready-for-agent'], comments: [] },
      },
      readyAgent: [105, 107, 109],
    });
    sb.writeFixture(
      'blocked-by-105.json',
      JSON.stringify([
        { number: 200, state: 'open' },
        { number: 201, state: 'closed' },
      ]),
    );
    const records = jsonRecords();
    const byIssue = Object.fromEntries(records.map((r) => [r.issue, r]));
    expect(byIssue[105]).toMatchObject({ stage: 'prep', blocked_by: [200] });
    expect(byIssue[107]).toMatchObject({ stage: 'build', blocked_by: [] });
    expect(byIssue[109]).toMatchObject({ stage: 'none', blocked_by: [] });
  });

  it('fetches blocked_by only for ready records, never for in-flight or awaiting-review', () => {
    // AC4: the dependencies call doubles the gh traffic of a record, so it is
    // gated on the only state that consumes it.
    seedScenario({
      worktrees: { 104: 'x', 103: 'y' },
      branches: { 104: 'fix/104-x', 103: 'fix/103-y' },
      ahead: { 104: 2, 103: 3 },
      issues: {
        104: { state: 'OPEN', comments: [PHASE_COMMENT] },
        103: { state: 'OPEN', comments: [PHASE_COMMENT] },
        105: { state: 'OPEN', labels: ['ready-for-agent'], comments: [] },
      },
      prs: [{ number: 555, headRefName: 'fix/103-y' }],
      readyAgent: [105],
    });
    const { status } = run(sb, ['--json']);
    expect(status).toBe(0);
    const ghLog = sb.readLog('gh');
    expect(ghLog).toContain('issues/105/dependencies/blocked_by');
    expect(ghLog).not.toContain('issues/104/dependencies');
    expect(ghLog).not.toContain('issues/103/dependencies');
  });

  it('orders output worst-waste first: cleanup-pending, stalled, then the rest', () => {
    seedScenario({
      worktrees: { 101: 'x', 102: 'x', 103: 'x', 104: 'x' },
      branches: { 101: 'fix/101-x', 102: 'fix/102-x', 103: 'fix/103-x', 104: 'fix/104-x' },
      ahead: { 101: 1, 102: 0, 103: 3, 104: 2 },
      issues: {
        101: { state: 'CLOSED', comments: [PHASE_COMMENT] },
        102: { state: 'OPEN', comments: [] },
        103: { state: 'OPEN', comments: [PHASE_COMMENT] },
        104: { state: 'OPEN', comments: [PHASE_COMMENT] },
        105: { state: 'OPEN', labels: ['ready-for-agent'], comments: [] },
        106: { state: 'OPEN', labels: ['ready-for-human'], comments: [] },
      },
      prs: [{ number: 555, headRefName: 'fix/103-x' }],
      readyAgent: [105],
      readyHuman: [106],
    });
    const { stdout, status } = run(sb);
    expect(status).toBe(0);
    const states = stdout
      .split('\n')
      .filter((l) => l.startsWith('cleanup-pending') || /^[a-z-]+\s+#\d/.test(l))
      .map((l) => l.trim().split(/\s+/)[0]);
    expect(states).toEqual([
      'cleanup-pending',
      'stalled',
      'awaiting-review',
      'in-flight',
      'ready',
      'blocked-on-human',
    ]);
  });

  it('precedence: closed + worktree + 0 ahead + 0 phases is cleanup-pending, not stalled', () => {
    seedScenario({
      worktrees: { 107: 'x' },
      branches: { 107: 'fix/107-x' },
      ahead: { 107: 0 },
      issues: { 107: { state: 'CLOSED', comments: [] } },
    });
    const [r] = jsonRecords();
    expect(r.state).toBe('cleanup-pending');
  });

  it('precedence: open + worktree + open PR + 0 ahead + 0 phases is stalled, not awaiting-review', () => {
    seedScenario({
      worktrees: { 108: 'x' },
      branches: { 108: 'fix/108-x' },
      ahead: { 108: 0 },
      issues: { 108: { state: 'OPEN', comments: [] } },
      prs: [{ number: 555, headRefName: 'fix/108-x' }],
    });
    const [r] = jsonRecords();
    expect(r.state).toBe('stalled');
    // an open PR means the slot is free even though the state is stalled
    expect(r.occupies_slot).toBe(false);
  });

  // --- frozen live fixture ---------------------------------------------------
  // Replays the live table from the Spec phase (issues 554/560/565/575/528)
  // through stubbed git/gh and compares against the committed NDJSON.

  const FIXTURE_DIR = path.join(__dirname, 'fixtures/agent-dispatch');

  function seedLiveReplay(): void {
    sb.writeFixture(
      'worktree-list.txt',
      'worktree /Users/NARAFIQ/Projects/uflow\n' +
        'HEAD 0000000000000000000000000000000000000001\nbranch refs/heads/main\n\n' +
        'worktree /Users/NARAFIQ/Projects/uflow-wt/554-source-map-js-runtime\n' +
        'HEAD 0000000000000000000000000000000000000002\nbranch refs/heads/fix/554-source-map-js-runtime\n\n' +
        'worktree /Users/NARAFIQ/Projects/uflow-wt/560-list-card-approve-removal\n' +
        'HEAD 0000000000000000000000000000000000000003\nbranch refs/heads/fix/560-list-card-approve-removal\n\n' +
        'worktree /Users/NARAFIQ/Projects/uflow-wt/565-forgot-password-link\n' +
        'HEAD 0000000000000000000000000000000000000004\nbranch refs/heads/fix/565-forgot-password-link\n\n' +
        'worktree /Users/NARAFIQ/Projects/uflow-wt/575-agent-dispatch\n' +
        'HEAD 0000000000000000000000000000000000000005\nbranch refs/heads/feature/575-agent-dispatch\n\n',
    );
    sb.writeFixture(
      'refs.txt',
      'main\norigin/main\n' +
        'fix/554-source-map-js-runtime\nfix/560-list-card-approve-removal\n' +
        'fix/565-forgot-password-link\nfeature/575-agent-dispatch\n',
    );
    sb.writeFixture(
      'ahead.txt',
      'fix/554-source-map-js-runtime 0\nfix/560-list-card-approve-removal 0\n' +
        'fix/565-forgot-password-link 1\nfeature/575-agent-dispatch 2\n',
    );
    const issues: [number, 'OPEN' | 'CLOSED', string, string[], number][] = [
      [
        554,
        'OPEN',
        'security: source-map-js high (GHSA-68fv-2mgg-jv7q) ships in the runtime image',
        ['ready-for-agent', 'security'],
        1,
      ],
      [
        560,
        'OPEN',
        'bug: provider-list approve 422s for all 805 pending providers (no halal payload sent)',
        ['ready-for-agent', 'bug'],
        1,
      ],
      [
        565,
        'CLOSED',
        'bug: login modal has no Forgot Password link on desktop',
        ['ready-for-agent', 'bug'],
        4,
      ],
      [
        575,
        'OPEN',
        'feat: autonomous agent dispatch — monitor, dispatcher, and both triggers',
        ['ready-for-agent', 'feature'],
        1,
      ],
      [
        528,
        'OPEN',
        'refactor: land ESLint 10 as one PR, superseding Dependabot #505 and #510',
        ['ready-for-agent', 'no-parallel', 'refactor'],
        0,
      ],
    ];
    for (const [n, state, title, labels, phases] of issues) {
      sb.writeFixture(
        `issue-${n}.json`,
        JSON.stringify({
          number: n,
          state,
          title,
          labels: labels.map((name) => ({ name })),
          comments: Array.from({ length: phases }, () => ({ body: PHASE_COMMENT })),
        }),
      );
    }
    sb.writeFixture('pr-list.json', '[]'); // #576 is merged, so no open PRs
    sb.writeFixture(
      'ready-agent.json',
      JSON.stringify([575, 565, 560, 554, 528].map((number) => ({ number }))),
    );
    sb.writeFixture('ready-human.json', '[]');
  }

  it('replays the live state byte-for-byte against the frozen NDJSON fixture', () => {
    seedLiveReplay();
    const { stdout, status } = run(sb, ['--json']);
    expect(status).toBe(0);
    const expected = fs.readFileSync(path.join(FIXTURE_DIR, 'monitor-live-2026-xx.ndjson'), 'utf8');
    expect(stdout).toBe(expected);
    // the slot rule, stated plainly: 554/560/575 occupy, 565 and 528 do not
    const byIssue = Object.fromEntries(
      stdout
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const r = JSON.parse(l);
          return [r.issue, r];
        }),
    );
    for (const n of [554, 560, 575]) expect(byIssue[n].occupies_slot).toBe(true);
    for (const n of [565, 528]) expect(byIssue[n].occupies_slot).toBe(false);
    expect(byIssue[565].state).toBe('cleanup-pending');
    expect(byIssue[528].state).toBe('ready');
  });

  it('--json emits exactly the thirteen pinned fields, nulls present not omitted', () => {
    seedLiveReplay();
    const { stdout } = run(sb, ['--json']);
    const want = [
      'blocked_by',
      'branch',
      'commits_ahead',
      'issue',
      'issue_state',
      'labels',
      'occupies_slot',
      'phases',
      'pr',
      'stage',
      'state',
      'title',
      'worktree',
    ];
    for (const line of stdout.split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      expect(Object.keys(r).sort()).toEqual(want);
      expect('worktree' in r).toBe(true);
      expect('pr' in r).toBe(true);
      expect('branch' in r).toBe(true);
    }
  });

  it('queries gh with --json comments, never --comments', () => {
    seedLiveReplay();
    run(sb, ['--json']);
    const ghLog = sb.readLog('gh');
    expect(ghLog).toContain('--json number,state,title,labels,comments');
    expect(ghLog).not.toMatch(/--comments(\s|$)/);
  });

  it('never invokes devin', () => {
    seedLiveReplay();
    run(sb);
    expect(sb.called('devin')).toBe(false);
  });

  it('footer reports occupied 3/4 slots with --max 4 against the live replay', () => {
    seedLiveReplay();
    const { stdout } = run(sb, ['--max', '4']);
    expect(stdout).toContain('occupied 3/4 slots');
    expect(stdout).toContain('1 slot free');
  });

  // --- --decisions digest --------------------------------------------------
  // AC17: a generated view over every open needs-info issue — its open
  // questions and URL — that writes nothing to disk and needs no repo state.

  it('--decisions prints every open needs-info issue with its questions and URL', () => {
    sb.writeFixture(
      'needs-info.json',
      JSON.stringify([
        { number: 106, title: 'decide the auth scope', url: 'https://github.com/o/r/issues/106' },
        { number: 110, title: 'pick an approach', url: 'https://github.com/o/r/issues/110' },
      ]),
    );
    sb.writeFixture(
      'issue-106.json',
      JSON.stringify({
        number: 106,
        state: 'OPEN',
        title: 'decide the auth scope',
        labels: [{ name: 'needs-info' }],
        comments: [
          {
            body:
              '### Phase: Prep — Done\n\n- Issue: #106\n\n' +
              '❓ **Q1 - which providers count**: all 805 pending, or halal-certified only?\n' +
              '➡️ halal-certified only — the 422 path is the halal payload.\n' +
              'a plain sentence that is not a question.',
          },
        ],
      }),
    );
    sb.writeFixture(
      'issue-110.json',
      JSON.stringify({
        number: 110,
        state: 'OPEN',
        title: 'pick an approach',
        labels: [{ name: 'needs-info' }],
        comments: [{ body: 'Does this need a schema migration or is config enough?' }],
      }),
    );
    const { stdout, status } = run(sb, ['--decisions']);
    expect(status).toBe(0);
    expect(stdout).toContain('#106');
    expect(stdout).toContain('decide the auth scope');
    expect(stdout).toContain('https://github.com/o/r/issues/106');
    expect(stdout).toContain('Q1 - which providers count');
    expect(stdout).toContain('#110');
    expect(stdout).toContain('https://github.com/o/r/issues/110');
    expect(stdout).toContain('Does this need a schema migration or is config enough?');
    // a generated view, not a state store: no git calls, nothing written
    expect(sb.called('git')).toBe(false);
    expect(fs.readdirSync(sb.stateDir)).toEqual([]);
  });

  it('--decisions exits 0 with a clean message when nothing needs an answer', () => {
    sb.writeFixture('needs-info.json', '[]');
    const { stdout, status } = run(sb, ['--decisions']);
    expect(status).toBe(0);
    expect(stdout).toContain('needs-info');
    expect(stdout).not.toMatch(/#\d/);
  });
});
