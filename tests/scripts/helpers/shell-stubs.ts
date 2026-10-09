import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Shared stub-bin factory for driving the agent-* shell scripts as black boxes.
 *
 * Every external tool the scripts call (git, gh, osascript, devin and the
 * monitor itself when the dispatcher is under test) is replaced by a stub
 * shell script in a per-test temp dir. Each stub appends its argv to
 * `<stubDir>/logs/<name>.log` and answers from fixture files the test wrote
 * under `<stubDir>/fixtures/`. Nothing touches live gh, git, devin or a real
 * terminal, and nothing writes outside the temp dir.
 */

export interface StubSandbox {
  /** Temp dir holding bin/, fixtures/, logs/ and the dispatch state dir. */
  dir: string;
  /** Directory the stub executables live in. */
  binDir: string;
  /** Directory the stubs read fixtures from. */
  fixtureDir: string;
  /** Directory the stubs append their argv logs to. */
  logDir: string;
  /** UFLOW_DISPATCH_STATE_DIR value. */
  stateDir: string;
  /** UFLOW_LAUNCHAGENTS_DIR value. */
  launchAgentsDir: string;
  /** UFLOW_DISPATCH_LOG value. */
  dispatchLog: string;
  /** Environment block to spread into execFileSync/spawn env. */
  env: Record<string, string>;
  /** Write a fixture file under fixtureDir and return its path. */
  writeFixture: (rel: string, content: string) => string;
  /** Read a stub argv log. Returns '' when the log does not exist. */
  readLog: (name: string) => string;
  /** True when the stub logged at least one invocation. */
  called: (name: string) => boolean;
}

const GIT_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG_DIR/git.log"
args="$*"
case "$args" in
  *"worktree list"*)
    cat "$FIXTURE_DIR/worktree-list.txt" 2>/dev/null || true
    ;;
  *"for-each-ref"*)
    cat "$FIXTURE_DIR/refs.txt" 2>/dev/null || true
    ;;
  *"rev-list"*)
    branch="\${args##*..}"
    count=$(awk -v b="$branch" '$1 == b { print $2 }' "$FIXTURE_DIR/ahead.txt" 2>/dev/null)
    if [ -n "$count" ]; then
      printf '%s\\n' "$count"
    else
      echo "fatal: ambiguous argument" >&2
      exit 128
    fi
    ;;
  *)
    echo "git stub: unhandled: $args" >&2
    exit 1
    ;;
esac
`;

const GH_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG_DIR/gh.log"
args="$*"
case "$args" in
  *"api"*"dependencies/blocked_by"*)
    n=$(printf '%s' "$args" | sed -n 's|.*issues/\\([0-9][0-9]*\\)/dependencies/blocked_by.*|\\1|p')
    cat "$FIXTURE_DIR/blocked-by-$n.json" 2>/dev/null || echo '[]'
    ;;
  *"issue view"*)
    n=$(printf '%s' "$args" | sed -n 's/.*issue view \\([0-9][0-9]*\\).*/\\1/p')
    if [ -f "$FIXTURE_DIR/issue-$n.json" ]; then
      cat "$FIXTURE_DIR/issue-$n.json"
    else
      echo "gh stub: no fixture for issue $n" >&2
      exit 1
    fi
    ;;
  *"issue list"*"ready-for-agent"*)
    cat "$FIXTURE_DIR/ready-agent.json" 2>/dev/null || echo '[]'
    ;;
  *"issue list"*"ready-for-human"*)
    cat "$FIXTURE_DIR/ready-human.json" 2>/dev/null || echo '[]'
    ;;
  *"issue list"*"needs-info"*)
    cat "$FIXTURE_DIR/needs-info.json" 2>/dev/null || echo '[]'
    ;;
  *"issue list"*"stage:prep"*)
    cat "$FIXTURE_DIR/stage-prep.json" 2>/dev/null || echo '[]'
    ;;
  *"issue list"*"stage:build"*)
    cat "$FIXTURE_DIR/stage-build.json" 2>/dev/null || echo '[]'
    ;;
  *"pr list"*)
    cat "$FIXTURE_DIR/pr-list.json" 2>/dev/null || echo '[]'
    ;;
  *)
    echo "gh stub: unhandled: $args" >&2
    exit 1
    ;;
esac
`;

const OSASCRIPT_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG_DIR/osascript.log"
exit "\${OSASCRIPT_EXIT:-0}"
`;

const DEVIN_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG_DIR/devin.log"
# argv is: -- "<prompt>"; echo the prompt so tests can read it back
printf '%s\\n' "$2"
exit "\${DEVIN_EXIT:-0}"
`;

const MONITOR_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG_DIR/monitor.log"
sleep "\${MONITOR_SLEEP:-0}"
if [ "\${MONITOR_EXIT:-0}" != "0" ]; then
  exit "\$MONITOR_EXIT"
fi
cat "$MONITOR_NDJSON"
`;

function writeExecutable(file: string, body: string): void {
  fs.writeFileSync(file, body, { mode: 0o755 });
}

export function makeSandbox(prefix = 'uflow-agent-test-'): StubSandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const binDir = path.join(dir, 'bin');
  const fixtureDir = path.join(dir, 'fixtures');
  const logDir = path.join(dir, 'logs');
  const stateDir = path.join(dir, 'state');
  const launchAgentsDir = path.join(dir, 'LaunchAgents');
  const dispatchLog = path.join(dir, 'uflow-agent-dispatch.log');
  for (const d of [binDir, fixtureDir, logDir, stateDir, launchAgentsDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  writeExecutable(path.join(binDir, 'git'), GIT_STUB);
  writeExecutable(path.join(binDir, 'gh'), GH_STUB);
  writeExecutable(path.join(binDir, 'osascript'), OSASCRIPT_STUB);
  writeExecutable(path.join(binDir, 'devin'), DEVIN_STUB);
  writeExecutable(path.join(binDir, 'agent-monitor.sh'), MONITOR_STUB);

  const env: Record<string, string> = {
    STUB_LOG_DIR: logDir,
    FIXTURE_DIR: fixtureDir,
    GIT_BIN: path.join(binDir, 'git'),
    GH_BIN: path.join(binDir, 'gh'),
    OSASCRIPT_BIN: path.join(binDir, 'osascript'),
    DEVIN_BIN: path.join(binDir, 'devin'),
    UFLOW_MONITOR_BIN: path.join(binDir, 'agent-monitor.sh'),
    UFLOW_DISPATCH_STATE_DIR: stateDir,
    UFLOW_LAUNCHAGENTS_DIR: launchAgentsDir,
    UFLOW_DISPATCH_LOG: dispatchLog,
    // Keep PATH minimal but functional: real coreutils + jq only.
    PATH: '/usr/bin:/bin',
  };

  return {
    dir,
    binDir,
    fixtureDir,
    logDir,
    stateDir,
    launchAgentsDir,
    dispatchLog,
    env,
    writeFixture: (rel, content) => {
      const p = path.join(fixtureDir, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      return p;
    },
    readLog: (name) => {
      const p = path.join(logDir, `${name}.log`);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    },
    called: (name) => fs.existsSync(path.join(logDir, `${name}.log`)),
  };
}

export function removeSandbox(sb: StubSandbox): void {
  fs.rmSync(sb.dir, { recursive: true, force: true });
}

/** Build one monitor NDJSON record; every field must be given explicitly.
 *  `stage`/`blocked_by` are optional so callers can pin legacy records that
 *  predate the stage axis — the dispatcher treats a missing stage as `none`. */
export function monitorRecord(r: {
  issue: number;
  title: string;
  state: string;
  issue_state: 'OPEN' | 'CLOSED';
  labels: string[];
  worktree: string | null;
  branch: string | null;
  commits_ahead: number;
  pr: number | null;
  phases: number;
  occupies_slot: boolean;
  stage?: 'prep' | 'build' | 'none';
  blocked_by?: number[];
}): string {
  return JSON.stringify(r);
}

export function ndjson(records: string[]): string {
  return records.join('\n') + (records.length ? '\n' : '');
}
